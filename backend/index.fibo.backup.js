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

console.log("✅ Bria API Token configured");
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

    // Optimize prompt for T-shirt design (no background mentioned to let API decide)
    const optimizedPrompt = `${prompt}, clean design suitable for t-shirt printing`;
    
    // Call Bria image generation API
    const generateResult = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
      prompt: optimizedPrompt,
      sync: false // Use async mode
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
    
    // STEP 2: Automatically remove background to ensure transparency
    const backgroundRemovalResult = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
      image: pollResult.imageUrl,
      sync: false
    });

    if (!backgroundRemovalResult.success) {
      console.warn(`⚠️  Background removal failed, using original image: ${backgroundRemovalResult.error?.message}`);
      // Use original image if background removal fails
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

    // CRITICAL: Store structured_prompt and generation artifacts
    const generationData = {
      request_id,
      original_prompt: prompt,
      optimized_prompt: optimizedPrompt,
      structured_prompt: pollResult.result?.structured_prompt || finalResult?.structured_prompt || null,
      seed: pollResult.result?.seed || finalResult?.seed || null,
      image_url: finalImageUrl, // Final transparent image URL
      original_with_bg_url: pollResult.imageUrl, // Original with background (if different)
      local_url: localUrl, // Local cached URL
      has_transparent_bg: finalImageUrl !== pollResult.imageUrl,
      created_at: new Date().toISOString()
    };
    
    // Store for refinement use (both URLs point to same data)
    generationCache.set(finalImageUrl, generationData); // Final transparent URL
    generationCache.set(localUrl, generationData); // Local URL
    if (pollResult.imageUrl !== finalImageUrl) {
      generationCache.set(pollResult.imageUrl, generationData); // Original URL if different
    }
    
    console.log(`💾 Stored generation data for URLs:`);
    console.log(`   - Final (transparent): ${finalImageUrl}`);
    console.log(`   - Local: ${localUrl}`);
    if (pollResult.imageUrl !== finalImageUrl) {
      console.log(`   - Original (with bg): ${pollResult.imageUrl}`);
    }
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

    console.log(`🔧 Starting enhanced refinement: "${instruction}"`);
    console.log(`🖼️  Original image: ${imageUrl}`);

    // CRITICAL: Retrieve original generation data
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
      console.log(`✅ Found original generation data:`);
      console.log(`   - Request ID: ${originalData.request_id}`);
      console.log(`   - Original prompt: ${originalData.original_prompt}`);
      console.log(`   - Structured prompt: ${originalData.structured_prompt ? 'Available' : 'Not available'}`);
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
      // Default to enhanced structured prompt refinement
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
      message: "Image refined successfully",
      refinedImageUrl: localUrl,
      originalUrl: refinementResult.imageUrl,
      editType: refinementResult.edit_type || refinementPlan.strategy,
      request_id: refinementResult.request_id,
      debug: {
        original_data_preserved: !!originalData,
        method_used: refinementPlan.strategy,
        operations_count: refinementPlan.operations.length,
        supports_localized_editing: refinementPlan.strategy === 'mask_based'
      }
    });

  } catch (error) {
    console.error("Refinement error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

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
  
  // Enhanced multi-edit detection with comprehensive patterns
  const multiEditPatterns = [
    // Explicit conjunctions
    /\s+and\s+/i,
    /\s*&\s*/,
    /\s+plus\s+/i,
    /\s+also\s+/i,
    /\s+then\s+/i,
    // Comma-separated with action words
    /,\s*(?=add|change|make|turn|give|put|place|remove)/i,
    // Multiple action patterns
    /add\s+[^,]+.*(?:add|change|make|turn|give|put|place)/i,
    /change\s+[^,]+.*(?:add|change|make|turn|give|put|place)/i,
    /make\s+[^,]+.*(?:add|change|make|turn|give|put|place)/i,
    // Sequential patterns
    /(?:add|change|make|turn|give|put|place)\s+[^,]+\s+(?:and|&|plus|also|then)\s+(?:add|change|make|turn|give|put|place)/i
  ];
  
  const hasMultipleEdits = multiEditPatterns.some(pattern => pattern.test(instruction));
  
  if (hasMultipleEdits) {
    const operations = parseMultipleOperationsEnhanced(instruction);
    console.log(`🔍 Multi-edit detected: ${operations.length} operations found`);
    
    // Only use multi-step if we actually found multiple operations
    if (operations.length > 1) {
      // Apply conflict resolution
      const resolvedOperations = resolveOperationConflicts(operations);
      
      return {
        strategy: 'multi_step',
        operations: resolvedOperations,
        originalOperationCount: operations.length,
        conflictsResolved: operations.length !== resolvedOperations.length
      };
    }
  }
  
  // Check for localized edits that benefit from mask-based approach
  const localizedKeywords = [
    'add blood', 'add crack', 'add scar', 'add drip', 'add tear',
    'change tooth', 'change eye', 'change nose', 'change ear',
    'add to nose', 'add to eye', 'add to mouth', 'add to forehead',
    'paint on', 'draw on', 'scratch on', 'mark on'
  ];
  
  const isLocalizedEdit = localizedKeywords.some(keyword => 
    lowerInstruction.includes(keyword)
  );
  
  if (isLocalizedEdit) {
    return {
      strategy: 'mask_based',
      operations: [{ type: 'localized_edit', instruction, target: extractEditTarget(instruction) }]
    };
  }
  
  // Default to enhanced structured prompt approach
  return {
    strategy: 'structured_prompt',
    operations: [{ type: 'structured_modification', instruction }]
  };
}

/**
 * Enhanced multi-operation parser with comprehensive pattern recognition and validation
 */
function parseMultipleOperationsEnhanced(instruction) {
  const operations = [];
  
  console.log(`🔍 Enhanced parsing of multi-edit instruction: "${instruction}"`);
  
  // Step 1: Try multiple splitting strategies
  let parts = [];
  
  // Strategy 1: Split on explicit conjunctions
  const conjunctionSplit = instruction.split(/\s+(?:and|&|plus|also|then)\s+/i);
  if (conjunctionSplit.length > 1) {
    parts = conjunctionSplit;
    console.log(`   - Split by conjunctions: ${parts.length} parts`);
  }
  
  // Strategy 2: Split on commas followed by action words
  if (parts.length <= 1) {
    const commaSplit = instruction.split(/,\s*(?=add|change|make|turn|give|put|place|remove)/i);
    if (commaSplit.length > 1) {
      parts = commaSplit;
      console.log(`   - Split by comma + action: ${parts.length} parts`);
    }
  }
  
  // Strategy 3: Extract multiple action patterns
  if (parts.length <= 1) {
    const actionMatches = instruction.match(/(?:add|change|make|turn|give|put|place|remove)\s+[^,]+?(?=\s+(?:and|&|plus|also|then|,\s*(?:add|change|make|turn|give|put|place|remove))|$)/gi);
    if (actionMatches && actionMatches.length > 1) {
      parts = actionMatches;
      console.log(`   - Extracted by action patterns: ${parts.length} parts`);
    }
  }
  
  // Strategy 4: Fallback to original splitting
  if (parts.length <= 1) {
    parts = instruction.split(/\s+and\s+|\s*&\s*|\s*,\s*|\s+plus\s+|\s+also\s+|\s+then\s+/i);
    console.log(`   - Fallback split: ${parts.length} parts`);
  }
  
  // Step 2: Process each part
  for (let part of parts) {
    part = part.trim();
    if (part.length === 0) continue;
    
    // Clean up the part (remove leading conjunctions and articles)
    part = part.replace(/^(and|also|plus|then|a|an|the)\s+/i, '');
    
    // Parse the operation
    const operation = parseIndividualOperation(part);
    if (operation) {
      operations.push(operation);
      console.log(`   - Parsed: "${part}" as ${operation.type} (target: ${operation.target || 'none'})`);
    }
  }
  
  console.log(`✅ Enhanced parsing extracted ${operations.length} operations`);
  return operations;
}

/**
 * Parse individual operation with enhanced pattern recognition
 */
function parseIndividualOperation(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  
  // Background operations
  if (lowerInstruction.includes('background')) {
    return {
      type: 'background_edit',
      instruction: instruction,
      target: 'background',
      action: 'modify',
      priority: 1
    };
  }
  
  // Addition operations with comprehensive patterns
  const additionPatterns = [
    /add\s+(?:a\s+|an\s+)?(.+)/i,
    /put\s+(?:a\s+|an\s+)?(.+)\s+on/i,
    /give\s+(?:him|her|it)\s+(?:a\s+|an\s+)?(.+)/i,
    /place\s+(?:a\s+|an\s+)?(.+)/i
  ];
  
  for (const pattern of additionPatterns) {
    const match = instruction.match(pattern);
    if (match) {
      const object = match[1].trim();
      return {
        type: 'object_addition',
        instruction: instruction,
        target: extractObjectFromPhrase(object),
        object: object,
        action: 'add',
        priority: 2
      };
    }
  }
  
  // Color/modification operations
  const modificationPatterns = [
    /make\s+(?:the\s+)?(.+?)\s+(\w+)/i,
    /turn\s+(?:the\s+)?(.+?)\s+(\w+)/i,
    /change\s+(?:the\s+)?(.+?)\s+(?:color\s+)?to\s+(\w+)/i
  ];
  
  for (const pattern of modificationPatterns) {
    const match = instruction.match(pattern);
    if (match) {
      return {
        type: 'object_modification',
        instruction: instruction,
        target: match[1].trim(),
        value: match[2].trim(),
        action: 'modify',
        priority: 3
      };
    }
  }
  
  // Removal operations
  if (lowerInstruction.includes('remove') || lowerInstruction.includes('delete')) {
    const removeMatch = instruction.match(/(?:remove|delete)\s+(?:the\s+)?(.+)/i);
    if (removeMatch) {
      return {
        type: 'object_removal',
        instruction: instruction,
        target: removeMatch[1].trim(),
        action: 'remove',
        priority: 4
      };
    }
  }
  
  // Generic operation fallback
  return {
    type: 'general_edit',
    instruction: instruction,
    target: extractEditTarget(instruction),
    action: 'modify',
    priority: 5
  };
}

/**
 * Extract object name from phrase (e.g., "gold teeth" -> "teeth")
 */
function extractObjectFromPhrase(phrase) {
  const commonObjects = [
    'hat', 'sunglasses', 'glasses', 'cigar', 'cigarette', 'pipe',
    'necklace', 'chain', 'earring', 'bracelet', 'ring',
    'teeth', 'tooth', 'eye', 'eyes', 'nose', 'mouth',
    'shirt', 'jacket', 'coat', 'shoes', 'boots'
  ];
  
  const lowerPhrase = phrase.toLowerCase();
  for (const obj of commonObjects) {
    if (lowerPhrase.includes(obj)) {
      return obj;
    }
  }
  
  // Return the last word as likely object
  return phrase.split(' ').pop();
}

/**
 * Resolve conflicts between operations targeting the same element
 */
function resolveOperationConflicts(operations) {
  console.log(`🔧 Resolving conflicts among ${operations.length} operations`);
  
  const resolvedOperations = [];
  const targetMap = new Map();
  
  // Group operations by target
  for (const operation of operations) {
    const target = operation.target || 'unknown';
    if (!targetMap.has(target)) {
      targetMap.set(target, []);
    }
    targetMap.get(target).push(operation);
  }
  
  // Resolve conflicts for each target
  for (const [target, targetOperations] of targetMap.entries()) {
    if (targetOperations.length === 1) {
      // No conflict
      resolvedOperations.push(targetOperations[0]);
    } else {
      // Conflict: use the last operation (latest in instruction)
      const lastOperation = targetOperations[targetOperations.length - 1];
      resolvedOperations.push({
        ...lastOperation,
        conflictResolved: true,
        conflictedWith: targetOperations.slice(0, -1).map(op => op.instruction)
      });
      
      console.log(`   - Conflict resolved for "${target}": using "${lastOperation.instruction}"`);
      console.log(`   - Overridden: ${targetOperations.slice(0, -1).map(op => `"${op.instruction}"`).join(', ')}`);
    }
  }
  
  console.log(`✅ Resolved to ${resolvedOperations.length} operations`);
  return resolvedOperations;
}

/**
 * Extract edit target from localized edit instructions
 */
function extractEditTarget(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  
  // Body parts and objects that can be targeted
  const targets = [
    'nose', 'eye', 'mouth', 'tooth', 'teeth', 'ear', 'forehead', 'cheek',
    'hat', 'shirt', 'face', 'hand', 'arm', 'leg', 'foot', 'head',
    'skull', 'bone', 'wing', 'tail', 'paw', 'claw', 'sunglasses', 'cigar',
    'glasses', 'cigarette', 'pipe', 'necklace', 'earring', 'bracelet'
  ];
  
  for (const target of targets) {
    if (lowerInstruction.includes(target)) {
      return target;
    }
  }
  
  return 'unknown';
}

/**
 * Create intelligent object description from instruction for multi-edit support
 */
function createIntelligentObject(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  
  console.log(`🎨 Creating object for: "${instruction}"`);
  
  // Enhanced object templates for better multi-edit support
  if (lowerInstruction.includes('hat')) {
    return {
      description: "A stylish hat positioned naturally on the character's head, fitting the existing style and proportions.",
      location: "top-center, on head",
      relationship: "Worn by the main character.",
      relative_size: "proportional to character head",
      shape_and_color: "Hat-appropriate shape and complementary color",
      texture: "Suitable hat material (fabric, leather, or straw)",
      appearance_details: "Natural positioning, maintains character style, realistic shadows",
      number_of_objects: 1,
      orientation: "Upright, following head angle"
    };
  } else if (lowerInstruction.includes('sunglasses') || lowerInstruction.includes('glasses')) {
    return {
      description: "Stylish sunglasses positioned naturally on the character's face, fitting the eye area perfectly.",
      location: "center-face, over eyes",
      relationship: "Worn by the main character on their face.",
      relative_size: "proportional to face and eye area",
      shape_and_color: "Classic sunglasses shape with dark lenses",
      texture: "Smooth plastic or metal frame with reflective lenses",
      appearance_details: "Natural positioning on nose bridge, realistic reflections on lenses",
      number_of_objects: 1,
      orientation: "Horizontal, following face angle"
    };
  } else if (lowerInstruction.includes('cigar') || lowerInstruction.includes('cigarette')) {
    return {
      description: "A cigar held naturally by the character, positioned appropriately for the character's pose.",
      location: "near mouth or in hand",
      relationship: "Held or positioned by the main character.",
      relative_size: "proportional, realistic cigar size",
      shape_and_color: "Cylindrical cigar shape, brown tobacco color",
      texture: "Tobacco leaf texture with natural wrapping",
      appearance_details: "Realistic cigar appearance, natural positioning, subtle smoke wisps",
      number_of_objects: 1,
      orientation: "Appropriate to character pose and hand position"
    };
  } else if (lowerInstruction.includes('necklace') || lowerInstruction.includes('chain')) {
    return {
      description: "An elegant necklace worn naturally around the character's neck.",
      location: "around neck area",
      relationship: "Worn by the main character.",
      relative_size: "proportional to neck and chest area",
      shape_and_color: "Chain or beaded necklace with appropriate metallic color",
      texture: "Metallic or beaded texture with realistic shine",
      appearance_details: "Natural draping around neck, realistic weight and movement",
      number_of_objects: 1,
      orientation: "Following neck curve and gravity"
    };
  } else if (lowerInstruction.includes('earring')) {
    return {
      description: "Stylish earrings positioned naturally on the character's ears.",
      location: "on ears",
      relationship: "Worn by the main character.",
      relative_size: "proportional to ear size",
      shape_and_color: "Earring-appropriate shape and metallic color",
      texture: "Metallic or gemstone texture with shine",
      appearance_details: "Natural positioning on earlobes, realistic reflections",
      number_of_objects: 2,
      orientation: "Hanging naturally from ears"
    };
  } else if (lowerInstruction.includes('eye')) {
    return {
      description: "An eye positioned naturally in the eye socket, matching the character's style and proportions.",
      location: "eye socket area",
      relationship: "Part of the main character's face.",
      relative_size: "proportional to face",
      shape_and_color: "Eye-shaped, appropriate color for character",
      texture: "Natural eye texture with realistic iris and pupil",
      appearance_details: "Realistic eye appearance, natural positioning in socket, proper lighting",
      number_of_objects: 1,
      orientation: "Forward-facing"
    };
  } else {
    // Generic object creation for unknown items
    const objectType = lowerInstruction.replace(/^(add|put|place)\s*/i, '').trim().split(' ')[0];
    return {
      description: `A ${objectType} added to complement the character naturally.`,
      location: "appropriate position relative to character",
      relationship: "Associated with the main character.",
      relative_size: "proportional to character and scene",
      shape_and_color: `${objectType}-appropriate appearance and color`,
      texture: "Suitable material texture for the object type",
      appearance_details: "Natural integration with existing elements, realistic positioning",
      number_of_objects: 1,
      orientation: "Appropriate for object type and scene"
    };
  }
}

/**
 * Perform background removal
 */
async function performBackgroundRemoval(imageUrl) {
  console.log("🎨 Performing background removal");
  console.log(`   - Preserving subject from: ${imageUrl}`);
  
  const result = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
    image: imageUrl,
    sync: false
  });

  if (!result.success) {
    console.error("❌ Background removal failed:", result.error);
    return result;
  }

  const pollResult = await pollBriaStatus(result.data.request_id);
  
  return {
    success: true,
    imageUrl: pollResult.imageUrl,
    request_id: result.data.request_id,
    edit_type: 'background_removal'
  };
}

/**
 * Perform mask-based localized refinement for precise edits
 */
async function performMaskBasedRefinement(imageUrl, instruction, originalData, refinementPlan) {
  console.log("🎯 Performing mask-based localized refinement");
  console.log(`   - Target: ${refinementPlan.operations[0]?.target || 'auto-detect'}`);
  
  try {
    // Step 1: Try to generate mask for the target object
    const maskResult = await generateObjectMask(imageUrl, refinementPlan.operations[0]?.target);
    
    if (maskResult.success) {
      console.log("✅ Mask generated successfully, using gen_fill for localized edit");
      
      // Step 2: Use gen_fill with mask for precise localized editing
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
    
    // Return in the format expected by Bria API
    return `data:image/png;base64,${base64}`;
    
  } catch (error) {
    console.error("Image download for base64 conversion failed:", error);
    throw error;
  }
}

/**
 * Perform multi-step refinement by combining all operations into single structured prompt
 */
async function performMultiStepRefinement(imageUrl, instruction, originalData, refinementPlan) {
  console.log("🔄 Performing combined multi-step refinement");
  console.log(`   - Operations: ${refinementPlan.operations.length}`);
  console.log(`   - Combined instruction: ${instruction}`);
  
  // Instead of processing sequentially, combine ALL operations into one structured prompt modification
  if (!originalData?.structured_prompt) {
    console.warn("⚠️  No structured prompt available, using enhanced prompt-based approach for multi-edit");
    return await performEnhancedPromptRefinement(imageUrl, instruction, originalData);
  }
  
  try {
    // Parse the original structured prompt
    const originalPrompt = JSON.parse(originalData.structured_prompt);
    console.log("📋 Original structured prompt parsed successfully");
    
    // Apply ALL operations to the structured prompt at once
    const modifiedPrompt = applyCombinedOperations(originalPrompt, refinementPlan.operations, instruction);
    
    console.log("🎨 Generating image with combined multi-edit structured prompt");
    
    const result = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
      structured_prompt: JSON.stringify(modifiedPrompt),
      sync: false
    });

    if (!result.success) {
      console.error("❌ Combined multi-step refinement failed:", result.error);
      return result;
    }

    const { request_id } = result.data;
    console.log(`📝 Combined multi-step refinement request ID: ${request_id}`);
    
    const pollResult = await pollBriaStatus(request_id);
    
    // Apply background preservation logic
    const hasBackgroundEdit = refinementPlan.operations.some(op => 
      op.type === 'background_edit' || op.instruction.toLowerCase().includes('background')
    );
    
    let finalImageUrl = pollResult.imageUrl;
    
    if (!hasBackgroundEdit) {
      console.log("🔒 No background edits detected - ensuring transparent background");
      
      const backgroundRemovalResult = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
        image: pollResult.imageUrl,
        sync: false
      });

      if (backgroundRemovalResult.success) {
        console.log(`📝 Post-refinement background removal request ID: ${backgroundRemovalResult.data.request_id}`);
        const bgRemovalPollResult = await pollBriaStatus(backgroundRemovalResult.data.request_id);
        finalImageUrl = bgRemovalPollResult.imageUrl;
        console.log(`✅ Background successfully removed after multi-step refinement`);
      } else {
        console.warn(`⚠️  Post-refinement background removal failed: ${backgroundRemovalResult.error?.message}`);
      }
    }
    
    return {
      success: true,
      imageUrl: finalImageUrl,
      request_id,
      structured_prompt: pollResult.result?.structured_prompt || JSON.stringify(modifiedPrompt),
      edit_type: 'combined_multi_step_refinement',
      steps_completed: refinementPlan.operations.length,
      total_steps: refinementPlan.operations.length
    };

  } catch (error) {
    console.error("❌ Combined multi-step refinement failed:", error);
    return {
      success: false,
      error: { message: `Combined multi-step refinement failed: ${error.message}` }
    };
  }
}

/**
 * Apply multiple operations to structured prompt simultaneously
 */
function applyCombinedOperations(originalPrompt, operations, fullInstruction) {
  console.log("🔧 Applying enhanced combined operations to structured prompt");
  
  // Create a deep copy of the original prompt
  const modifiedPrompt = JSON.parse(JSON.stringify(originalPrompt));
  
  // Initialize objects array if it doesn't exist
  if (!modifiedPrompt.objects) {
    modifiedPrompt.objects = [];
  }
  
  // Track background state for persistence logic
  let backgroundModified = false;
  
  // Process each operation based on enhanced type system
  for (const operation of operations) {
    console.log(`   - Processing: "${operation.instruction}" (${operation.type})`);
    
    if (operation.type === 'background_edit') {
      // Handle background modifications
      const backgroundDesc = extractBackgroundDescription(operation.instruction);
      modifiedPrompt.background = backgroundDesc;
      backgroundModified = true;
      console.log(`     ✅ Background set to: ${backgroundDesc}`);
      
    } else if (operation.type === 'object_addition') {
      // Handle object additions with enhanced object creation
      const newObject = createIntelligentObjectEnhanced(operation);
      modifiedPrompt.objects.push(newObject);
      console.log(`     ✅ Added object: ${newObject.description}`);
      
    } else if (operation.type === 'object_modification') {
      // Handle object modifications (color changes, etc.)
      const modified = modifyExistingObject(modifiedPrompt.objects, operation);
      if (!modified) {
        // If object doesn't exist, create it with the modification
        const newObject = createIntelligentObjectEnhanced(operation);
        modifiedPrompt.objects.push(newObject);
        console.log(`     ✅ Created new object with modification: ${newObject.description}`);
      } else {
        console.log(`     ✅ Modified existing object: ${operation.target}`);
      }
      
    } else if (operation.type === 'object_removal') {
      // Handle object removal
      const removed = removeExistingObject(modifiedPrompt.objects, operation);
      if (removed) {
        console.log(`     ✅ Removed object: ${operation.target}`);
      } else {
        console.log(`     ⚠️  Object not found for removal: ${operation.target}`);
      }
      
    } else {
      // Handle general edits with fallback logic
      const newObject = createIntelligentObject(operation.instruction);
      modifiedPrompt.objects.push(newObject);
      console.log(`     ✅ Added general object: ${newObject.description}`);
    }
  }
  
  // Apply background persistence logic
  if (!backgroundModified) {
    // Preserve transparent background for non-background operations
    if (!modifiedPrompt.background || modifiedPrompt.background === 'transparent background') {
      modifiedPrompt.background = 'transparent background';
      console.log(`     🔒 Preserved transparent background`);
    }
  }
  
  // Update short description to reflect all changes
  if (modifiedPrompt.short_description) {
    updateShortDescriptionForOperations(modifiedPrompt, operations, backgroundModified);
  }
  
  // Add enhanced modification metadata
  modifiedPrompt._enhanced_combined_modification = {
    operations: operations.map(op => ({
      instruction: op.instruction,
      type: op.type,
      target: op.target,
      action: op.action,
      conflictResolved: op.conflictResolved || false
    })),
    full_instruction: fullInstruction,
    modified_at: new Date().toISOString(),
    operation_count: operations.length,
    background_modified: backgroundModified,
    conflicts_resolved: operations.filter(op => op.conflictResolved).length
  };
  
  console.log(`✅ Enhanced combination of ${operations.length} operations completed`);
  return modifiedPrompt;
}

/**
 * Create intelligent object from enhanced operation structure
 */
function createIntelligentObjectEnhanced(operation) {
  const objectName = operation.object || operation.target;
  const lowerObject = objectName ? objectName.toLowerCase() : '';
  
  // Enhanced object templates with better descriptions
  if (lowerObject.includes('sunglasses') || lowerObject.includes('glasses')) {
    return {
      description: "Stylish sunglasses positioned naturally on the character's face, fitting perfectly over the eyes with realistic proportions.",
      location: "center-face, over eyes",
      relationship: "Worn by the main character on their face.",
      relative_size: "proportional to face and eye area",
      shape_and_color: operation.value ? `${operation.value} sunglasses with dark lenses` : "Classic sunglasses shape with dark lenses and sleek frame",
      texture: "Smooth frame material with reflective lenses showing realistic light interaction",
      appearance_details: "Natural positioning on nose bridge, realistic shadows and reflections, maintains character style",
      number_of_objects: 1,
      orientation: "Horizontal, following face angle and perspective"
    };
  } else if (lowerObject.includes('cigar') || lowerObject.includes('cigarette')) {
    return {
      description: "A realistic cigar held naturally by the character, positioned appropriately for the character's pose and expression.",
      location: "near mouth or held in hand",
      relationship: "Held or positioned by the main character in a natural manner.",
      relative_size: "proportional and realistic cigar dimensions",
      shape_and_color: operation.value ? `${operation.value} cigar with natural tobacco coloring` : "Cylindrical brown cigar with natural tobacco coloring and texture",
      texture: "Tobacco leaf texture with realistic surface details and natural wrapping patterns",
      appearance_details: "Natural positioning appropriate to character pose, realistic lighting and shadows, subtle smoke wisps if appropriate",
      number_of_objects: 1,
      orientation: "Appropriate to character's grip or mouth position, following natural hand placement"
    };
  } else if (lowerObject.includes('hat')) {
    return {
      description: "A stylish hat positioned naturally on the character's head, fitting the existing style and maintaining proper proportions.",
      location: "top-center, on head",
      relationship: "Worn by the main character, integrated naturally with their appearance.",
      relative_size: "proportional to character head size and body proportions",
      shape_and_color: operation.value ? `${operation.value} hat with appropriate styling` : "Hat-appropriate shape and complementary color scheme",
      texture: "Suitable hat material texture (fabric, leather, or straw) with realistic surface properties",
      appearance_details: "Natural positioning following head shape, realistic shadows and lighting, maintains overall character aesthetic",
      number_of_objects: 1,
      orientation: "Upright, following head angle and natural hat positioning"
    };
  } else {
    // Generic enhanced object creation
    return {
      description: `A ${objectName} added naturally to complement the character, maintaining realistic proportions and integration.`,
      location: "appropriate position relative to character and scene composition",
      relationship: "Associated with or worn by the main character in a natural manner.",
      relative_size: "proportional and realistic for the object type and character scale",
      shape_and_color: operation.value ? `${operation.value} ${objectName} with appropriate styling` : `${objectName}-appropriate appearance with suitable colors and styling`,
      texture: "Material texture suitable for the object type with realistic surface properties",
      appearance_details: "Natural integration with existing elements, realistic lighting and shadows, maintains scene coherence",
      number_of_objects: 1,
      orientation: "Natural positioning appropriate for the object type and character interaction"
    };
  }
}

/**
 * Modify existing object in the objects array
 */
function modifyExistingObject(objects, operation) {
  const target = operation.target.toLowerCase();
  const value = operation.value;
  
  for (let obj of objects) {
    if (obj.description && obj.description.toLowerCase().includes(target)) {
      // Apply the modification
      if (value) {
        // Color or attribute change
        if (obj.shape_and_color) {
          obj.shape_and_color = obj.shape_and_color.replace(/\b\w+(?=\s+(color|colored|hue))/gi, value);
        }
        obj.description = obj.description.replace(new RegExp(`\\b\\w+\\s+(${target})`, 'gi'), `${value} $1`);
      }
      
      // Update appearance details
      obj.appearance_details = obj.appearance_details ? 
        `${obj.appearance_details} Modified to ${operation.instruction}.` :
        `Modified to ${operation.instruction}.`;
      
      return true;
    }
  }
  
  return false;
}

/**
 * Remove existing object from the objects array
 */
function removeExistingObject(objects, operation) {
  const target = operation.target.toLowerCase();
  const initialLength = objects.length;
  
  // Remove objects that match the target
  for (let i = objects.length - 1; i >= 0; i--) {
    if (objects[i].description && objects[i].description.toLowerCase().includes(target)) {
      objects.splice(i, 1);
    }
  }
  
  return objects.length < initialLength;
}

/**
 * Update short description based on applied operations
 */
function updateShortDescriptionForOperations(modifiedPrompt, operations, backgroundModified) {
  // Add information about additions
  const addedItems = operations
    .filter(op => op.type === 'object_addition')
    .map(op => op.object || op.target)
    .filter(item => item)
    .join(', ');
  
  if (addedItems) {
    modifiedPrompt.short_description += ` Enhanced with: ${addedItems}.`;
  }
  
  // Add information about modifications
  const modifiedItems = operations
    .filter(op => op.type === 'object_modification')
    .map(op => `${op.target} (${op.value || 'modified'})`)
    .join(', ');
  
  if (modifiedItems) {
    modifiedPrompt.short_description += ` Modified: ${modifiedItems}.`;
  }
  
  // Handle background preservation
  if (!backgroundModified && !modifiedPrompt.short_description.toLowerCase().includes('transparent background')) {
    modifiedPrompt.short_description += ' Maintains transparent background for t-shirt printing.';
  }
}

/**
 * Enhanced structured prompt refinement with better parsing
 */
async function performEnhancedStructuredRefinement(imageUrl, instruction, originalData, refinementPlan) {
  console.log("🎯 Performing enhanced structured prompt refinement");
  console.log(`   - Instruction: ${instruction}`);
  
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
 * Perform FIBO-based refinement with transparent background preservation
 */
async function performFIBORefinement(imageUrl, instruction, originalData) {
  console.log("🎯 Performing FIBO-based refinement");
  console.log(`   - Instruction: ${instruction}`);
  
  if (!originalData?.structured_prompt) {
    console.warn("⚠️  No structured prompt available, using prompt-based approach");
    return await performPromptBasedRefinement(imageUrl, instruction, originalData);
  }
  
  try {
    // Create intelligent modification of structured prompt
    const modifiedPrompt = modifyStructuredPromptIntelligently(originalData.structured_prompt, instruction);
    
    console.log("🎨 Generating image with modified structured prompt");
    
    const result = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
      structured_prompt: modifiedPrompt,
      sync: false
    });

    if (!result.success) {
      console.error("❌ FIBO refinement failed:", result.error);
      return result;
    }

    const { request_id } = result.data;
    console.log(`📝 FIBO refinement request ID: ${request_id}`);
    
    const pollResult = await pollBriaStatus(request_id);
    
    // CRITICAL: Check if we need to preserve transparent background
    const lowerInstruction = instruction.toLowerCase();
    const isBackgroundEdit = lowerInstruction.includes('background') && 
                            (lowerInstruction.includes('add') || lowerInstruction.includes('change'));
    
    let finalImageUrl = pollResult.imageUrl;
    
    // If this is NOT a background edit, ensure background stays transparent
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
    } else {
      console.log("🎨 Background edit detected - keeping generated background");
    }
    
    return {
      success: true,
      imageUrl: finalImageUrl,
      request_id,
      structured_prompt: pollResult.result?.structured_prompt || modifiedPrompt,
      edit_type: isBackgroundEdit ? 'background_edit' : 'fibo_structured_refinement'
    };

  } catch (error) {
    console.error("❌ FIBO refinement failed:", error);
    return {
      success: false,
      error: { message: `FIBO refinement failed: ${error.message}` }
    };
  }
}

/**
 * Fallback prompt-based refinement
 */
async function performPromptBasedRefinement(imageUrl, instruction, originalData) {
  console.log("🔄 Performing prompt-based refinement as fallback");
  
  const lowerInstruction = instruction.toLowerCase();
  const isBackgroundEdit = lowerInstruction.includes('background') && 
                          (lowerInstruction.includes('add') || lowerInstruction.includes('change'));
  
  // Build contextual prompt based on whether this is a background edit
  let contextualPrompt;
  if (isBackgroundEdit) {
    // For background edits, don't force transparent background
    contextualPrompt = originalData 
      ? `${originalData.original_prompt}, ${instruction}, clean design suitable for t-shirt printing`
      : `${instruction}, clean design suitable for t-shirt printing`;
  } else {
    // For non-background edits, ensure transparent background
    contextualPrompt = originalData 
      ? `${originalData.original_prompt}, ${instruction}, transparent background, clean design suitable for t-shirt printing`
      : `${instruction}, transparent background, clean design suitable for t-shirt printing`;
  }
  
  console.log(`📝 Using contextual prompt: ${contextualPrompt}`);
  
  const result = await briaRequest(`${BRIA_BASE_URL}/image/generate`, {
    prompt: contextualPrompt,
    sync: false
  });

  if (!result.success) {
    return result;
  }

  const { request_id } = result.data;
  const pollResult = await pollBriaStatus(request_id);
  
  let finalImageUrl = pollResult.imageUrl;
  
  // If this is NOT a background edit, ensure background stays transparent
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
      console.log(`✅ Background successfully removed after prompt-based refinement`);
    } else {
      console.warn(`⚠️  Post-refinement background removal failed: ${backgroundRemovalResult.error?.message}`);
    }
  }
  
  return {
    success: true,
    imageUrl: finalImageUrl,
    request_id,
    structured_prompt: pollResult.result?.structured_prompt,
    edit_type: isBackgroundEdit ? 'background_edit' : 'prompt_based_refinement'
  };
}

/**
 * Enhanced structured prompt modification with better NLP parsing
 */
function enhancedStructuredPromptModification(originalPromptString, instruction) {
  try {
    const prompt = JSON.parse(originalPromptString);
    const lowerInstruction = instruction.toLowerCase();
    
    console.log("🧠 Enhanced structured prompt modification");
    console.log(`   - Instruction: ${instruction}`);
    
    // Check for multi-edit patterns and use dedicated multi-edit processing
    const multiEditPatterns = [
      ' and ', ' & ', ' plus ', ' also ', ' then ',
      /add\s+\w+.*add\s+\w+/i,  // Multiple "add" statements
      /,\s*add/i,               // Comma-separated additions
    ];
    
    const isMultiEdit = multiEditPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return lowerInstruction.includes(pattern);
      } else {
        return pattern.test(instruction);
      }
    });
    
    if (isMultiEdit) {
      console.log("🔄 Multi-edit detected - using dedicated multi-edit processing");
      return processMultiEditInstruction(prompt, instruction);
    }
    
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
 * Advanced instruction parsing with better NLP
 */
function parseInstructionAdvanced(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  const modifications = [];
  
  // Parse different types of modifications
  
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
  
  // 4. Removal operations
  if (lowerInstruction.includes('remove')) {
    const removeMatch = lowerInstruction.match(/remove\s+(?:the\s+)?(.+)/);
    if (removeMatch) {
      modifications.push({
        type: 'removal',
        target: removeMatch[1].trim(),
        specificity: 'high'
      });
    }
  }
  
  // 5. Texture/material operations (blood, cracks, etc.)
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
  
  return {
    modifications,
    complexity: modifications.length > 1 ? 'multi_step' : 'single_step',
    requires_masking: modifications.some(m => m.specificity === 'very_high')
  };
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
      
    case 'removal':
      if (prompt.objects) {
        prompt.objects = prompt.objects.filter(obj => 
          !obj.description.toLowerCase().includes(modification.target)
        );
      }
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
 * Perform background-specific editing
 */
async function performBackgroundEdit(imageUrl, instruction, originalData) {
  console.log("🎨 Performing dedicated background edit");
  console.log(`   - Instruction: ${instruction}`);
  
  const backgroundDesc = extractBackgroundDescription(instruction);
  
  // Use background replacement endpoint for better results
  const result = await briaRequest(`${BRIA_EDIT_BASE_URL}/replace_background`, {
    image: imageUrl,
    prompt: backgroundDesc,
    sync: false
  });

  if (!result.success) {
    console.warn("⚠️  Background replacement failed, falling back to generation approach");
    return await performEnhancedPromptRefinement(imageUrl, instruction, originalData);
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

/**
 * Intelligently modify structured prompt based on instruction
 */
function modifyStructuredPromptIntelligently(originalPromptString, instruction) {
  try {
    const prompt = JSON.parse(originalPromptString);
    const lowerInstruction = instruction.toLowerCase();
    
    console.log("🧠 Intelligently modifying structured prompt");
    console.log(`   - Instruction: ${instruction}`);
    
    // CRITICAL: Always preserve transparent background unless explicitly changing background
    if (!lowerInstruction.includes('background')) {
      prompt.background = "transparent background";
      console.log("🔒 Preserving transparent background");
    }
    
    // Handle different types of modifications
    if (lowerInstruction.includes('add') && !lowerInstruction.includes('background')) {
      // Adding objects
      const newObject = createIntelligentObject(instruction);
      if (!prompt.objects) {
        prompt.objects = [];
      }
      prompt.objects.push(newObject);
      console.log(`✅ Added object: ${newObject.description}`);
      
    } else if (lowerInstruction.includes('change') && lowerInstruction.includes('color')) {
      // Color changes
      const targetObject = extractTargetObject(instruction);
      const newColor = extractColor(instruction);
      
      if (targetObject && newColor && prompt.objects) {
        for (let obj of prompt.objects) {
          if (obj.description && obj.description.toLowerCase().includes(targetObject)) {
            if (obj.shape_and_color) {
              obj.shape_and_color = obj.shape_and_color.replace(/\b\w+(?=\s+(color|colored|hue))/gi, newColor);
            }
            obj.description = obj.description.replace(new RegExp(`\\b\\w+\\s+(${targetObject})`, 'gi'), `${newColor} $1`);
            console.log(`✅ Modified ${targetObject} color to ${newColor}`);
            break;
          }
        }
      }
      
    } else if (lowerInstruction.includes('background')) {
      // Background modifications
      const backgroundDesc = extractBackgroundDescription(instruction);
      prompt.background = backgroundDesc;
      console.log(`✅ Modified background: ${backgroundDesc}`);
    }
    
    // Update short description appropriately
    if (prompt.short_description) {
      if (lowerInstruction.includes('background')) {
        // For background edits, update the description to include the new background
        const backgroundDesc = extractBackgroundDescription(instruction);
        prompt.short_description = prompt.short_description.replace(/transparent background|against a transparent background/gi, backgroundDesc);
        if (!prompt.short_description.toLowerCase().includes(backgroundDesc.toLowerCase())) {
          prompt.short_description += ` The scene is set against ${backgroundDesc}.`;
        }
      } else {
        // For non-background edits, add the modification but preserve transparency
        prompt.short_description += ` ${instruction}.`;
        // Ensure transparent background is maintained in description
        if (!prompt.short_description.toLowerCase().includes('transparent background')) {
          prompt.short_description += ' The image maintains a transparent background.';
        }
      }
    }
    
    // Add modification metadata
    prompt._intelligent_modification = {
      instruction,
      modified_at: new Date().toISOString(),
      background_preserved: !lowerInstruction.includes('background')
    };
    
    return JSON.stringify(prompt);
    
  } catch (error) {
    console.error("Failed to intelligently modify structured prompt:", error);
    throw error;
  }
}



/**
 * Extract target object from instruction
 */
function extractTargetObject(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  const objects = ['hat', 'shirt', 'eye', 'hair', 'face', 'hand', 'arm', 'leg', 'shoe', 'glasses'];
  
  for (const obj of objects) {
    if (lowerInstruction.includes(obj)) {
      return obj;
    }
  }
  
  return null;
}

/**
 * Extract color from instruction with enhanced color detection
 */
function extractColor(instruction) {
  const colors = [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'gray', 'grey',
    'silver', 'gold', 'bronze', 'copper', 'crimson', 'scarlet', 'navy', 'teal', 'cyan', 'magenta',
    'lime', 'olive', 'maroon', 'violet', 'indigo', 'turquoise', 'beige', 'tan', 'khaki'
  ];
  const lowerInstruction = instruction.toLowerCase();
  
  for (const color of colors) {
    if (lowerInstruction.includes(color)) {
      return color;
    }
  }
  
  return null;
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
      
      // If "background of X" pattern, extract X
      const backgroundOfMatch = lowerInstruction.match(/background of (.+)/);
      if (backgroundOfMatch) {
        const backgroundType = backgroundOfMatch[1].trim();
        return `a background featuring ${backgroundType}`;
      }
      
      return 'a scenic background';
    }
  }
}

/**
 * Enhanced test endpoint for multi-edit functionality
 */
app.post("/api/test/multi-edit", async (req, res) => {
  try {
    const { instruction, imageUrl } = req.body;
    
    console.log(`🧪 Testing enhanced multi-edit: "${instruction}"`);
    
    // Analyze the instruction with enhanced parsing
    const refinementPlan = await analyzeRefinementInstruction(instruction, null);
    
    // Get generation data if available
    let originalData = generationCache.get(imageUrl);
    if (!originalData) {
      for (const [key, data] of generationCache.entries()) {
        if (data.local_url === imageUrl || data.image_url === imageUrl) {
          originalData = data;
          break;
        }
      }
    }
    
    // Test the enhanced parsing directly
    const directParseTest = parseMultipleOperationsEnhanced(instruction);
    
    res.json({
      success: true,
      analysis: {
        instruction,
        strategy: refinementPlan.strategy,
        operations_detected: refinementPlan.operations.length,
        operations: refinementPlan.operations,
        conflicts_resolved: refinementPlan.conflictsResolved || false,
        original_operation_count: refinementPlan.originalOperationCount || refinementPlan.operations.length,
        has_original_data: !!originalData,
        structured_prompt_available: !!(originalData?.structured_prompt),
        direct_parse_test: {
          operations_found: directParseTest.length,
          operations: directParseTest
        },
        parsing_improvements: {
          enhanced_conjunction_detection: true,
          conflict_resolution: true,
          comprehensive_pattern_matching: true,
          operation_validation: true
        }
      }
    });
    
  } catch (error) {
    console.error("Enhanced multi-edit test error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * Complete multi-edit test endpoint that actually performs the refinement
 */
app.post("/api/test/complete-multi-edit", async (req, res) => {
  try {
    const { testCase } = req.body;
    
    const testCases = {
      'sunglasses_and_cigar': {
        prompt: 'cool tiger',
        instruction: 'add sunglasses and add a cigar',
        expected_objects: ['sunglasses', 'cigar']
      },
      'hat_and_necklace': {
        prompt: 'elegant cat',
        instruction: 'add a hat and add a necklace',
        expected_objects: ['hat', 'necklace']
      },
      'multiple_accessories': {
        prompt: 'fierce wolf',
        instruction: 'add sunglasses, add a hat, and add a cigar',
        expected_objects: ['sunglasses', 'hat', 'cigar']
      }
    };
    
    const test = testCases[testCase];
    if (!test) {
      return res.status(400).json({
        success: false,
        error: { message: `Unknown test case: ${testCase}` }
      });
    }
    
    console.log(`🧪 Running complete multi-edit test: ${testCase}`);
    
    // Step 1: Generate original image
    console.log(`📝 Step 1: Generating original image with prompt: "${test.prompt}"`);
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
    
    // Remove background to ensure transparency
    const bgRemovalResult = await briaRequest(`${BRIA_EDIT_BASE_URL}/remove_background`, {
      image: generationPollResult.imageUrl,
      sync: false
    });
    
    let originalImageUrl = generationPollResult.imageUrl;
    if (bgRemovalResult.success) {
      const bgRemovalPollResult = await pollBriaStatus(bgRemovalResult.data.request_id);
      originalImageUrl = bgRemovalPollResult.imageUrl;
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
    
    console.log(`✅ Step 1 complete: Original image generated`);
    
    // Step 2: Analyze multi-edit instruction
    console.log(`📝 Step 2: Analyzing multi-edit instruction: "${test.instruction}"`);
    const refinementPlan = await analyzeRefinementInstruction(test.instruction, generationData);
    
    console.log(`✅ Step 2 complete: Strategy = ${refinementPlan.strategy}, Operations = ${refinementPlan.operations.length}`);
    
    // Step 3: Perform multi-edit refinement
    console.log(`📝 Step 3: Performing multi-edit refinement`);
    let refinementResult;
    
    if (refinementPlan.strategy === 'multi_step') {
      refinementResult = await performMultiStepRefinement(originalImageUrl, test.instruction, generationData, refinementPlan);
    } else {
      refinementResult = await performEnhancedStructuredRefinement(originalImageUrl, test.instruction, generationData, refinementPlan);
    }
    
    if (!refinementResult.success) {
      return res.status(500).json({
        success: false,
        error: refinementResult.error,
        step: 'refinement'
      });
    }
    
    console.log(`✅ Step 3 complete: Multi-edit refinement successful`);
    
    res.json({
      success: true,
      test_case: testCase,
      results: {
        original_image: originalImageUrl,
        refined_image: refinementResult.imageUrl,
        instruction: test.instruction,
        strategy_used: refinementPlan.strategy,
        operations_detected: refinementPlan.operations.length,
        operations: refinementPlan.operations,
        expected_objects: test.expected_objects,
        request_id: refinementResult.request_id,
        edit_type: refinementResult.edit_type
      }
    });
    
  } catch (error) {
    console.error("Complete multi-edit test error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

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
        multi_step: true
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
        modification_types: parsedInstruction.modifications.map(m => m.type)
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
      unusual_edits: "✅ Blood, cracks, textures supported"
    },
    endpoints: {
      generate: "/api/generate",
      refine: "/api/refine",
      cart: "/api/cart/add",
      debug_analysis: "/api/debug/refinement-analysis/:imageUrl",
      debug_parse: "/api/debug/parse-instruction"
    }
  });
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
        modification_count: refinementPlan.operations.length
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

// ====== ERROR HANDLING ======
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: { message: "Internal server error" }
  });
});

/**
 * Process multi-edit instructions by combining all operations into single structured prompt
 */
function processMultiEditInstruction(prompt, instruction) {
  console.log("🔧 Processing multi-edit instruction");
  
  // Initialize objects array if it doesn't exist
  if (!prompt.objects) {
    prompt.objects = [];
  }
  
  // Parse multiple operations from the instruction
  const operations = parseMultiEditOperations(instruction);
  console.log(`   - Detected ${operations.length} operations`);
  
  // Process each operation
  for (const operation of operations) {
    const lowerOp = operation.toLowerCase();
    console.log(`   - Processing: ${operation}`);
    
    if (lowerOp.includes('add')) {
      // Add new objects
      const newObject = createIntelligentObjectForMultiEdit(operation);
      prompt.objects.push(newObject);
      console.log(`     ✅ Added: ${newObject.description}`);
      
    } else if (lowerOp.includes('change') && lowerOp.includes('color')) {
      // Handle color changes
      const targetObject = extractTargetObject(operation);
      const newColor = extractColor(operation);
      
      if (targetObject && newColor) {
        let modified = false;
        for (let obj of prompt.objects) {
          if (obj.description && obj.description.toLowerCase().includes(targetObject)) {
            if (obj.shape_and_color) {
              obj.shape_and_color = obj.shape_and_color.replace(/\b\w+(?=\s+(color|colored|hue))/gi, newColor);
            }
            obj.description = obj.description.replace(new RegExp(`\\b\\w+\\s+(${targetObject})`, 'gi'), `${newColor} $1`);
            modified = true;
            console.log(`     ✅ Modified ${targetObject} color to ${newColor}`);
            break;
          }
        }
        
        if (!modified) {
          const newObject = createIntelligentObjectForMultiEdit(`add ${newColor} ${targetObject}`);
          prompt.objects.push(newObject);
          console.log(`     ✅ Added new ${newColor} ${targetObject}`);
        }
      }
    }
  }
  
  // Update short description to reflect all changes
  if (prompt.short_description) {
    const addedItems = operations
      .filter(op => op.toLowerCase().includes('add'))
      .map(op => op.replace(/^add\s*/i, '').trim())
      .join(', ');
    
    if (addedItems) {
      prompt.short_description += ` The image has been enhanced with: ${addedItems}.`;
    }
    
    // Ensure transparent background is maintained
    if (!prompt.short_description.toLowerCase().includes('transparent background')) {
      prompt.short_description += ' The image maintains a transparent background.';
    }
  }
  
  // Preserve transparent background unless explicitly changed
  if (!instruction.toLowerCase().includes('background')) {
    prompt.background = "transparent background";
  }
  
  // Add metadata
  prompt._multi_edit_metadata = {
    operations,
    instruction,
    processed_at: new Date().toISOString(),
    operation_count: operations.length
  };
  
  console.log(`✅ Multi-edit processing complete: ${operations.length} operations applied`);
  return JSON.stringify(prompt);
}

/**
 * Parse multi-edit operations from instruction
 */
function parseMultiEditOperations(instruction) {
  // Enhanced splitting patterns
  let parts = instruction.split(/\s+and\s+|\s*&\s*|\s*,\s*|\s+plus\s+|\s+also\s+/i);
  
  // If no clear separators, try to detect multiple "add" statements
  if (parts.length === 1) {
    const addMatches = instruction.match(/add\s+[^,]+/gi);
    if (addMatches && addMatches.length > 1) {
      parts = addMatches;
    }
  }
  
  return parts
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => part.replace(/^(and|also|plus|then)\s+/i, ''));
}

/**
 * Create intelligent object for multi-edit scenarios
 */
function createIntelligentObjectForMultiEdit(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  
  if (lowerInstruction.includes('sunglasses') || lowerInstruction.includes('glasses')) {
    return {
      description: "Stylish sunglasses positioned naturally on the character's face, fitting perfectly over the eyes.",
      location: "center-face, over eyes",
      relationship: "Worn by the main character.",
      relative_size: "proportional to face",
      shape_and_color: "Classic sunglasses shape with dark lenses and sleek frame",
      texture: "Smooth frame with reflective lenses",
      appearance_details: "Natural positioning, realistic reflections",
      number_of_objects: 1,
      orientation: "Horizontal"
    };
  } else if (lowerInstruction.includes('cigar') || lowerInstruction.includes('cigarette')) {
    return {
      description: "A cigar held naturally by the character, positioned appropriately.",
      location: "near mouth or in hand",
      relationship: "Held by the main character.",
      relative_size: "proportional, realistic size",
      shape_and_color: "Cylindrical cigar shape, brown tobacco color",
      texture: "Tobacco leaf texture",
      appearance_details: "Realistic appearance with natural positioning",
      number_of_objects: 1,
      orientation: "Appropriate to pose"
    };
  } else if (lowerInstruction.includes('hat')) {
    return {
      description: "A stylish hat positioned naturally on the character's head.",
      location: "top-center, on head",
      relationship: "Worn by the main character.",
      relative_size: "proportional to head",
      shape_and_color: "Hat-appropriate shape and color",
      texture: "Suitable hat material",
      appearance_details: "Natural positioning, maintains style",
      number_of_objects: 1,
      orientation: "Upright"
    };
  } else {
    // Generic object
    const objectType = lowerInstruction.replace(/^(add|put|place)\s*/i, '').trim().split(' ')[0];
    return {
      description: `A ${objectType} added naturally to complement the character.`,
      location: "appropriate position",
      relationship: "Associated with the main character.",
      relative_size: "proportional",
      shape_and_color: `${objectType}-appropriate appearance`,
      texture: "Suitable material",
      appearance_details: "Natural integration",
      number_of_objects: 1,
      orientation: "Appropriate"
    };
  }
}

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`🚀 Bria T-shirt Design API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎨 Ready for FIBO-based image generation and refinement!`);
});