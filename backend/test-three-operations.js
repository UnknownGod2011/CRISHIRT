/**
 * Test 3 operations at once
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';

async function testThreeOperations() {
  console.log('🧪 Testing 3 Operations at Once...\n');
  
  try {
    // Test 1: Parse 3 operations
    console.log('📝 Test 1: Parsing "add sunglasses, a cigar, and a hat"');
    
    const parseResponse = await axios.post(`${BASE_URL}/api/test/multi-edit`, {
      instruction: "add sunglasses, a cigar, and a hat"
    });
    
    console.log('✅ Parsing result:');
    console.log(`   - Strategy: ${parseResponse.data.analysis.strategy}`);
    console.log(`   - Operations detected: ${parseResponse.data.analysis.operations.length}`);
    
    parseResponse.data.analysis.operations.forEach((op, i) => {
      console.log(`     ${i + 1}. ${op.type}: "${op.instruction}" (target: ${op.target})`);
    });
    
    // Test 2: Parse different 3 operations
    console.log('\n📝 Test 2: Parsing "make teeth gold, add sunglasses, change background to forest"');
    
    const parseResponse2 = await axios.post(`${BASE_URL}/api/test/multi-edit`, {
      instruction: "make teeth gold, add sunglasses, change background to forest"
    });
    
    console.log('✅ Parsing result:');
    console.log(`   - Strategy: ${parseResponse2.data.analysis.strategy}`);
    console.log(`   - Operations detected: ${parseResponse2.data.analysis.operations.length}`);
    
    parseResponse2.data.analysis.operations.forEach((op, i) => {
      console.log(`     ${i + 1}. ${op.type}: "${op.instruction}" (target: ${op.target})`);
    });
    
    // Test 3: Actually execute 3 operations
    console.log('\n📝 Test 3: Generating base image and applying 3 operations...');
    
    const generateResponse = await axios.post(`${BASE_URL}/api/generate`, {
      prompt: "a skull character"
    });
    
    if (!generateResponse.data.success) {
      throw new Error(`Generation failed: ${generateResponse.data.error?.message}`);
    }
    
    const imageUrl = generateResponse.data.imageUrl;
    console.log(`✅ Base image generated: ${imageUrl}`);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Apply 3 operations
    const refineResponse = await axios.post(`${BASE_URL}/api/refine`, {
      instruction: "add sunglasses, a cigar, and a hat",
      imageUrl: imageUrl
    });
    
    if (!refineResponse.data.success) {
      throw new Error(`Refinement failed: ${refineResponse.data.error?.message}`);
    }
    
    console.log('✅ 3-operation refinement successful:');
    console.log(`   - Refined image: ${refineResponse.data.refinedImageUrl}`);
    console.log(`   - Edit type: ${refineResponse.data.editType}`);
    console.log(`   - Operations count: ${refineResponse.data.debug?.operations_count}`);
    
    console.log('\n🎯 3-operation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testThreeOperations()
  .then(() => {
    console.log('\n✅ Three operations test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });