/**
 * Test FIBO Gen Fill with Proper Mask for T-Shirt Compositing
 */

import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const BRIA_API_TOKEN = process.env.BRIA_API_TOKEN;
const BRIA_BASE_URL = "https://engine.prod.bria-api.com/v2";

/**
 * Make authenticated request to Bria API
 */
async function briaRequest(url, data, method = 'POST') {
  try {
    const config = {
      method,
      url,
      headers: {
        'api_token': BRIA_API_TOKEN,
        'Content-Type': 'application/json'
      }
    };

    if (method === 'POST' && data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Bria API Error (${url}):`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || { message: error.message },
      status: error.response?.status || 500
    };
  }
}

/**
 * Poll Bria status until completion
 */
async function pollBriaStatus(requestId, maxAttempts = 60) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const statusResult = await briaRequest(`${BRIA_BASE_URL}/status/${requestId}`, null, 'GET');
      
      if (!statusResult.success) {
        throw new Error(`Status check failed: ${statusResult.error.message}`);
      }

      const { status, result, error } = statusResult.data;
      
      console.log(`📊 Status check ${attempts + 1}/${maxAttempts}: ${status}`);

      if (status === "COMPLETED") {
        if (result?.image_url) {
          return { success: true, imageUrl: result.image_url, result };
        } else {
          throw new Error("Completed but no result received");
        }
      } else if (status === "ERROR") {
        throw new Error(error?.message || "Request failed");
      } else if (status === "IN_PROGRESS") {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        throw new Error(`Unknown status: ${status}`);
      }
    } catch (error) {
      if (attempts >= maxAttempts - 1) {
        throw error;
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  throw new Error("Request timeout - please try again");
}

/**
 * Create a simple chest area mask for t-shirt
 */
async function createChestMask(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill with black (masked area)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // Create white rectangle in chest area (area to fill)
  ctx.fillStyle = '#ffffff';
  const chestX = width * 0.25;
  const chestY = height * 0.35;
  const chestWidth = width * 0.5;
  const chestHeight = height * 0.4;
  
  ctx.fillRect(chestX, chestY, chestWidth, chestHeight);
  
  return canvas.toBuffer('image/png');
}

/**
 * Convert buffer to base64
 */
function bufferToBase64(buffer, mimeType = 'image/png') {
  const base64String = buffer.toString('base64');
  return `data:${mimeType};base64,${base64String}`;
}

/**
 * Convert local file to base64
 */
function fileToBase64(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64String = fileBuffer.toString('base64');
    const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    throw new Error(`Failed to convert file to base64: ${error.message}`);
  }
}

/**
 * Download and save image locally
 */
async function downloadAndSaveImage(imageUrl, filename) {
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 60000
    });
    
    const buffer = Buffer.from(response.data);
    const filepath = path.join(__dirname, 'designs', filename);
    fs.writeFileSync(filepath, buffer);
    
    console.log(`✅ Image saved: ${filename}`);
    return filepath;
  } catch (error) {
    console.error("Image download error:", error.message);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * Test FIBO gen_fill with proper mask
 */
async function testGenFillWithMask() {
  console.log(`🎨 Testing FIBO gen_fill with proper mask...`);
  
  try {
    // Load t-shirt image to get dimensions
    const tshirtPath = path.join(__dirname, '../public/mockups/tshirt.png');
    const tshirtImage = await loadImage(tshirtPath);
    
    // Create mask for chest area
    const maskBuffer = await createChestMask(tshirtImage.width, tshirtImage.height);
    
    // Convert to base64
    const tshirtBase64 = fileToBase64(tshirtPath);
    const maskBase64 = bufferToBase64(maskBuffer);
    
    // Save mask for debugging
    fs.writeFileSync(path.join(__dirname, 'designs', 'debug_mask.png'), maskBuffer);
    console.log(`📁 Debug mask saved: debug_mask.png`);
    
    const prompt = `A realistic, professionally screen-printed design on fabric with natural lighting, shadows, and fabric texture integration. The design should appear as if it was genuinely printed on the t-shirt material, not overlaid on top.`;
    
    console.log(`📝 Sending gen_fill request with mask...`);
    
    const genFillResult = await briaRequest(`${BRIA_BASE_URL}/image/edit/gen_fill`, {
      image: tshirtBase64,
      mask: maskBase64,
      prompt: prompt,
      sync: false
    });

    if (!genFillResult.success) {
      throw new Error(`Gen fill failed: ${genFillResult.error.message}`);
    }

    const requestId = genFillResult.data.request_id;
    console.log(`📝 Gen fill request ID: ${requestId}`);

    // Poll for completion
    const result = await pollBriaStatus(requestId);
    
    // Download result
    const filename = `fibo_genfill_masked_${Date.now()}.png`;
    const savedPath = await downloadAndSaveImage(result.imageUrl, filename);
    
    console.log(`✅ FIBO gen_fill with mask completed: ${filename}`);
    return { success: true, imagePath: savedPath, imageUrl: result.imageUrl };
    
  } catch (error) {
    console.error(`❌ FIBO gen_fill with mask failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the test
testGenFillWithMask().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});