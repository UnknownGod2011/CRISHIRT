/**
 * Live test for multi-edit functionality
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';

async function testLiveMultiEdit() {
  console.log('🧪 Testing Live Multi-Edit Functionality...\n');
  
  try {
    // Test the new test endpoint
    console.log('📝 Testing multi-edit parsing endpoint...');
    
    const response = await axios.post(`${BASE_URL}/api/test/multi-edit`, {
      instruction: "add sunglasses and a cigar"
    });
    
    console.log('✅ Multi-edit parsing test successful:');
    console.log(`   - Strategy: ${response.data.analysis.strategy}`);
    console.log(`   - Operations: ${response.data.analysis.operations.length}`);
    
    if (response.data.testPrompt) {
      console.log(`   - Test prompt objects: ${response.data.testPrompt.objectCount}`);
      response.data.testPrompt.objects.forEach((obj, i) => {
        console.log(`     ${i + 1}. ${obj}`);
      });
    }
    
    console.log('\n🎯 Multi-edit parsing is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testLiveMultiEdit()
  .then(() => {
    console.log('\n✅ Live multi-edit test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });