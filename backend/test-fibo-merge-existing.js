/**
 * Test FIBO Realistic Merging with Existing Design
 * 
 * This script takes an existing design from designs folder and the white t-shirt mockup
 * and uses FIBO to realistically merge them without changing either - just natural integration.
 */

import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const BRIA_API_TOKEN = process.env.BRIA_API_TOKEN;
const BRIA_BASE_URL = "https://engine.prod.bria-api.com/v2";

if (!BRIA_API_TOKEN) {
  console.error("❌ BRIA_API_TOKEN is required in .env file");
  process.exit(1);
}

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
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
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
 * Convert local file to base64 for FIBO API
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
 * Test FIBO realistic merging with existing design
 */
async function testFiboMergeExisting() {
  console.log(`🎨 Testing FIBO realistic merging with existing design...`);
  
  try {
    // Define paths
    const tshirtPath = path.join(__dirname, '../public/mockups/tshirt.png');
    const designsDir = path.join(__dirname, 'designs');
    
    // Check if t-shirt exists
    if (!fs.existsSync(tshirtPath)) {
      throw new Error(`T-shirt mockup not found: ${tshirtPath}`);
    }
    
    // Get one existing design (pick a refined one)
    const designFiles = fs.readdirSync(designsDir)
      .filter(file => file.startsWith('refined_') && file.endsWith('.png'))
      .slice(0, 1); // Take just the first one
    
    if (designFiles.length === 0) {
      throw new Error(`No refined design files found in: ${designsDir}`);
    }
    
    const designFile = designFiles[0];
    const designPath = path.join(designsDir, designFile);
    
    console.log(`📁 Using files:`);
    console.log(`   T-shirt: ${path.basename(tshirtPath)} (white t-shirt mockup)`);
    console.log(`   Design: ${designFile} (existing design)`);
    
    // Convert images to base64
    const tshirtBase64 = fileToBase64(tshirtPath);
    const designBase64 = fileToBase64(designPath);
    
    // Create a precise prompt for realistic merging
    const prompt = `Take this design and realistically place it on the chest area of this white t-shirt. The design should look like it was professionally screen-printed on the fabric with natural lighting, realistic shadows, proper fabric texture integration, and ink absorption effects. Keep the white t-shirt exactly as it is - same color, shape, and style. Only add the design as if it was genuinely printed on the fabric, not overlaid on top. The result should look like a real product photo of a printed t-shirt.`;
    
    console.log(`📝 Sending FIBO merge request...`);
    console.log(`📝 Prompt: "${prompt.substring(0, 100)}..."`);
    
    const generateResult = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
      prompt: prompt,
      ref_images: [tshirtBase64, designBase64],
      sync: false
    });

    if (!generateResult.success) {
      throw new Error(`FIBO merge failed: ${generateResult.error.message}`);
    }

    const requestId = generateResult.data.request_id;
    console.log(`📝 FIBO merge request ID: ${requestId}`);

    // Poll for completion
    const result = await pollBriaStatus(requestId);
    
    // Download result
    const timestamp = Date.now();
    const filename = `fibo_merged_${designFile.replace('refined_', '').replace('.png', '')}_${timestamp}.png`;
    const savedPath = await downloadAndSaveImage(result.imageUrl, filename);
    
    console.log(`\n✅ FIBO realistic merge completed!`);
    console.log(`📁 Output file: ${filename}`);
    console.log(`📂 Location: ${savedPath}`);
    console.log(`🔗 Original URL: ${result.imageUrl}`);
    
    console.log(`\n🎯 Test Summary:`);
    console.log(`   Input T-shirt: White t-shirt mockup`);
    console.log(`   Input Design: ${designFile}`);
    console.log(`   Output: Realistic merged t-shirt with design`);
    console.log(`   Method: FIBO image generation with reference images`);
    
    return { success: true, imagePath: savedPath, imageUrl: result.imageUrl, filename };
    
  } catch (error) {
    console.error(`❌ FIBO realistic merge failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the test
console.log(`🚀 Starting FIBO Realistic Merge Test with Existing Design`);
console.log(`🔑 Using Bria API: ${BRIA_BASE_URL}`);

testFiboMergeExisting()
  .then(result => {
    if (result.success) {
      console.log(`\n🎉 SUCCESS! Check the generated file to see if the realistic merging meets your expectations.`);
      console.log(`📁 File: ${result.filename}`);
    } else {
      console.log(`\n❌ FAILED: ${result.error}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });