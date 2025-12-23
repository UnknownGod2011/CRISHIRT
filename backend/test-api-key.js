// Test script to verify BRIA API key
import axios from 'axios';

const BRIA_API_TOKEN = '0ac5dbf89480470984bb7e7a9199fe60';
const BRIA_BASE_URL = 'https://engine.prod.bria-api.com/v2';

async function testAPIKey() {
  try {
    console.log('🔑 Testing BRIA API key...');
    
    // Test with a simple generation request
    const response = await axios.post(`${BRIA_BASE_URL}/image/generate`, {
      prompt: 'simple test design',
      sync: false
    }, {
      headers: {
        'api_token': BRIA_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Key is valid!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ API Key test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      console.error('🚨 403 Forbidden - API key is invalid or expired');
    } else if (error.response?.status === 401) {
      console.error('🚨 401 Unauthorized - API key format is wrong');
    }
  }
}

testAPIKey();