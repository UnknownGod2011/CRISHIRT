import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// ====== MIDDLEWARE ======
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ====== CONFIGURATION ======
const PORT = process.env.PORT || 5001;
const BRIA_API_TOKEN = process.env.BRIA_API_TOKEN;

// Bria API endpoints
const BRIA_BASE_URL = "https://engine.prod.bria-api.com/v2";
const BRIA_EDIT_BASE_URL = "https://engine.prod.bria-api.com/v2/image/edit";

// Validate configuration
if (!BRIA_API_TOKEN) {
  console.error("❌ BRIA_API_TOKEN is required in .env file");
  process.exit(1);
}

console.log("✅ Enhanced Bria API Token configured");
console.log("🌐 Generation API:", BRIA_BASE_URL);
console.log("🎨 Image Edit API:", BRIA_EDIT_BASE_URL);

// ====== STORAGE SETUP ======
const designsDir = path.join(__dirname, "designs");
if (!fs.existsSync(designsDir)) {
  fs.mkdirSync(designsDir, { recursive: true });
}
app.use("/designs", express.static(designsDir));

// ====== GENERATION STATE STORAGE ======
const generationCache = new Map(); // In production, use Redis or database

// ====== UTILITY FUNCTIONS ======

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
 * Download and save image locally
 */
async function downloadAndSaveImage(imageUrl, filename) {
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 60000 // 60 second timeout
    });
    
    const buffer = Buffer.from(response.data);
    const filepath = path.join(designsDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    const localUrl = `http://localhost:${PORT}/designs/${filename}`;
    console.log(`✅ Image saved: ${filename}`);
    return localUrl;
  } catch (error) {
    console.error("Image download error:", error.message);
    throw new Error(`Failed to download image: ${error.message}`);
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
        if (result?.image_url || result?.structured_prompt) {
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

// ====== GENERATION ENDPOINT ======

/**
 * Generate new image with transparent background
 */
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "Valid prompt is required" }
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        success: false,
        error: { message: "Prompt too long (max 1000 characters)" }
      });
    }

    console.log(`🎨 Starting generation: "${prompt}"`);

    // Optimize prompt for T-shirt design
    const optimizedPrompt = `${prompt}, clean design suitable for t-shirt printing`;
    
    // Call Bria image generation API
    const generateResult = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
      prompt: optimizedPrompt,
      sync: false
    });

    if (!generateResult.success) {
      return res.status(generateResult.status || 500).json({
        success: false,
        error: generateResult.error
      });
    }

    const { request_id } = generateResult.data;
    if (!request_id) {
      return res.status(500).json({
        success: false,
        error: { message: "No request ID received from Bria API" }
      });
    }

    console.log(`📝 Generation started, request ID: ${request_id}`);

    // Poll for completion
    const pollResult = await pollBriaStatus(request_id);
    
    console.log(`🎨 Generation completed, now making background transparent...`);
    
    // Automatically remove background to ensure transparency
    const backgroundRemovalResult = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
      image: pollResult.imageUrl,
      sync: false
    });

    if (!backgroundRemovalResult.success) {
      console.warn(`⚠️  Background removal failed, using original image: ${backgroundRemovalResult.error?.message}`);
      var finalImageUrl = pollResult.imageUrl;
      var finalResult = pollResult.result;
    } else {
      console.log(`📝 Background removal request ID: ${backgroundRemovalResult.data.request_id}`);
      const bgRemovalPollResult = await pollBriaStatus(backgroundRemovalResult.data.request_id);
      var finalImageUrl = bgRemovalPollResult.imageUrl;
      var finalResult = bgRemovalPollResult.result;
      console.log(`✅ Background removed successfully, transparent image ready`);
    }
    
    // Download and save the final transparent image locally
    const filename = `generated_${request_id}_${Date.now()}.png`;
    const localUrl = await downloadAndSaveImage(finalImageUrl, filename);

    // Store structured_prompt and generation artifacts
    const generationData = {
      request_id,
      original_prompt: prompt,
      optimized_prompt: optimizedPrompt,
      structured_prompt: pollResult.result?.structured_prompt || finalResult?.structured_prompt || null,
      seed: pollResult.result?.seed || finalResult?.seed || null,
      image_url: finalImageUrl,
      original_with_bg_url: pollResult.imageUrl,
      local_url: localUrl,
      has_transparent_bg: finalImageUrl !== pollResult.imageUrl,
      created_at: new Date().toISOString()
    };
    
    // Store for refinement use
    generationCache.set(finalImageUrl, generationData);
    generationCache.set(localUrl, generationData);
    if (pollResult.imageUrl !== finalImageUrl) {
      generationCache.set(pollResult.imageUrl, generationData);
    }
    
    console.log(`💾 Stored generation data for enhanced refinement`);
    if (generationData.structured_prompt) {
      console.log(`📋 Structured prompt preserved (${generationData.structured_prompt.length} chars)`);
    }

    res.json({
      success: true,
      message: "Image generated successfully with transparent background",
      imageUrl: localUrl,
      originalUrl: finalImageUrl,
      originalWithBgUrl: pollResult.imageUrl !== finalImageUrl ? pollResult.imageUrl : null,
      requestId: request_id,
      structured_prompt: generationData.structured_prompt ? "preserved" : "not_available",
      seed: generationData.seed,
      hasTransparentBg: generationData.has_transparent_bg
    });

  } catch (error) {
    console.error("Generation error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// ====== ENHANCED REFINEMENT SYSTEM ======

/**
 * Enhanced refinement using hybrid mask-based and structured prompt approach
 */
app.post("/api/refine", async (req, res) => {
  try {
    const { instruction, imageUrl } = req.body;
    
    // Validate input
    if (!instruction || typeof instruction !== 'string' || instruction.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "Valid instruction is required" }
      });
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: "Valid image URL is required" }
      });
    }

    console.log(`🔧 Starting enhanced hybrid refinement: "${instruction}"`);
    console.log(`🖼️  Original image: ${imageUrl}`);

    // Retrieve original generation data
    let originalData = generationCache.get(imageUrl);
    
    if (!originalData) {
      for (const [key, data] of generationCache.entries()) {
        if (data.local_url === imageUrl || data.image_url === imageUrl) {
          originalData = data;
          break;
        }
      }
    }
    
    if (!originalData) {
      console.warn(`⚠️  No generation data found for ${imageUrl} - using fallback approach`);
    } else {
      console.log(`✅ Found original generation data with structured prompt: ${!!originalData.structured_prompt}`);
    }

    // Use original Bria URL for API calls
    let apiImageUrl = imageUrl;
    if (originalData && originalData.image_url && imageUrl.includes('localhost')) {
      apiImageUrl = originalData.image_url;
      console.log(`🔄 Using original Bria URL for API call: ${apiImageUrl}`);
    }

    // Parse instruction and determine refinement strategy
    const refinementPlan = await analyzeRefinementInstruction(instruction, originalData);
    console.log(`📋 Refinement plan: ${refinementPlan.strategy} (${refinementPlan.operations.length} operations)`);

    let refinementResult;
    
    // Execute refinement based on strategy
    if (refinementPlan.strategy === 'background_removal') {
      refinementResult = await performBackgroundRemoval(apiImageUrl);
    } else if (refinementPlan.strategy === 'mask_based') {
      refinementResult = await performMaskBasedRefinement(apiImageUrl, instruction, originalData, refinementPlan);
    } else if (refinementPlan.strategy === 'multi_step') {
      refinementResult = await performMultiStepRefinement(apiImageUrl, instruction, originalData, refinementPlan);
    } else {
      refinementResult = await performEnhancedStructuredRefinement(apiImageUrl, instruction, originalData, refinementPlan);
    }

    if (!refinementResult.success) {
      return res.status(500).json({
        success: false,
        error: refinementResult.error,
        debug: {
          original_data_found: !!originalData,
          instruction: instruction,
          strategy: refinementPlan.strategy
        }
      });
    }

    // Download and save refined image locally
    const filename = `refined_${Date.now()}.png`;
    const localUrl = await downloadAndSaveImage(refinementResult.imageUrl, filename);

    // Store refined image data for future refinements
    const refinedData = {
      ...originalData,
      refined_from: imageUrl,
      refinement_instruction: instruction,
      refinement_strategy: refinementPlan.strategy,
      structured_prompt: refinementResult.structured_prompt || originalData?.structured_prompt,
      image_url: refinementResult.imageUrl,
      local_url: localUrl,
      refined_at: new Date().toISOString()
    };
    
    generationCache.set(localUrl, refinedData);
    generationCache.set(refinementResult.imageUrl, refinedData);

    res.json({
      success: true,
      message: "Image refined successfully with enhanced system",
      refinedImageUrl: localUrl,
      originalUrl: refinementResult.imageUrl,
      editType: refinementResult.edit_type || refinementPlan.strategy,
      request_id: refinementResult.request_id,
      debug: {
        original_data_preserved: !!originalData,
        method_used: refinementPlan.strategy,
        operations_count: refinementPlan.operations.length,
        supports_localized_editing: refinementPlan.strategy === 'mask_based',
        unusual_edits_supported: refinementPlan.operations.some(op => op.specificity === 'very_high')
      }
    });

  } catch (error) {
    console.error("Enhanced refinement error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// ====== REFINEMENT STRATEGY FUNCTIONS ======

/**
 * Analyze refinement instruction and determine optimal strategy
 */
async function analyzeRefinementInstruction(instruction, originalData) {
  const lowerInstruction = instruction.toLowerCase();
  
  // Check for background removal
  if (lowerInstruction.includes('remove') && lowerInstruction.includes('background')) {
    return {
      strategy: 'background_removal',
      operations: [{ type: 'background_removal', instruction }]
    };
  }
  
  // Parse instruction for advanced analysis
  const parsedInstruction = parseInstructionAdvanced(instruction);
  
  // Check for multi-edit instructions
  if (parsedInstruction.complexity === 'multi_step') {
    return {
      strategy: 'multi_step',
      operations: parsedInstruction.modifications
    };
  }
  
  // Check for localized edits that benefit from mask-based approach
  if (parsedInstruction.requires_masking) {
    return {
      strategy: 'mask_based',
      operations: parsedInstruction.modifications
    };
  }
  
  // Default to enhanced structured prompt approach
  return {
    strategy: 'structured_prompt',
    operations: parsedInstruction.modifications
  };
}

/**
 * Advanced instruction parsing with better NLP
 */
function parseInstructionAdvanced(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  const modifications = [];
  
  // 1. Addition operations
  if (lowerInstruction.includes('add')) {
    const additionMatch = lowerInstruction.match(/add\s+(?:a\s+|an\s+)?(.+?)(?:\s+to\s+(.+?))?(?:\s+and|$)/);
    if (additionMatch) {
      const item = additionMatch[1].trim();
      const location = additionMatch[2] ? additionMatch[2].trim() : null;
      
      modifications.push({
        type: 'addition',
        item: item,
        location: location,
        specificity: determineSpecificity(item, location)
      });
    }
  }
  
  // 2. Color change operations
  if (lowerInstruction.includes('change') && lowerInstruction.includes('color')) {
    const colorMatch = lowerInstruction.match(/change\s+(?:the\s+)?(.+?)\s+color\s+to\s+(\w+)/);
    if (colorMatch) {
      modifications.push({
        type: 'color_change',
        target: colorMatch[1].trim(),
        new_color: colorMatch[2].trim(),
        specificity: 'high'
      });
    }
  }
  
  // 3. Background operations
  if (lowerInstruction.includes('background')) {
    modifications.push({
      type: 'background_change',
      description: extractBackgroundDescription(instruction),
      specificity: 'medium'
    });
  }
  
  // 4. Texture/material operations (blood, cracks, etc.)
  const textureKeywords = ['blood', 'crack', 'scar', 'drip', 'paint', 'glow', 'shine', 'rust'];
  for (const keyword of textureKeywords) {
    if (lowerInstruction.includes(keyword)) {
      modifications.push({
        type: 'texture_addition',
        texture: keyword,
        target: extractTextureTarget(instruction, keyword),
        specificity: 'very_high'
      });
    }
  }
  
  // Parse multi-edit instructions (AND, comma-separated)
  const hasMultipleEdits = lowerInstruction.includes(' and ') || 
                          lowerInstruction.includes(' & ') ||
                          (lowerInstruction.split(',').length > 1);
  
  return {
    modifications,
    complexity: hasMultipleEdits || modifications.length > 1 ? 'multi_step' : 'single_step',
    requires_masking: modifications.some(m => m.specificity === 'very_high')
  };
}

/**
 * Determine specificity level for masking decisions
 */
function determineSpecificity(item, location) {
  const highSpecificityItems = ['blood', 'crack', 'scar', 'eye', 'tooth', 'nail'];
  const mediumSpecificityItems = ['hat', 'cigar', 'glasses', 'jewelry'];
  
  if (highSpecificityItems.some(keyword => item.includes(keyword))) {
    return 'very_high';
  } else if (mediumSpecificityItems.some(keyword => item.includes(keyword))) {
    return 'high';
  } else if (location) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Extract texture target from instruction
 */
function extractTextureTarget(instruction, texture) {
  const lowerInstruction = instruction.toLowerCase();
  const targetMatch = lowerInstruction.match(new RegExp(`${texture}\\s+(?:to|on)\\s+(?:the\\s+)?(.+?)(?:\\s|$)`));
  
  if (targetMatch) {
    return targetMatch[1].trim();
  }
  
  // Common body parts and objects
  const commonTargets = ['nose', 'face', 'head', 'hand', 'arm', 'leg', 'chest', 'skull', 'tooth', 'eye'];
  for (const target of commonTargets) {
    if (lowerInstruction.includes(target)) {
      return target;
    }
  }
  
  return null;
}

// ====== REFINEMENT IMPLEMENTATION FUNCTIONS ======

/**
 * Perform background removal
 */
async function performBackgroundRemoval(imageUrl) {
  console.log("🎨 Performing background removal");
  
  const result = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
    image: imageUrl,
    sync: false
  });

  if (!result.success) {
    console.error("❌ Background removal failed:", result.error);
    return result;
  }

  const { request_id } = result.data;
  console.log(`📝 Background removal request ID: ${request_id}`);
  
  const pollResult = await pollBriaStatus(request_id);
  
  return {
    success: true,
    imageUrl: pollResult.imageUrl,
    request_id,
    edit_type: 'remove_background'
  };
}

/**
 * Perform mask-based localized refinement for precise edits
 */
async function performMaskBasedRefinement(imageUrl, instruction, originalData, refinementPlan) {
  console.log("🎯 Performing mask-based localized refinement");
  console.log(`   - Target: ${refinementPlan.operations[0]?.target || 'auto-detect'}`);
  
  try {
    // Try to generate mask for the target object
    const maskResult = await generateObjectMask(imageUrl, refinementPlan.operations[0]?.target);
    
    if (maskResult.success) {
      console.log("✅ Mask generated successfully, using gen_fill for localized edit");
      
      // Use gen_fill with mask for precise localized editing
      const genFillResult = await briaRequest(`${BRIA_EDIT_BASE_URL}/gen_fill`, {
        image: imageUrl,
        mask: maskResult.mask,
        prompt: instruction,
        sync: false
      });
      
      if (!genFillResult.success) {
        console.warn("⚠️  Gen_fill failed, falling back to structured prompt approach");
        return await performEnhancedStructuredRefinement(imageUrl, instruction, originalData, refinementPlan);
      }
      
      const { request_id } = genFillResult.data;
      console.log(`📝 Gen_fill request ID: ${request_id}`);
      
      const pollResult = await pollBriaStatus(request_id);
      
      return {
        success: true,
        imageUrl: pollResult.imageUrl,
        request_id,
        edit_type: 'mask_based_localized',
        structured_prompt: pollResult.result?.structured_prompt
      };
      
    } else {
      console.warn("⚠️  Mask generation failed, falling back to structured prompt approach");
      return await performEnhancedStructuredRefinement(imageUrl, instruction, originalData, refinementPlan);
    }
    
  } catch (error) {
    console.error("❌ Mask-based refinement failed:", error);
    console.log("🔄 Falling back to structured prompt approach");
    return await performEnhancedStructuredRefinement(imageUrl, instruction, originalData, refinementPlan);
  }
}

/**
 * Generate object mask using Bria's mask generator
 */
async function generateObjectMask(imageUrl, targetObject) {
  console.log(`🎭 Generating mask for target: ${targetObject}`);
  
  try {
    // First register the image (required for v1 mask generator)
    const registerResult = await briaRequest(`${BRIA_BASE_URL.replace('/v2', '/v1')}/register`, {
      image_url: imageUrl,
      sync: false
    });
    
    if (!registerResult.success) {
      return { success: false, error: registerResult.error };
    }
    
    const { visual_id } = registerResult.data;
    console.log(`📝 Image registered with visual_id: ${visual_id}`);
    
    // Generate mask for the target object
    const maskResult = await briaRequest(`${BRIA_BASE_URL.replace('/v2', '/v1')}/objects/mask_generator`, {
      visual_id,
      object_name: targetObject || 'main_subject',
      sync: false
    });
    
    if (!maskResult.success) {
      return { success: false, error: maskResult.error };
    }
    
    const maskPollResult = await pollBriaStatus(maskResult.data.request_id);
    
    if (maskPollResult.success && maskPollResult.result?.mask_url) {
      // Download mask and convert to base64
      const maskBase64 = await downloadImageAsBase64(maskPollResult.result.mask_url);
      
      return {
        success: true,
        mask: maskBase64,
        visual_id
      };
    }
    
    return { success: false, error: { message: "No mask generated" } };
    
  } catch (error) {
    console.error("Mask generation error:", error);
    return { success: false, error: { message: error.message } };
  }
}

/**
 * Download image and convert to base64 format for API use
 */
async function downloadImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const buffer = Buffer.from(response.data);
    const base64 = buffer.toString('base64');
    
    return `data:image/png;base64,${base64}`;
    
  } catch (error) {
    console.error("Image download for base64 conversion failed:", error);
    throw error;
  }
}

/**
 * Perform multi-step refinement for complex instructions
 */
async function performMultiStepRefinement(imageUrl, instruction, originalData, refinementPlan) {
  console.log("🔄 Performing multi-step refinement");
  console.log(`   - Operations: ${refinementPlan.operations.length}`);
  
  let currentImageUrl = imageUrl;
  let currentData = originalData;
  const operationResults = [];
  
  for (let i = 0; i < refinementPlan.operations.length; i++) {
    const operation = refinementPlan.operations[i];
    console.log(`📝 Step ${i + 1}/${refinementPlan.operations.length}: ${operation.type}`);
    
    let stepResult;
    
    if (operation.type === 'background_change') {
      stepResult = await performBackgroundEdit(currentImageUrl, operation.description, currentData);
    } else if (operation.specificity === 'very_high') {
      // Use mask-based for high specificity edits
      const localizedPlan = {
        strategy: 'mask_based',
        operations: [operation]
      };
      stepResult = await performMaskBasedRefinement(currentImageUrl, instruction, currentData, localizedPlan);
    } else {
      // Use structured prompt approach
      const structuredPlan = {
        strategy: 'structured_prompt',
        operations: [operation]
      };
      stepResult = await performEnhancedStructuredRefinement(currentImageUrl, instruction, currentData, structuredPlan);
    }
    
    if (!stepResult.success) {
      console.error(`❌ Step ${i + 1} failed:`, stepResult.error);
      // Continue with remaining steps using current image
    } else {
      currentImageUrl = stepResult.imageUrl;
      currentData = {
        ...currentData,
        image_url: stepResult.imageUrl,
        structured_prompt: stepResult.structured_prompt || currentData?.structured_prompt
      };
      operationResults.push(stepResult);
    }
  }
  
  // Return the final result
  const finalResult = operationResults[operationResults.length - 1];
  if (finalResult) {
    return {
      ...finalResult,
      edit_type: 'multi_step_refinement',
      steps_completed: operationResults.length,
      total_steps: refinementPlan.operations.length
    };
  } else {
    return {
      success: false,
      error: { message: "All multi-step operations failed" }
    };
  }
}

/**
 * Perform background-specific editing
 */
async function performBackgroundEdit(imageUrl, backgroundDescription, originalData) {
  console.log("🎨 Performing dedicated background edit");
  
  // Use background replacement endpoint for better results
  const result = await briaRequest(`${BRIA_EDIT_BASE_URL}/replace_background`, {
    image: imageUrl,
    prompt: backgroundDescription,
    sync: false
  });

  if (!result.success) {
    console.warn("⚠️  Background replacement failed, falling back to generation approach");
    return await performEnhancedPromptRefinement(imageUrl, backgroundDescription, originalData);
  }

  const { request_id } = result.data;
  console.log(`📝 Background replacement request ID: ${request_id}`);
  
  const pollResult = await pollBriaStatus(request_id);
  
  return {
    success: true,
    imageUrl: pollResult.imageUrl,
    request_id,
    structured_prompt: pollResult.result?.structured_prompt,
    edit_type: 'background_replacement'
  };
}

/**
 * Enhanced structured prompt refinement with better parsing
 */
async function performEnhancedStructuredRefinement(imageUrl, instruction, originalData, refinementPlan) {
  console.log("🎯 Performing enhanced structured prompt refinement");
  
  if (!originalData?.structured_prompt) {
    console.warn("⚠️  No structured prompt available, using enhanced prompt-based approach");
    return await performEnhancedPromptRefinement(imageUrl, instruction, originalData);
  }
  
  try {
    // Create intelligent modification of structured prompt
    const modifiedPrompt = enhancedStructuredPromptModification(originalData.structured_prompt, instruction);
    
    console.log("🎨 Generating image with enhanced structured prompt");
    
    const result = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
      structured_prompt: modifiedPrompt,
      sync: false
    });

    if (!result.success) {
      console.error("❌ Enhanced structured refinement failed:", result.error);
      return result;
    }

    const { request_id } = result.data;
    console.log(`📝 Enhanced refinement request ID: ${request_id}`);
    
    const pollResult = await pollBriaStatus(request_id);
    
    // Apply background preservation logic
    const lowerInstruction = instruction.toLowerCase();
    const isBackgroundEdit = lowerInstruction.includes('background') && 
                            (lowerInstruction.includes('add') || lowerInstruction.includes('change'));
    
    let finalImageUrl = pollResult.imageUrl;
    
    if (!isBackgroundEdit) {
      console.log("🔒 Non-background edit detected - ensuring transparent background");
      
      const backgroundRemovalResult = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
        image: pollResult.imageUrl,
        sync: false
      });

      if (backgroundRemovalResult.success) {
        console.log(`📝 Post-refinement background removal request ID: ${backgroundRemovalResult.data.request_id}`);
        const bgRemovalPollResult = await pollBriaStatus(backgroundRemovalResult.data.request_id);
        finalImageUrl = bgRemovalPollResult.imageUrl;
        console.log(`✅ Background successfully removed after refinement`);
      } else {
        console.warn(`⚠️  Post-refinement background removal failed: ${backgroundRemovalResult.error?.message}`);
      }
    }
    
    return {
      success: true,
      imageUrl: finalImageUrl,
      request_id,
      structured_prompt: pollResult.result?.structured_prompt || modifiedPrompt,
      edit_type: isBackgroundEdit ? 'background_edit' : 'enhanced_structured_refinement'
    };

  } catch (error) {
    console.error("❌ Enhanced structured refinement failed:", error);
    return {
      success: false,
      error: { message: `Enhanced structured refinement failed: ${error.message}` }
    };
  }
}

/**
 * Enhanced prompt-based refinement with better fallback
 */
async function performEnhancedPromptRefinement(imageUrl, instruction, originalData) {
  console.log("🔄 Performing enhanced prompt-based refinement");
  
  const lowerInstruction = instruction.toLowerCase();
  const isBackgroundEdit = lowerInstruction.includes('background') && 
                          (lowerInstruction.includes('add') || lowerInstruction.includes('change'));
  
  // Build enhanced contextual prompt
  let enhancedPrompt;
  if (isBackgroundEdit) {
    enhancedPrompt = originalData 
      ? `${originalData.original_prompt}, ${instruction}, high quality design suitable for t-shirt printing`
      : `${instruction}, high quality design suitable for t-shirt printing`;
  } else {
    enhancedPrompt = originalData 
      ? `${originalData.original_prompt}, ${instruction}, transparent background, high quality design suitable for t-shirt printing`
      : `${instruction}, transparent background, high quality design suitable for t-shirt printing`;
  }
  
  console.log(`📝 Using enhanced prompt: ${enhancedPrompt}`);
  
  const result = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
    prompt: enhancedPrompt,
    sync: false
  });

  if (!result.success) {
    return result;
  }

  const { request_id } = result.data;
  const pollResult = await pollBriaStatus(request_id);
  
  let finalImageUrl = pollResult.imageUrl;
  
  // Ensure background transparency for non-background edits
  if (!isBackgroundEdit) {
    console.log("🔒 Ensuring transparent background for enhanced prompt refinement");
    
    const backgroundRemovalResult = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
      image: pollResult.imageUrl,
      sync: false
    });

    if (backgroundRemovalResult.success) {
      const bgRemovalPollResult = await pollBriaStatus(backgroundRemovalResult.data.request_id);
      finalImageUrl = bgRemovalPollResult.imageUrl;
      console.log(`✅ Background successfully removed after enhanced prompt refinement`);
    } else {
      console.warn(`⚠️  Background removal failed: ${backgroundRemovalResult.error?.message}`);
    }
  }
  
  return {
    success: true,
    imageUrl: finalImageUrl,
    request_id,
    structured_prompt: pollResult.result?.structured_prompt,
    edit_type: isBackgroundEdit ? 'background_edit' : 'enhanced_prompt_refinement'
  };
}

// ====== ENHANCED NLP FUNCTIONS ======

/**
 * Enhanced structured prompt modification with better NLP parsing
 */
function enhancedStructuredPromptModification(originalPromptString, instruction) {
  try {
    const prompt = JSON.parse(originalPromptString);
    const lowerInstruction = instruction.toLowerCase();
    
    console.log("🧠 Enhanced structured prompt modification");
    console.log(`   - Instruction: ${instruction}`);
    
    // Preserve transparent background unless explicitly changing background
    if (!lowerInstruction.includes('background')) {
      prompt.background = "transparent background";
      console.log("🔒 Preserving transparent background");
    }
    
    // Enhanced instruction parsing
    const parsedInstruction = parseInstructionAdvanced(instruction);
    
    // Apply modifications based on parsed instruction
    for (const modification of parsedInstruction.modifications) {
      applyModificationToPrompt(prompt, modification);
    }
    
    // Update short description with better context
    updateShortDescriptionEnhanced(prompt, instruction, parsedInstruction);
    
    // Add enhanced modification metadata
    prompt._enhanced_modification = {
      instruction,
      parsed_modifications: parsedInstruction.modifications,
      modified_at: new Date().toISOString(),
      background_preserved: !lowerInstruction.includes('background')
    };
    
    return JSON.stringify(prompt);
    
  } catch (error) {
    console.error("Failed to enhance structured prompt modification:", error);
    throw error;
  }
}

/**
 * Apply modification to structured prompt
 */
function applyModificationToPrompt(prompt, modification) {
  switch (modification.type) {
    case 'addition':
      if (!prompt.objects) prompt.objects = [];
      prompt.objects.push(createEnhancedObject(modification.item, modification.location));
      break;
      
    case 'color_change':
      if (prompt.objects) {
        for (let obj of prompt.objects) {
          if (obj.description && obj.description.toLowerCase().includes(modification.target)) {
            obj.shape_and_color = obj.shape_and_color?.replace(/\b\w+(?=\s+(color|colored))/gi, modification.new_color) || `${modification.new_color} colored`;
            obj.description = obj.description.replace(new RegExp(`\\b\\w+\\s+(${modification.target})`, 'gi'), `${modification.new_color} $1`);
            break;
          }
        }
      }
      break;
      
    case 'background_change':
      prompt.background = modification.description;
      break;
      
    case 'texture_addition':
      if (!prompt.objects) prompt.objects = [];
      prompt.objects.push(createTextureObject(modification.texture, modification.target));
      break;
  }
}

/**
 * Create enhanced object with better positioning
 */
function createEnhancedObject(item, location) {
  const enhancedObjects = {
    'hat': {
      description: "A stylish hat positioned naturally on the character's head",
      location: location || "top-center, on head",
      relationship: "Worn by the main character",
      relative_size: "proportional to head size",
      shape_and_color: "Hat-appropriate shape with complementary colors",
      texture: "Fabric or material suitable for the hat style",
      appearance_details: "Natural fit and positioning, maintains character aesthetic",
      number_of_objects: 1,
      orientation: "Upright, following head angle"
    },
    'cigar': {
      description: "A realistic cigar held or positioned by the character",
      location: location || "near mouth or in hand",
      relationship: "Held or positioned by the main character",
      relative_size: "realistic cigar proportions",
      shape_and_color: "Cylindrical brown cigar with natural tobacco coloring",
      texture: "Tobacco leaf texture with realistic surface details",
      appearance_details: "Natural positioning appropriate to character pose",
      number_of_objects: 1,
      orientation: "Appropriate to character's grip or mouth position"
    },
    'eye': {
      description: "A detailed eye positioned naturally in the socket",
      location: location || "eye socket area",
      relationship: "Part of the character's facial features",
      relative_size: "proportional to face and socket size",
      shape_and_color: "Natural eye shape with appropriate iris color",
      texture: "Realistic eye surface with natural moisture and detail",
      appearance_details: "Natural positioning within socket, proper alignment",
      number_of_objects: 1,
      orientation: "Forward-facing with natural gaze direction"
    }
  };
  
  return enhancedObjects[item] || createGenericObject(item, location);
}

/**
 * Create texture object for unusual additions
 */
function createTextureObject(texture, target) {
  const textureObjects = {
    'blood': {
      description: `Blood effect applied to ${target || 'the character'} with realistic flow and coloring`,
      location: target ? `on ${target}` : "appropriate location",
      relationship: `Applied to ${target || 'the main character'}`,
      relative_size: "realistic blood droplet or flow size",
      shape_and_color: "Dark red blood with natural flow patterns",
      texture: "Liquid blood texture with appropriate viscosity appearance",
      appearance_details: "Realistic blood flow following gravity and surface contours",
      number_of_objects: 1,
      orientation: "Following natural flow patterns"
    },
    'crack': {
      description: `A realistic crack or fracture on ${target || 'the surface'}`,
      location: target ? `on ${target}` : "appropriate surface location",
      relationship: `Surface damage on ${target || 'the main subject'}`,
      relative_size: "proportional crack size for the surface",
      shape_and_color: "Dark crack lines with natural fracture patterns",
      texture: "Rough fractured surface texture",
      appearance_details: "Realistic crack propagation and depth variation",
      number_of_objects: 1,
      orientation: "Following natural stress patterns"
    }
  };
  
  return textureObjects[texture] || createGenericTextureObject(texture, target);
}

/**
 * Create generic object for unknown items
 */
function createGenericObject(item, location) {
  return {
    description: `A ${item} positioned naturally within the scene`,
    location: location || "appropriate position relative to main character",
    relationship: "Associated with or worn by the main character",
    relative_size: "proportional and realistic for the item type",
    shape_and_color: `Appropriate ${item} appearance with suitable colors`,
    texture: "Material texture suitable for the item type",
    appearance_details: "Natural integration maintaining scene coherence",
    number_of_objects: 1,
    orientation: "Natural positioning for the item type"
  };
}

/**
 * Create generic texture object
 */
function createGenericTextureObject(texture, target) {
  return {
    description: `${texture} effect applied to ${target || 'the character'} with realistic appearance`,
    location: target ? `on ${target}` : "appropriate location",
    relationship: `Surface effect on ${target || 'the main character'}`,
    relative_size: "realistic scale for the effect type",
    shape_and_color: `Natural ${texture} coloring and patterns`,
    texture: `Realistic ${texture} surface texture`,
    appearance_details: "Natural application following surface contours",
    number_of_objects: 1,
    orientation: "Following natural patterns"
  };
}

/**
 * Update short description with enhanced context
 */
function updateShortDescriptionEnhanced(prompt, instruction, parsedInstruction) {
  if (!prompt.short_description) return;
  
  const isBackgroundEdit = parsedInstruction.modifications.some(m => m.type === 'background_change');
  
  if (isBackgroundEdit) {
    const bgMod = parsedInstruction.modifications.find(m => m.type === 'background_change');
    prompt.short_description = prompt.short_description.replace(
      /transparent background|against a transparent background/gi, 
      bgMod.description
    );
  } else {
    // Add modification details while preserving transparency
    const modificationSummary = parsedInstruction.modifications
      .map(m => `${m.type.replace('_', ' ')}: ${m.item || m.target || m.texture}`)
      .join(', ');
    
    prompt.short_description += ` Enhanced with ${modificationSummary}.`;
    
    if (!prompt.short_description.toLowerCase().includes('transparent background')) {
      prompt.short_description += ' Maintains transparent background for t-shirt printing.';
    }
  }
}

/**
 * Extract background description from instruction
 */
function extractBackgroundDescription(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  
  // Specific weather/nature backgrounds
  if (lowerInstruction.includes('snowfall') || lowerInstruction.includes('snow falling')) {
    return 'a winter scene with gentle snowfall in the background';
  } else if (lowerInstruction.includes('rain') || lowerInstruction.includes('rainfall')) {
    return 'a rainy scene with raindrops falling in the background';
  } else if (lowerInstruction.includes('storm') || lowerInstruction.includes('stormy')) {
    return 'a dramatic stormy background with dark clouds';
  } else if (lowerInstruction.includes('sunset') || lowerInstruction.includes('sunrise')) {
    return 'a beautiful sunset/sunrise background with warm colors';
  } else if (lowerInstruction.includes('ocean') || lowerInstruction.includes('sea')) {
    return 'a serene ocean background with gentle waves';
  } else if (lowerInstruction.includes('mountains')) {
    return 'a majestic mountain landscape background';
  } else if (lowerInstruction.includes('forest') || lowerInstruction.includes('trees')) {
    return 'a natural forest background with trees';
  } else if (lowerInstruction.includes('city') || lowerInstruction.includes('urban')) {
    return 'an urban cityscape background';
  } else if (lowerInstruction.includes('space') || lowerInstruction.includes('stars')) {
    return 'a cosmic space background with stars';
  } else if (lowerInstruction.includes('clouds') || lowerInstruction.includes('cloudy')) {
    return 'a cloudy sky background';
  } else if (lowerInstruction.includes('sky')) {
    return 'a clear sky background';
  } 
  // Gradient backgrounds
  else if (lowerInstruction.includes('blue gradient')) {
    return 'a smooth blue gradient background';
  } else if (lowerInstruction.includes('gradient')) {
    const color = extractColor(instruction);
    return color ? `a smooth ${color} gradient background` : 'a colorful gradient background';
  } 
  // Solid color backgrounds
  else if (lowerInstruction.includes('solid')) {
    const color = extractColor(instruction);
    return color ? `a solid ${color} background` : 'a solid colored background';
  } 
  // Direct color mentions
  else if (lowerInstruction.includes('yellow')) {
    return 'a bright yellow background';
  } else {
    const color = extractColor(instruction);
    if (color) {
      return `a ${color} background`;
    } else {
      // Try to extract descriptive words before "background"
      const words = lowerInstruction.split(' ');
      const backgroundIndex = words.indexOf('background');
      if (backgroundIndex > 0) {
        const descriptor = words[backgroundIndex - 1];
        return `a ${descriptor} background`;
      }
      
      return 'a scenic background';
    }
  }
}

/**
 * Extract color from instruction
 */
function extractColor(instruction) {
  const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'gray', 'grey'];
  const lowerInstruction = instruction.toLowerCase();
  
  for (const color of colors) {
    if (lowerInstruction.includes(color)) {
      return color;
    }
  }
  
  return null;
}

// ====== OTHER ENDPOINTS ======

/**
 * Add to cart
 */
app.post("/api/cart/add", async (req, res) => {
  try {
    const { imageUrl, tshirtColor, design } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: { message: "Image URL is required" }
      });
    }

    const cartItem = {
      id: Date.now().toString(),
      imageUrl,
      tshirtColor: tshirtColor || '#000000',
      design: design || 'Custom Design',
      addedAt: new Date().toISOString(),
      price: 29.99
    };

    console.log(`🛒 Added to cart:`, cartItem);

    res.json({
      success: true,
      message: "Item added to cart successfully",
      cartItem
    });

  } catch (error) {
    console.error("Add to cart error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// ====== DEBUG ENDPOINTS ======

/**
 * Debug endpoint for refinement analysis
 */
app.get("/api/debug/refinement-analysis/:imageUrl", async (req, res) => {
  try {
    const imageUrl = decodeURIComponent(req.params.imageUrl);
    
    // Find original data
    let originalData = generationCache.get(imageUrl);
    if (!originalData) {
      for (const [key, data] of generationCache.entries()) {
        if (data.local_url === imageUrl || data.image_url === imageUrl) {
          originalData = data;
          break;
        }
      }
    }
    
    const analysis = {
      image_url: imageUrl,
      original_data_found: !!originalData,
      structured_prompt_available: !!originalData?.structured_prompt,
      localized_editing_ready: !!originalData?.structured_prompt,
      cache_entries: generationCache.size,
      refinement_capabilities: {
        mask_based: true,
        structured_prompt: !!originalData?.structured_prompt,
        enhanced_prompt: true,
        multi_step: true,
        unusual_edits: true
      }
    };
    
    if (originalData) {
      analysis.original_data = {
        request_id: originalData.request_id,
        original_prompt: originalData.original_prompt,
        has_structured_prompt: !!originalData.structured_prompt,
        has_seed: !!originalData.seed,
        created_at: originalData.created_at,
        refined_from: originalData.refined_from || null
      };
    }
    
    res.json({
      success: true,
      analysis
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * Test endpoint for instruction parsing
 */
app.post("/api/debug/parse-instruction", (req, res) => {
  try {
    const { instruction } = req.body;
    
    if (!instruction) {
      return res.status(400).json({
        success: false,
        error: { message: "Instruction is required" }
      });
    }
    
    const parsedInstruction = parseInstructionAdvanced(instruction);
    const refinementPlan = {
      strategy: parsedInstruction.requires_masking ? 'mask_based' : 
                parsedInstruction.complexity === 'multi_step' ? 'multi_step' : 'structured_prompt',
      operations: parsedInstruction.modifications
    };
    
    res.json({
      success: true,
      instruction,
      parsed: parsedInstruction,
      recommended_strategy: refinementPlan.strategy,
      analysis: {
        complexity: parsedInstruction.complexity,
        requires_masking: parsedInstruction.requires_masking,
        modification_count: parsedInstruction.modifications.length,
        modification_types: parsedInstruction.modifications.map(m => m.type),
        unusual_edits_detected: parsedInstruction.modifications.some(m => m.specificity === 'very_high')
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * Test endpoint for unusual refinements
 */
app.post("/api/test/unusual-refinement", async (req, res) => {
  try {
    const { testCase } = req.body;
    
    const testCases = {
      'blood_on_nose': {
        prompt: 'skull with flowers',
        instruction: 'add blood to the nose'
      },
      'crack_on_skull': {
        prompt: 'decorative skull',
        instruction: 'add a crack on the skull'
      },
      'change_tooth_color': {
        prompt: 'grinning skull',
        instruction: 'change tooth color to yellow'
      },
      'dripping_paint': {
        prompt: 'tiger face',
        instruction: 'add dripping paint on the tiger'
      },
      'multi_edit_complex': {
        prompt: 'fierce lion',
        instruction: 'add a hat AND add blood to the nose AND change background to forest'
      }
    };
    
    const test = testCases[testCase];
    if (!test) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid test case" },
        available_tests: Object.keys(testCases)
      });
    }
    
    console.log(`🧪 Running unusual refinement test: ${testCase}`);
    
    // Step 1: Generate original image
    const generateResult = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
      prompt: `${test.prompt}, clean design suitable for t-shirt printing`,
      sync: false
    });
    
    if (!generateResult.success) {
      return res.status(500).json({
        success: false,
        error: generateResult.error,
        step: 'generation'
      });
    }
    
    const generationPollResult = await pollBriaStatus(generateResult.data.request_id);
    
    // Make background transparent
    const bgRemovalResult = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
      image: generationPollResult.imageUrl,
      sync: false
    });
    
    let originalImageUrl = generationPollResult.imageUrl;
    if (bgRemovalResult.success) {
      const bgPollResult = await pollBriaStatus(bgRemovalResult.data.request_id);
      originalImageUrl = bgPollResult.imageUrl;
    }
    
    // Store generation data
    const generationData = {
      request_id: generateResult.data.request_id,
      original_prompt: test.prompt,
      structured_prompt: generationPollResult.result?.structured_prompt,
      image_url: originalImageUrl,
      created_at: new Date().toISOString()
    };
    generationCache.set(originalImageUrl, generationData);
    
    // Step 2: Perform unusual refinement
    const refinementPlan = await analyzeRefinementInstruction(test.instruction, generationData);
    
    let refinementResult;
    if (refinementPlan.strategy === 'mask_based') {
      refinementResult = await performMaskBasedRefinement(originalImageUrl, test.instruction, generationData, refinementPlan);
    } else if (refinementPlan.strategy === 'multi_step') {
      refinementResult = await performMultiStepRefinement(originalImageUrl, test.instruction, generationData, refinementPlan);
    } else {
      refinementResult = await performEnhancedStructuredRefinement(originalImageUrl, test.instruction, generationData, refinementPlan);
    }
    
    res.json({
      success: true,
      test_case: testCase,
      original_image: originalImageUrl,
      refined_image: refinementResult.success ? refinementResult.imageUrl : null,
      strategy_used: refinementPlan.strategy,
      operations: refinementPlan.operations,
      refinement_success: refinementResult.success,
      refinement_error: refinementResult.success ? null : refinementResult.error,
      debug: {
        original_prompt: test.prompt,
        instruction: test.instruction,
        structured_prompt_available: !!generationData.structured_prompt,
        modification_count: refinementPlan.operations.length,
        unusual_edit_detected: refinementPlan.operations.some(op => op.specificity === 'very_high')
      }
    });
    
  } catch (error) {
    console.error("Unusual refinement test error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * Health check
 */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Enhanced Bria T-shirt Design API is running",
    timestamp: new Date().toISOString(),
    cache_size: generationCache.size,
    capabilities: {
      generation: "✅ FIBO-based with transparent backgrounds",
      refinement: "✅ Hybrid mask-based + structured prompt",
      localized_editing: "✅ Mask-based for precise edits",
      multi_step: "✅ Complex multi-operation support",
      background_handling: "✅ Dedicated background operations",
      unusual_edits: "✅ Blood, cracks, textures supported",
      enhanced_nlp: "✅ Advanced instruction parsing"
    },
    endpoints: {
      generate: "/api/generate",
      refine: "/api/refine",
      cart: "/api/cart/add",
      debug_analysis: "/api/debug/refinement-analysis/:imageUrl",
      debug_parse: "/api/debug/parse-instruction",
      test_unusual: "/api/test/unusual-refinement"
    }
  });
});

// ====== ERROR HANDLING ======
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: { message: "Internal server error" }
  });
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`🚀 Enhanced Bria T-shirt Design API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎨 Ready for enhanced FIBO-based generation and hybrid refinement!`);
  console.log(`🔧 Supports: mask-based localized editing, unusual refinements, multi-step operations`);
});