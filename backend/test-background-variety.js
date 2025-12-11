#!/usr/bin/env node

/**
 * Test script to verify background extraction works for all types of backgrounds
 * Testing the specific examples mentioned by the user
 */

// Copy the current extractBackgroundDescriptionEnhanced function for testing
function extractBackgroundDescriptionEnhanced(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  
  console.log(`🔍 Enhanced background extraction from: "${instruction}"`);
  
  // Comprehensive pattern matching for all background modification patterns
  const backgroundPatterns = [
    // Direct background modification patterns
    /(?:make|turn)\s+(?:the\s+)?background\s+(?:into\s+|to\s+)?(.+)/i,
    /(?:change|modify|alter)\s+(?:the\s+)?background\s+(?:to\s+|into\s+)?(.+)/i,
    /(?:give|provide)\s+(?:it|him|her|them|the\s+\w+)\s+(?:a\s+|an\s+)?(.+)\s+background/i,
    /(?:set|create|establish|apply)\s+(?:a\s+|an\s+|the\s+)?(.+)\s+background/i,
    /(.+)\s+(?:falling\s+|dropping\s+)?behind\s+(?:him|her|it|them|the\s+\w+)/i,
    
    // Additional comprehensive patterns
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
    /(?:include|add)\s+(.+)\s+(?:as\s+|for\s+)?(?:the\s+)?background/i,
    
    // Theme-specific patterns
    /(.+)\s+theme$/i,
    /(?:make\s+it\s+|set\s+to\s+|change\s+to\s+)?(.+)\s+theme/i
  ];
  
  // Try each pattern to extract background description
  for (let i = 0; i < backgroundPatterns.length; i++) {
    const pattern = backgroundPatterns[i];
    const match = instruction.match(pattern);
    if (match && match[1]) {
      const extractedDesc = match[1].trim();
      
      // Skip if extracted description is too generic or likely not a background
      if (isValidBackgroundDescription(extractedDesc)) {
        const enhancedDesc = enhanceBackgroundDescription(extractedDesc);
        console.log(`   ✅ Pattern ${i + 1} matched: "${extractedDesc}" -> Enhanced: "${enhancedDesc}"`);
        return enhancedDesc;
      }
    }
  }
  
  // Fallback - return a generic background description
  console.log(`   ⚠️  No pattern matched, using fallback`);
  return 'custom background';
}

function isValidBackgroundDescription(description) {
  const lowerDesc = description.toLowerCase().trim();
  
  // Skip very short descriptions that are likely false positives
  if (lowerDesc.length < 2) {
    return false;
  }
  
  // Skip common non-background words that might be captured
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
  
  // Remove common articles, prepositions, and redundant words
  const cleanDesc = lowerDesc
    .replace(/^(a|an|the|with|of|featuring|showing|having|some|any)\s+/, '')
    .replace(/\s+background$/, '')
    .replace(/\s+theme$/, '')
    .trim();
  
  // Return the cleaned description
  return cleanDesc;
}

// Test cases based on user's examples
const testCases = [
  // User's specific examples
  { instruction: 'change the background to Christmas trees', expected: 'Christmas trees' },
  { instruction: 'neon city theme', expected: 'neon city' },
  { instruction: 'forest theme', expected: 'forest' },
  { instruction: 'ocean theme', expected: 'ocean' },
  
  // Additional variations to test robustness
  { instruction: 'make the background Christmas trees', expected: 'Christmas trees' },
  { instruction: 'set a neon city background', expected: 'neon city' },
  { instruction: 'give it a forest background', expected: 'forest' },
  { instruction: 'change background to ocean waves', expected: 'ocean waves' },
  { instruction: 'mountain landscape theme', expected: 'mountain landscape' },
  { instruction: 'desert sunset background', expected: 'desert sunset' },
  { instruction: 'cyberpunk city theme', expected: 'cyberpunk city' },
  { instruction: 'tropical beach background', expected: 'tropical beach' },
  { instruction: 'space galaxy theme', expected: 'space galaxy' },
  { instruction: 'autumn leaves background', expected: 'autumn leaves' },
  
  // Edge cases
  { instruction: 'make it steampunk theme', expected: 'steampunk' },
  { instruction: 'background should be volcanic landscape', expected: 'volcanic landscape' },
  { instruction: 'put a medieval castle in the background', expected: 'medieval castle' },
  { instruction: 'use underwater coral reef background', expected: 'underwater coral reef' }
];

function runBackgroundVarietyTests() {
  console.log('🧪 Testing Background Extraction for Various Themes and Descriptions');
  console.log('='.repeat(70));
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase.instruction}"`);
    console.log(`   Expected: "${testCase.expected}"`);
    
    try {
      const result = extractBackgroundDescriptionEnhanced(testCase.instruction);
      console.log(`   Got: "${result}"`);
      
      // Check if the result contains the expected content (flexible matching)
      const resultLower = result.toLowerCase();
      const expectedLower = testCase.expected.toLowerCase();
      
      const isMatch = resultLower.includes(expectedLower) || 
                     expectedLower.includes(resultLower) ||
                     result === testCase.expected;
      
      if (isMatch) {
        console.log(`   ✅ PASSED`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED - Expected "${testCase.expected}" but got "${result}"`);
        failedTests++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! The background extraction works for all theme types.');
  } else {
    console.log('\n⚠️  Some tests failed. The extraction logic may need improvements.');
  }
  
  return { passed: passedTests, failed: failedTests };
}

// Run the tests
runBackgroundVarietyTests();