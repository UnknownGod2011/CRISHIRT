/**
 * Multi-Edit Regression Test Suite
 * This script will create comprehensive tests and fixes for the multi-edit functionality
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';

// Comprehensive test cases
const testCases = [
  {
    name: "Priority Test 1",
    instruction: "add sunglasses and a cigar",
    expectedOperations: 2,
    expectedItems: ["sunglasses", "cigar"],
    description: "Simple conjunction - must extract both items"
  },
  {
    name: "Priority Test 2", 
    instruction: "make shirt red, change background to neon city, add a tattoo",
    expectedOperations: 3,
    expectedItems: ["shirt", "background", "tattoo"],
    description: "Complex multi-edit - all three changes must be applied"
  },
  {
    name: "Conjunction Test",
    instruction: "add hat and make teeth gold",
    expectedOperations: 2,
    expectedItems: ["hat", "teeth"],
    description: "Mixed operation types with conjunction"
  },
  {
    name: "Multiple Conjunctions",
    instruction: "add sunglasses, add a cigar, and make background forest",
    expectedOperations: 3,
    expectedItems: ["sunglasses", "cigar", "background"],
    description: "Multiple items with mixed conjunctions"
  },
  {
    name: "Action Inheritance",
    instruction: "put sunglasses on him and give him a cigar",
    expectedOperations: 2,
    expectedItems: ["sunglasses", "cigar"],
    description: "Different action words should both be recognized"
  }
];

/**
 * Test the current multi-edit functionality
 */
async function runRegressionTests() {
  console.log('🧪 Multi-Edit Regression Test Suite\n');
  console.log('=' .repeat(60));
  
  let passedTests = 0;
  let totalTests = testCases.length;
  const failedTests = [];
  
  for (const testCase of testCases) {
    console.log(`\n📝 ${testCase.name}: ${testCase.description}`);
    console.log(`   Input: "${testCase.instruction}"`);
    console.log(`   Expected: ${testCase.expectedOperations} operations`);
    
    try {
      // Test the parsing
      const response = await axios.post(`${BASE_URL}/api/test/multi-edit`, {
        instruction: testCase.instruction
      });
      
      const analysis = response.data.analysis;
      const directParseTest = response.data.analysis.direct_parse_test;
      
      console.log(`   Strategy: ${analysis.strategy}`);
      console.log(`   Operations detected: ${analysis.operations_detected}`);
      console.log(`   Direct parse test: ${directParseTest.operations_found} operations`);
      
      // Check if the test passes
      const actualOperations = Math.max(analysis.operations_detected, directParseTest.operations_found);
      
      if (actualOperations >= testCase.expectedOperations) {
        console.log(`   ✅ PASSED - Found ${actualOperations} operations`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED - Expected ${testCase.expectedOperations}, got ${actualOperations}`);
        failedTests.push({
          ...testCase,
          actualOperations,
          response: analysis
        });
      }
      
      // Show detailed operation breakdown
      if (directParseTest.operations && directParseTest.operations.length > 0) {
        console.log(`   Operations found:`);
        directParseTest.operations.forEach((op, index) => {
          console.log(`     ${index + 1}. ${op.type}: ${op.target || op.instruction}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failedTests.push({
        ...testCase,
        error: error.message
      });
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed (${(passedTests/totalTests*100).toFixed(1)}%)`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.instruction}`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      } else {
        console.log(`     Expected ${test.expectedOperations}, got ${test.actualOperations}`);
      }
    });
    
    console.log('\n🔧 Root Cause Analysis:');
    analyzeFailures(failedTests);
  }
  
  return { passedTests, totalTests, failedTests };
}

/**
 * Analyze failure patterns to identify root causes
 */
function analyzeFailures(failedTests) {
  const patterns = {
    conjunctionFailures: [],
    actionInheritanceFailures: [],
    commaFailures: [],
    strategyFailures: []
  };
  
  failedTests.forEach(test => {
    if (test.instruction.includes(' and ')) {
      patterns.conjunctionFailures.push(test);
    }
    if (test.instruction.includes(',')) {
      patterns.commaFailures.push(test);
    }
    if (test.response && test.response.strategy === 'structured_prompt' && test.expectedOperations > 1) {
      patterns.strategyFailures.push(test);
    }
  });
  
  if (patterns.conjunctionFailures.length > 0) {
    console.log(`   🔍 Conjunction parsing failures: ${patterns.conjunctionFailures.length} tests`);
    console.log(`      Issue: "and" conjunctions not being split properly`);
  }
  
  if (patterns.commaFailures.length > 0) {
    console.log(`   🔍 Comma parsing failures: ${patterns.commaFailures.length} tests`);
    console.log(`      Issue: Comma-separated operations not being detected`);
  }
  
  if (patterns.strategyFailures.length > 0) {
    console.log(`   🔍 Strategy selection failures: ${patterns.strategyFailures.length} tests`);
    console.log(`      Issue: Multi-edit instructions being treated as single operations`);
  }
}

/**
 * Test a complete multi-edit workflow
 */
async function testCompleteWorkflow() {
  console.log('\n🔄 Testing Complete Multi-Edit Workflow');
  console.log('=' .repeat(60));
  
  try {
    // Test the complete workflow endpoint
    const testCase = 'sunglasses_and_cigar';
    
    console.log(`📝 Running complete workflow test: ${testCase}`);
    
    const response = await axios.post(`${BASE_URL}/api/test/complete-multi-edit`, {
      testCase: testCase
    });
    
    if (response.data.success) {
      console.log('✅ Complete workflow test passed');
      console.log(`   Original image: ${response.data.original_image}`);
      console.log(`   Refined image: ${response.data.refined_image}`);
      console.log(`   Operations applied: ${response.data.operations_applied}`);
    } else {
      console.log('❌ Complete workflow test failed');
      console.log(`   Error: ${response.data.error}`);
    }
    
  } catch (error) {
    console.log(`❌ Workflow test error: ${error.message}`);
  }
}

/**
 * Generate fix recommendations
 */
function generateFixRecommendations(results) {
  console.log('\n🔧 Fix Recommendations:');
  console.log('=' .repeat(60));
  
  if (results.failedTests.length === 0) {
    console.log('✅ All tests passed! No fixes needed.');
    return;
  }
  
  console.log('1. 🎯 Priority Fix: Multi-Edit Parsing Logic');
  console.log('   - The parseMultipleOperationsEnhanced function needs to be fixed');
  console.log('   - Action inheritance for conjunctions is not working');
  console.log('   - "add sunglasses and a cigar" should extract 2 operations, not 1');
  
  console.log('\n2. 🔄 Strategy Selection Fix');
  console.log('   - analyzeRefinementInstruction should detect multi-edit patterns better');
  console.log('   - Instructions with conjunctions should use multi_step strategy');
  
  console.log('\n3. 🧪 Testing Infrastructure');
  console.log('   - Add comprehensive regression tests for multi-edit functionality');
  console.log('   - Test both parsing and complete workflow');
  
  console.log('\n4. 📊 Monitoring and Logging');
  console.log('   - Add better logging to track multi-edit parsing steps');
  console.log('   - Monitor success rates for multi-edit operations');
}

// Run the tests
async function main() {
  try {
    const results = await runRegressionTests();
    await testCompleteWorkflow();
    generateFixRecommendations(results);
    
    if (results.passedTests === results.totalTests) {
      console.log('\n🎉 All multi-edit functionality is working correctly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Multi-edit functionality needs fixes.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
    process.exit(1);
  }
}

main();