/**
 * Additional comprehensive test for background synonym understanding
 * Tests edge cases and additional patterns beyond Requirements 3.1-3.5
 */

// Import the enhanced function (copy from the main implementation)
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
  
  const objectPatterns = [
    /^(?:a\s+|an\s+)?(?:hat|sunglasses|cigar|necklace|earrings|teeth|eyes|nose|mouth)$/i,
    /^(?:gold|silver|red|blue|green|yellow|black|white)\s+(?:hat|sunglasses|cigar|necklace|earrings|teeth|eyes)$/i
  ];
  
  for (const pattern of objectPatterns) {
    if (pattern.test(lowerDesc)) {
      return false;
    }
  }
  
  return true;
}

function handleSpecialBackgroundCases(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  
  const specialPatterns = [
    { pattern: /make\s+(?:the\s+)?background\s+snowfall/i, result: 'a winter scene with gentle snowfall in the background' },
    { pattern: /change\s+(?:the\s+)?background\s+to\s+snowfall/i, result: 'a winter scene with gentle snowfall in the background' },
    { pattern: /give\s+it\s+(?:a\s+)?snowfall\s+background/i, result: 'a winter scene with gentle snowfall in the background' },
    { pattern: /set\s+(?:a\s+)?snowfall\s+background/i, result: 'a winter scene with gentle snowfall in the background' },
    { pattern: /snow\s+falling\s+behind\s+(?:him|her|it|them)/i, result: 'a winter scene with gentle snowfall in the background' },
    { pattern: /snowfall\s+background/i, result: 'a winter scene with gentle snowfall in the background' },
    { pattern: /background\s+(?:of\s+|with\s+)?snowfall/i, result: 'a winter scene with gentle snowfall in the background' },
    { pattern: /snowy\s+background/i, result: 'a winter scene with gentle snowfall in the background' },
    { pattern: /winter\s+background/i, result: 'a winter scene with gentle snowfall in the background' }
  ];
  
  for (const { pattern, result } of specialPatterns) {
    if (pattern.test(lowerInstruction)) {
      return result;
    }
  }
  
  return null;
}

function enhanceBackgroundDescription(description) {
  const lowerDesc = description.toLowerCase().trim();
  
  const cleanDesc = lowerDesc
    .replace(/^(a|an|the|with|of|featuring|showing|having|some|any)\s+/, '')
    .replace(/\s+(background|behind|falling|dropping)$/, '')
    .trim();
  
  const enhancements = {
    'snowfall': 'a winter scene with gentle snowfall in the background',
    'snow falling': 'a winter scene with gentle snowfall in the background',
    'snow': 'a winter scene with gentle snowfall in the background',
    'snowy': 'a winter scene with gentle snowfall in the background',
    'winter': 'a winter scene with gentle snowfall in the background',
    'sunset': 'a beautiful sunset background with warm orange and pink colors',
    'sunrise': 'a beautiful sunrise background with warm golden colors',
    'ocean': 'a serene ocean background with gentle waves and blue water',
    'sea': 'a serene ocean background with gentle waves and blue water',
    'mountains': 'a majestic mountain landscape background with peaks and valleys',
    'mountain': 'a majestic mountain landscape background with peaks and valleys',
    'forest': 'a natural forest background with tall trees and greenery',
    'trees': 'a natural forest background with tall trees and greenery',
    'city': 'an urban cityscape background',
    'urban': 'an urban cityscape background',
    'space': 'a cosmic space background with stars',
    'stars': 'a cosmic space background with stars',
    'clouds': 'a cloudy sky background',
    'sky': 'a clear blue sky background'
  };
  
  if (enhancements[cleanDesc]) {
    return enhancements[cleanDesc];
  }
  
  for (const [key, value] of Object.entries(enhancements)) {
    if (cleanDesc.includes(key) || key.includes(cleanDesc)) {
      return value;
    }
  }
  
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'gray', 'gold', 'silver'];
  
  for (const color of colors) {
    if (cleanDesc.includes(color)) {
      if (cleanDesc.includes('gradient')) {
        return `a smooth ${color} gradient background`;
      } else if (cleanDesc.includes('solid')) {
        return `a solid ${color} background`;
      } else {
        return `a ${color} background`;
      }
    }
  }
  
  if (cleanDesc.length > 0) {
    if (cleanDesc.includes('scene') || cleanDesc.includes('landscape') || cleanDesc.includes('view')) {
      return `a ${cleanDesc} background`;
    } else {
      return `a ${cleanDesc} background scene`;
    }
  }
  
  return 'a scenic background';
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
    /background\s+(?:should\s+be\s+|is\s+|becomes\s+)?(.+)/i,
    /on\s+(?:a\s+|an\s+)?(.+)\s+background/i,
    /over\s+(?:a\s+|an\s+)?(.+)\s+background/i,
    /(?:show|display|render)\s+(.+)\s+(?:in\s+the\s+)?background/i,
    /(?:include|add)\s+(.+)\s+(?:as\s+|for\s+)?(?:the\s+)?background/i
  ];
  
  for (let i = 0; i < backgroundPatterns.length; i++) {
    const pattern = backgroundPatterns[i];
    const match = instruction.match(pattern);
    if (match && match[1]) {
      const extractedDesc = match[1].trim();
      
      if (isValidBackgroundDescription(extractedDesc)) {
        const enhancedDesc = enhanceBackgroundDescription(extractedDesc);
        console.log(`   ✅ Pattern ${i + 1} matched: "${extractedDesc}" -> Enhanced: "${enhancedDesc}"`);
        return enhancedDesc;
      }
    }
  }
  
  const specialCases = handleSpecialBackgroundCases(instruction);
  if (specialCases) {
    console.log(`   ✅ Special case handled: "${specialCases}"`);
    return specialCases;
  }
  
  console.log(`   ⚠️  No pattern matched, using fallback`);
  return 'a scenic background';
}

// Additional comprehensive test cases
const ADDITIONAL_TEST_CASES = [
  // Different environmental backgrounds
  {
    instruction: 'create a sunset background',
    expectedPattern: 'sunset',
    description: 'Sunset background creation'
  },
  {
    instruction: 'put ocean waves in the background',
    expectedPattern: 'ocean',
    description: 'Ocean waves background'
  },
  {
    instruction: 'use a forest background',
    expectedPattern: 'forest',
    description: 'Forest background usage'
  },
  {
    instruction: 'mountains behind the character',
    expectedPattern: 'mountain',
    description: 'Mountains behind character'
  },
  {
    instruction: 'add a city skyline background',
    expectedPattern: 'city',
    description: 'City skyline background'
  },
  {
    instruction: 'place stars in the background',
    expectedPattern: 'stars',
    description: 'Stars in background'
  },
  {
    instruction: 'background should be cloudy sky',
    expectedPattern: 'cloudy',
    description: 'Cloudy sky background'
  },
  {
    instruction: 'on a blue gradient background',
    expectedPattern: 'blue gradient',
    description: 'Blue gradient background'
  },
  
  // Edge cases that should NOT be recognized as background operations
  {
    instruction: 'add sunglasses and a hat',
    expectedPattern: null,
    description: 'Non-background instruction (should not match)',
    shouldNotMatch: true
  },
  {
    instruction: 'make his teeth gold',
    expectedPattern: null,
    description: 'Color change instruction (should not match)',
    shouldNotMatch: true
  },
  {
    instruction: 'give him a cigar',
    expectedPattern: null,
    description: 'Object addition instruction (should not match)',
    shouldNotMatch: true
  }
];

function runAdditionalTests() {
  console.log('\n=== Additional Background Synonym Understanding Tests ===');
  console.log('Testing comprehensive patterns and edge cases\n');
  
  let passedTests = 0;
  let totalTests = ADDITIONAL_TEST_CASES.length;
  
  for (const testCase of ADDITIONAL_TEST_CASES) {
    console.log(`Testing: ${testCase.description}`);
    console.log(`Instruction: "${testCase.instruction}"`);
    
    try {
      const extractedDescription = extractBackgroundDescriptionEnhanced(testCase.instruction);
      
      if (testCase.shouldNotMatch) {
        // For cases that should NOT match background patterns
        const isGenericFallback = extractedDescription === 'a scenic background';
        if (isGenericFallback) {
          console.log(`  ✅ PASSED: Correctly did not match background pattern (fallback: "${extractedDescription}")`);
          passedTests++;
        } else {
          console.log(`  ❌ FAILED: Should not have matched background pattern`);
          console.log(`     Got: "${extractedDescription}"`);
        }
      } else {
        // For cases that should match background patterns
        const isCorrect = testCase.expectedPattern ? 
          extractedDescription.toLowerCase().includes(testCase.expectedPattern.toLowerCase()) :
          extractedDescription !== 'a scenic background';
        
        if (isCorrect) {
          console.log(`  ✅ PASSED: Extracted "${extractedDescription}"`);
          passedTests++;
        } else {
          console.log(`  ❌ FAILED: Expected pattern "${testCase.expectedPattern}"`);
          console.log(`     Got: "${extractedDescription}"`);
        }
      }
    } catch (error) {
      console.log(`  ❌ FAILED: Error - ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('=== Additional Test Summary ===');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All additional background synonym understanding tests PASSED!');
  } else {
    console.log('⚠️  Some additional tests failed. Review the implementation.');
  }
  
  return {
    totalTests,
    passedTests,
    successRate: (passedTests / totalTests) * 100
  };
}

// Run the additional tests
runAdditionalTests();