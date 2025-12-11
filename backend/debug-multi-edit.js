/**
 * Debug script for multi-edit functionality
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';

async function testMultiEdit() {
  console.log('🧪 Testing Multi-Edit Functionality...\n');
  
  try {
    // Test 1: Simple multi-edit detection
    console.log('📝 Test 1: Multi-edit detection for "add sunglasses and a cigar"');
    
    const response1 = await axios.post(`${BASE_URL}/api/test/multi-edit`, {
      instruction: "add sunglasses and a cigar"
    });
    
    console.log('Response:', JSON.stringify(response1.data, null, 2));
    
    // Test 2: Complex multi-edit
    console.log('\n📝 Test 2: Complex multi-edit for "make shirt red, change background to neon city, add a tattoo"');
    
    const response2 = await axios.post(`${BASE_URL}/api/test/multi-edit`, {
      instruction: "make shirt red, change background to neon city, add a tattoo"
    });
    
    console.log('Response:', JSON.stringify(response2.data, null, 2));
    
    // Test 3: Check if operations are being parsed correctly
    console.log('\n📝 Test 3: Checking operation parsing...');
    
    const testInstructions = [
      "add sunglasses and a cigar",
      "make shirt red and add hat",
      "change background to forest, add sunglasses, make teeth gold"
    ];
    
    for (const instruction of testInstructions) {
      console.log(`\n   Testing: "${instruction}"`);
      
      try {
        const response = await axios.post(`${BASE_URL}/api/test/multi-edit`, {
          instruction: instruction
        });
        
        const analysis = response.data.analysis;
        console.log(`   Strategy: ${analysis.strategy}`);
        console.log(`   Operations found: ${analysis.operations ? analysis.operations.length : 0}`);
        
        if (analysis.operations) {
          analysis.operations.forEach((op, index) => {
            console.log(`     ${index + 1}. ${op.type}: ${op.instruction || op.item || 'unknown'}`);
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testMultiEdit()
  .then(() => {
    console.log('\n✅ Multi-edit debug test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });