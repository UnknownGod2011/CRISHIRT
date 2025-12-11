/**
 * Test the complete refinement flow to identify where multi-edit breaks
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';

async function testFullRefinementFlow() {
  console.log('🧪 Testing Full Refinement Flow...\n');
  
  try {
    // Step 1: Generate a base image first
    console.log('📝 Step 1: Generating base image...');
    
    const generateResponse = await axios.post(`${BASE_URL}/api/generate`, {
      prompt: "a skull character"
    });
    
    if (!generateResponse.data.success) {
      throw new Error(`Generation failed: ${generateResponse.data.error?.message}`);
    }
    
    const imageUrl = generateResponse.data.imageUrl;
    console.log(`✅ Base image generated: ${imageUrl}`);
    
    // Wait a moment for the image to be fully processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Test multi-edit refinement
    console.log('\n📝 Step 2: Testing multi-edit refinement...');
    
    const refineResponse = await axios.post(`${BASE_URL}/api/refine`, {
      instruction: "add sunglasses and a cigar",
      imageUrl: imageUrl
    });
    
    if (!refineResponse.data.success) {
      throw new Error(`Refinement failed: ${refineResponse.data.error?.message}`);
    }
    
    console.log('✅ Multi-edit refinement successful:');
    console.log(`   - Refined image: ${refineResponse.data.refinedImageUrl}`);
    console.log(`   - Edit type: ${refineResponse.data.editType}`);
    console.log(`   - Method used: ${refineResponse.data.debug?.method_used}`);
    console.log(`   - Operations count: ${refineResponse.data.debug?.operations_count}`);
    
    console.log('\n🎯 Full refinement flow is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testFullRefinementFlow()
  .then(() => {
    console.log('\n✅ Full refinement flow test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });