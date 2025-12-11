// Full debug test for background extraction

function isValidBackgroundDescription(description) {
  const lowerDesc = description.toLowerCase().trim();
  
  if (lowerDesc.length < 2) {
    return false;
  }
  
  const nonBackgroundWords = [
    'it', 'him', 'her', 'them', 'the', 'a', 'an', 'and', 'or', 'but',
    'add', 'remove', 'change', 'make', 'turn', 'give', 'put', 'place',
    'sunglasses', 'hat', 'cigar', 'necklace', 'earrings', 'teeth', 'eyes'
  ];
  
  if (nonBackgroundWords.includes(lowerDesc)) {
    return false;
  }
  
  return true;
}

function enhanceBackgroundDescription(description) {
  const lowerDesc = description.toLowerCase().trim();
  
  const cleanDesc = lowerDesc
    .replace(/^(a|an|the|with|of|featuring|showing|having|some|any)\s+/, '')
    .replace(/\s+(background|behind|falling|dropping)$/, '')
    .trim();
  
  console.log(`  Clean description: "${cleanDesc}"`);
  
  const enhancements = {
    'cloudy sky': 'a cloudy sky background with white fluffy clouds',
    'cloudy': 'a cloudy sky background with white fluffy clouds',
    'sky': 'a clear blue sky background with soft clouds'
  };
  
  // Check for direct matches first
  if (enhancements[cleanDesc]) {
    console.log(`  Direct match found: "${cleanDesc}" -> "${enhancements[cleanDesc]}"`);
    return enhancements[cleanDesc];
  }
  
  // Check for partial matches with common descriptors (prioritize longer matches)
  const sortedEnhancements = Object.entries(enhancements).sort((a, b) => b[0].length - a[0].length);
  
  for (const [key, value] of sortedEnhancements) {
    if (cleanDesc.includes(key) || key.includes(cleanDesc)) {
      console.log(`  Partial match found: "${key}" -> "${value}"`);
      return value;
    }
  }
  
  return `a ${cleanDesc} background scene`;
}

function extractBackgroundDescriptionEnhanced(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  
  console.log(`🔍 Enhanced background extraction from: "${instruction}"`);
  
  const backgroundPatterns = [
    /(?:make|turn)\s+(?:the\s+)?background\s+(?:into\s+|to\s+)?(.+)/i,
    /(?:change|modify|alter)\s+(?:the\s+)?background\s+(?:to\s+|into\s+)?(.+)/i,
    /(?:give|provide)\s+(?:it|him|her|them|the\s+\w+)\s+(?:a\s+|an\s+)?(.+)\s+background/i,
    /(?:set|create|establish|apply)\s+(?:a\s+|an\s+|the\s+)?(.+)\s+background/i,
    /(.+)\s+(?:falling\s+|dropping\s+)?behind\s+(?:him|her|it|them|the\s+\w+)/i,
    /(?:add|put|place)\s+(?:a\s+|an\s+|some\s+)?(.+)\s+(?:as\s+)?background/i,
    /(?:use|have|want)\s+(?:a\s+|an\s+|some\s+)?(.+)\s+background/i,
    /(?:put|place|add)\s+(.+)\s+in\s+the\s+background/i,
    /background\s+(?:of\s+|with\s+|featuring\s+|showing\s+)?(.+)/i,
    /with\s+(.+)\s+in\s+the\s+background/i,
    /against\s+(?:a\s+|an\s+)?(.+)\s+background/i,
    /(.+)\s+(?:in\s+the\s+)?(?:background|behind)/i,
    /background\s+(?:should\s+be\s+|is\s+|becomes\s+)(.+)/i,
    /on\s+(?:a\s+|an\s+)?(.+)\s+background/i,
    /over\s+(?:a\s+|an\s+)?(.+)\s+background/i,
    /(?:show|display|render)\s+(.+)\s+(?:in\s+the\s+)?background/i,
    /(?:include|add)\s+(.+)\s+(?:as\s+|for\s+)?(?:the\s+)?background/i
  ];
  
  // Try each pattern to extract background description
  for (let i = 0; i < backgroundPatterns.length; i++) {
    const pattern = backgroundPatterns[i];
    const match = instruction.match(pattern);
    if (match && match[1]) {
      const extractedDesc = match[1].trim();
      console.log(`  Pattern ${i + 1} matched: "${extractedDesc}"`);
      
      // Skip if extracted description is too generic or likely not a background
      if (isValidBackgroundDescription(extractedDesc)) {
        console.log(`  Valid background description: "${extractedDesc}"`);
        const enhancedDesc = enhanceBackgroundDescription(extractedDesc);
        console.log(`  Final enhanced: "${enhancedDesc}"`);
        return enhancedDesc;
      } else {
        console.log(`  Invalid background description: "${extractedDesc}"`);
      }
    }
  }
  
  console.log(`  No pattern matched, using fallback`);
  return 'a scenic background';
}

// Test the problematic case
console.log('Testing "background should be cloudy sky":');
const result = extractBackgroundDescriptionEnhanced('background should be cloudy sky');
console.log(`\nFinal result: "${result}"`);