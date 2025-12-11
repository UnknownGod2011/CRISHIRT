/**
 * Test FIBO Realistic T-Shirt Compositing
 * 
 * This script tests FIBO's ability to realistically merge designs with t-shirt images
 * without changing the t-shirt or design - just creating natural integration.
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
 * Test FIBO realistic compositing using gen_fill approach
 */
async function testFiboGenFillCompositing(tshirtPath, designPath, outputName) {
  console.log(`\n🎨 Testing FIBO gen_fill compositing:`);
  console.log(`   T-shirt: ${tshirtPath}`);
  console.log(`   Design: ${designPath}`);
  
  try {
    // Convert images to base64
    const tshirtBase64 = fileToBase64(tshirtPath);
    const designBase64 = fileToBase64(designPath);
    
    // Create a simple mask for the chest area (where design should go)
    // For now, we'll use a prompt-based approach
    const prompt = `Realistically integrate this design onto the t-shirt chest area, making it look like a natural fabric print with proper lighting, shadows, and fabric texture integration. The design should appear as if it was professionally screen-printed onto the fabric, not pasted on top.`;
    
    console.log(`📝 Sending gen_fill request...`);
    
    const genFillResult = await briaRequest(`${BRIA_BASE_URL}/image/edit/gen_fill`, {
      image: tshirtBase64,
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
    const filename = `fibo_genfill_${outputName}_${Date.now()}.png`;
    const savedPath = await downloadAndSaveImage(result.imageUrl, filename);
    
    console.log(`✅ FIBO gen_fill compositing completed: ${filename}`);
    return { success: true, imagePath: savedPath, imageUrl: result.imageUrl };
    
  } catch (error) {
    console.error(`❌ FIBO gen_fill compositing failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test FIBO realistic compositing using lifestyle_shot_by_image approach
 */
async function testFiboLifestyleCompositing(tshirtPath, designPath, outputName) {
  console.log(`\n🎨 Testing FIBO lifestyle_shot_by_image compositing:`);
  console.log(`   T-shirt: ${tshirtPath}`);
  console.log(`   Design: ${designPath}`);
  
  try {
    // Convert images to base64
    const tshirtBase64 = fileToBase64(tshirtPath);
    const designBase64 = fileToBase64(designPath);
    
    const prompt = `Create a realistic t-shirt mockup by naturally integrating the provided design onto this t-shirt. The design should look like it was professionally printed on the fabric with proper lighting, shadows, fabric texture, and realistic ink absorption. Maintain the exact t-shirt shape, color, and style while making the design appear as a natural part of the fabric.`;
    
    console.log(`📝 Sending lifestyle_shot_by_image request...`);
    
    // Note: This endpoint might not exist in v2, let's try the product shot editing approach
    const lifestyleResult = await briaRequest(`${BRIA_BASE_URL}/image/edit/lifestyle_shot_by_image`, {
      image: designBase64,
      ref_images: [tshirtBase64],
      prompt: prompt,
      sync: false
    });

    if (!lifestyleResult.success) {
      console.log(`⚠️  lifestyle_shot_by_image not available, trying alternative approach...`);
      return { success: false, error: "Endpoint not available" };
    }

    const requestId = lifestyleResult.data.request_id;
    console.log(`📝 Lifestyle shot request ID: ${requestId}`);

    // Poll for completion
    const result = await pollBriaStatus(requestId);
    
    // Download result
    const filename = `fibo_lifestyle_${outputName}_${Date.now()}.png`;
    const savedPath = await downloadAndSaveImage(result.imageUrl, filename);
    
    console.log(`✅ FIBO lifestyle compositing completed: ${filename}`);
    return { success: true, imagePath: savedPath, imageUrl: result.imageUrl };
    
  } catch (error) {
    console.error(`❌ FIBO lifestyle compositing failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test FIBO realistic compositing using image generation with reference
 */
async function testFiboGenerationCompositing(tshirtPath, designPath, outputName) {
  console.log(`\n🎨 Testing FIBO image generation compositing:`);
  console.log(`   T-shirt: ${tshirtPath}`);
  console.log(`   Design: ${designPath}`);
  
  try {
    // Convert images to base64
    const tshirtBase64 = fileToBase64(tshirtPath);
    const designBase64 = fileToBase64(designPath);
    
    const prompt = `Create a hyper-realistic t-shirt mockup by naturally integrating the provided design onto this exact t-shirt. The design should look professionally screen-printed with realistic fabric texture, proper lighting, natural shadows, and ink absorption effects. Keep the t-shirt's exact color, shape, and style unchanged. Make the design appear as if it was genuinely printed on the fabric, not overlaid on top.`;
    
    console.log(`📝 Sending image generation request with references...`);
    
    const generateResult = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
      prompt: prompt,
      ref_images: [tshirtBase64, designBase64],
      sync: false
    });

    if (!generateResult.success) {
      throw new Error(`Generation failed: ${generateResult.error.message}`);
    }

    const requestId = generateResult.data.request_id;
    console.log(`📝 Generation request ID: ${requestId}`);

    // Poll for completion
    const result = await pollBriaStatus(requestId);
    
    // Download result
    const filename = `fibo_generation_${outputName}_${Date.now()}.png`;
    const savedPath = await downloadAndSaveImage(result.imageUrl, filename);
    
    console.log(`✅ FIBO generation compositing completed: ${filename}`);
    return { success: true, imagePath: savedPath, imageUrl: result.imageUrl };
    
  } catch (error) {
    console.error(`❌ FIBO generation compositing failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runFiboCompositingTests() {
  console.log(`🚀 Starting FIBO Realistic T-Shirt Compositing Tests`);
  console.log(`🔑 Using Bria API: ${BRIA_BASE_URL}`);
  
  // Define paths
  const tshirtPath = path.join(__dirname, '../public/mockups/tshirt.png');
  const designsDir = path.join(__dirname, 'designs');
  
  // Check if t-shirt exists
  if (!fs.existsSync(tshirtPath)) {
    console.error(`❌ T-shirt mockup not found: ${tshirtPath}`);
    return;
  }
  
  // Get some design files to test with
  const designFiles = fs.readdirSync(designsDir)
    .filter(file => file.startsWith('refined_') && file.endsWith('.png'))
    .slice(0, 3); // Take first 3 refined designs
  
  if (designFiles.length === 0) {
    console.error(`❌ No refined design files found in: ${designsDir}`);
    return;
  }
  
  console.log(`📁 Found ${designFiles.length} design files to test with:`);
  designFiles.forEach((file, i) => console.log(`   ${i + 1}. ${file}`));
  
  const results = [];
  
  // Test each approach with each design
  for (let i = 0; i < Math.min(designFiles.length, 2); i++) {
    const designFile = designFiles[i];
    const designPath = path.join(designsDir, designFile);
    const outputName = `test${i + 1}`;
    
    console.log(`\n🔄 Testing with design ${i + 1}: ${designFile}`);
    
    // Test 1: Gen Fill approach
    const genFillResult = await testFiboGenFillCompositing(tshirtPath, designPath, `genfill_${outputName}`);
    results.push({ method: 'gen_fill', design: designFile, ...genFillResult });
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Lifestyle Shot approach (might not work)
    const lifestyleResult = await testFiboLifestyleCompositing(tshirtPath, designPath, `lifestyle_${outputName}`);
    results.push({ method: 'lifestyle_shot', design: designFile, ...lifestyleResult });
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Image Generation approach
    const generationResult = await testFiboGenerationCompositing(tshirtPath, designPath, `generation_${outputName}`);
    results.push({ method: 'generation', design: designFile, ...generationResult });
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log(`\n📊 FIBO Compositing Test Results:`);
  console.log(`=====================================`);
  
  results.forEach((result, i) => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`${i + 1}. ${result.method} (${result.design}): ${status}`);
    if (result.success) {
      console.log(`   Output: ${path.basename(result.imagePath)}`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Success Rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  if (successCount > 0) {
    console.log(`\n✅ Generated realistic t-shirt composites are saved in: ${designsDir}`);
    console.log(`   Look for files starting with 'fibo_' to see the results`);
  }
}

// Run the tests
runFiboCompositingTests().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});