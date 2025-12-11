/**
 * Test script for Enhanced Background Synonym Understanding
 * Tests Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * 
 * This test validates that the extractBackgroundDescriptionEnhanced function
 * correctly recognizes all background modification patterns mentioned in the requirements.
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';

/**
 * Test cases based on Requirements 3.1-3.5
 */
const TEST_CASES = [
  // Requirement 3.1: "make the background snowfall"
  {
    requirement: '3.1',
    instruction: 'make the background snowfall',
    expectedPattern: 'snowfall',
    expectedResult: 'a winter scene with gentle snowfall in the background'
  },
  
  // Requirement 3.2: "change the background to snowfall"
  {
    requirement: '3.2',
    instruction: 'change the background to snowfall',
    expectedPattern: 'snowfall',
    expectedResult: 'a winter scene with gentle snowfall in the background'
  },
  
  // Requirement 3.3: "give it a snowfall background"
  {
    requirement: '3.3',
    instruction: 'give it a snowfall background',
    expectedPattern: 'snowfall',
    expectedResult: 'a winter scene with gentle snowfall in the background'
  },
  
  // Requirement 3.4: "set a snowfall background"
  {
    requirement: '3.4',
    instruction: 'set a snowfall background',
    expectedPattern: 'snowfall',
    expectedResult: 'a winter scene with gentle snowfall in the background'
  },
  
  // Requirement 3.5: "snow falling behind him/her"
  {
    requirement: '3.5',
    instruction: 'snow falling behind him',
    expectedPattern: 'snow falling',
    expectedResult: 'a winter scene with gentle snowfall in the background'
  },
  {
    requirement: '3.5',
    instruction: 'snow falling behind her',
    expectedPattern: 'snow falling',
    expectedResult: 'a winter scene with gentle snowfall in the background'
  },
  
  // Additional comprehensive test cases for better coverage
  {
    requirement: 'Additional',
    instruction: 'create a sunset background',
    expectedPattern: 'sunset',
    expectedResult: 'a beautiful sunset background with warm orange and pink colors'
  },
  {
    requirement: 'Additional',
    instruction: 'put ocean waves in the background',
    expectedPattern: 'ocean waves',
    expectedResult: 'a serene ocean background with gentle waves and blue water'
  },
  {
    requirement: 'Additional',
    instruction: 'use a forest background',
    expectedPattern: 'forest',
    expectedResult: 'a natural forest background with tall trees and greenery'
  },
  {
    requirement: 'Additional',
    instruction: 'mountains behind the character',
    expectedPattern: 'mountains',
    expectedResult: 'a majestic mountain landscape background with peaks and valleys'
  }
];

/**
 * Test the background synonym understanding by calling the backend
 */
async function testBackgroundSynonymUnderstanding() {
  console.log('\n=== Testing Enhanced Background Synonym Understanding ===');
  console.log('Testing Requirements 3.1, 3.2, 3.3, 3.4, 3.5\n');
  
  const results = [];
  let passedTests = 0;
  let totalTests = TEST_CASES.length;
  
  for (const testCase of TEST_CASES) {
    console.log(`Testing Requirement ${testCase.requirement}: "${testCase.instruction}"`);
    
    try {
      // Create a test endpoint call to extract background description
      const response = await axios.post(`${BASE_URL}/api/test/background-extraction`, {
        instruction: testCase.instruction
      });
      
      if (response.data.success) {
        const extractedDescription = response.data.backgroundDescription;
        const isCorrect = extractedDescription.toLowerCase().includes(testCase.expectedPattern.toLowerCase()) ||
                         extractedDescription === testCase.expectedResult;
        
        if (isCorrect) {
          console.log(`  ✅ PASSED: Extracted "${extractedDescription}"`);
          passedTests++;
        } else {
          console.log(`  ❌ FAILED: Expected pattern "${testCase.expectedPattern}" or result "${testCase.expectedResult}"`);
          console.log(`     Got: "${extractedDescription}"`);
        }
        
        results.push({
          requirement: testCase.requirement,
          instruction: testCase.instruction,
          expected: testCase.expectedResult,
          actual: extractedDescription,
          passed: isCorrect
        });
      } else {
        console.log(`  ❌ FAILED: API call failed - ${response.data.error?.message}`);
        results.push({
          requirement: testCase.requirement,
          instruction: testCase.instruction,
          expected: testCase.expectedResult,
          actual: 'API_ERROR',
          passed: false
        });
      }
    } catch (error) {
      console.log(`  ❌ FAILED: Network error - ${error.message}`);
      results.push({
        requirement: testCase.requirement,
        instruction: testCase.instruction,
        expected: testCase.expectedResult,
        actual: 'NETWORK_ERROR',
        passed: false
      });
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('=== Test Summary ===');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All background synonym understanding tests PASSED!');
  } else {
    console.log('⚠️  Some tests failed. Review the implementation.');
  }
  
  return {
    totalTests,
    passedTests,
    successRate: (passedTests / totalTests) * 100,
    results
  };
}

/**
 * Test specific requirement examples
 */
async function testSpecificRequirements() {
  console.log('\n=== Testing Specific Requirement Examples ===');
  
  const specificTests = [
    {
      name: 'Requirement 3.1 - make the background snowfall',
      instruction: 'make the background snowfall',
      shouldRecognize: true
    },
    {
      name: 'Requirement 3.2 - change the background to snowfall',
      instruction: 'change the background to snowfall',
      shouldRecognize: true
    },
    {
      name: 'Requirement 3.3 - give it a snowfall background',
      instruction: 'give it a snowfall background',
      shouldRecognize: true
    },
    {
      name: 'Requirement 3.4 - set a snowfall background',
      instruction: 'set a snowfall background',
      shouldRecognize: true
    },
    {
      name: 'Requirement 3.5 - snow falling behind him',
      instruction: 'snow falling behind him',
      shouldRecognize: true
    },
    {
      name: 'Non-background instruction (should not be recognized)',
      instruction: 'add sunglasses and a hat',
      shouldRecognize: false
    }
  ];
  
  for (const test of specificTests) {
    console.log(`Testing: ${test.name}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/test/background-detection`, {
        instruction: test.instruction
      });
      
      if (response.data.success) {
        const isBackgroundOperation = response.data.isBackgroundOperation;
        const passed = isBackgroundOperation === test.shouldRecognize;
        
        console.log(`  ${passed ? '✅' : '❌'} ${passed ? 'PASSED' : 'FAILED'}: Background operation detected: ${isBackgroundOperation}`);
        
        if (isBackgroundOperation && response.data.backgroundDescription) {
          console.log(`     Background description: "${response.data.backgroundDescription}"`);
        }
      } else {
        console.log(`  ❌ FAILED: API call failed`);
      }
    } catch (error) {
      console.log(`  ❌ FAILED: Network error - ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * Run all background synonym understanding tests
 */
async function runAllBackgroundSynonymTests() {
  console.log('🧪 Starting Background Synonym Understanding Tests');
  console.log('=' .repeat(60));
  
  try {
    const mainResults = await testBackgroundSynonymUnderstanding();
    await testSpecificRequirements();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Background Synonym Understanding Tests Complete');
    
    return mainResults;
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    return null;
  }
}

// Export for use in other test files
export { 
  runAllBackgroundSynonymTests, 
  testBackgroundSynonymUnderstanding, 
  testSpecificRequirements,
  TEST_CASES 
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBackgroundSynonymTests();
}