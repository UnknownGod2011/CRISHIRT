/**
 * Complete end-to-end test of the multi-edit system
 */

import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:5001';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Multi-Edit Flow...\n');
  
  try {
    // Step 1: Generate a base image
    console.log('📝 Step 1: Generating base skull character...');
    
    const generateResponse = await axios.post(`${BASE_URL}/api/generate`, {
      prompt: "a skull character"
    });
    
    if (!generateResponse.data.success) {
      throw new Error(`Generation failed: ${generateResponse.data.error?.message}`);
    }
    
    const imageUrl = generateResponse.data.imageUrl;
    console.log(`✅ Base image generated: ${imageUrl}`);
    
    // Wait for image to be fully processed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Test the multi-edit parsing first
    console.log('\n📝 Step 2: Testing multi-edit parsing...');
    
    const parseResponse = await axios.post(`${BASE_URL}/api/test/multi-edit`, {
      instruction: "add sunglasses and a cigar"
    });
    
    console.log('✅ Multi-edit parsing result:');
    console.log(`   - Strategy: ${parseResponse.data.analysis.strategy}`);
    console.log(`   - Operations: ${parseResponse.data.analysis.operations.length}`);
    
    parseResponse.data.analysis.operations.forEach((op, i) => {
      console.log(`     ${i + 1}. ${op.type}: "${op.instruction}" (target: ${op.target})`);
    });
    
    if (parseResponse.data.testPrompt) {
      console.log(`   - Test prompt created with ${parseResponse.data.testPrompt.objectCount} objects:`);
      parseResponse.data.testPrompt.objects.forEach((obj, i) => {
        console.log(`     ${i + 1}. ${obj.substring(0, 80)}...`);
      });
    }
    
    // Step 3: Perform actual refinement
    console.log('\n📝 Step 3: Performing actual multi-edit refinement...');
    
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
    console.log(`   - Supports localized editing: ${refineResponse.data.debug?.supports_localized_editing}`);
    
    // Step 4: Test another multi-edit on the refined image
    console.log('\n📝 Step 4: Testing second multi-edit refinement...');
    
    const refineResponse2 = await axios.post(`${BASE_URL}/api/refine`, {
      instruction: "make the teeth gold and add a hat",
      imageUrl: refineResponse.data.refinedImageUrl
    });
    
    if (!refineResponse2.data.success) {
      console.warn(`⚠️  Second refinement failed: ${refineResponse2.data.error?.message}`);
    } else {
      console.log('✅ Second multi-edit refinement successful:');
      console.log(`   - Final image: ${refineResponse2.data.refinedImageUrl}`);
      console.log(`   - Edit type: ${refineResponse2.data.editType}`);
      console.log(`   - Operations count: ${refineResponse2.data.debug?.operations_count}`);
    }
    
    console.log('\n🎯 Complete multi-edit flow test successful!');
    console.log('\n📊 Summary:');
    console.log(`   - Base image: ${imageUrl}`);
    console.log(`   - First refinement: ${refineResponse.data.refinedImageUrl}`);
    if (refineResponse2.data.success) {
      console.log(`   - Second refinement: ${refineResponse2.data.refinedImageUrl}`);
    }
    
    // Step 5: Save test results
    const testResults = {
      timestamp: new Date().toISOString(),
      baseImage: imageUrl,
      firstRefinement: {
        instruction: "add sunglasses and a cigar",
        result: refineResponse.data.refinedImageUrl,
        editType: refineResponse.data.editType,
        operationsCount: refineResponse.data.debug?.operations_count
      },
      secondRefinement: refineResponse2.data.success ? {
        instruction: "make the teeth gold and add a hat",
        result: refineResponse2.data.refinedImageUrl,
        editType: refineResponse2.data.editType,
        operationsCount: refineResponse2.data.debug?.operations_count
      } : null,
      parsing: {
        strategy: parseResponse.data.analysis.strategy,
        operations: parseResponse.data.analysis.operations,
        testPromptObjects: parseResponse.data.testPrompt?.objectCount || 0
      }
    };
    
    fs.writeFileSync('test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\n💾 Test results saved to test-results.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testCompleteFlow()
  .then(() => {
    console.log('\n✅ Complete flow test finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });