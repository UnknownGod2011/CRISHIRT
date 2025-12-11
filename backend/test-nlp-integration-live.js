/**
 * Live Integration Test for Enhanced NLP Parsing
 * Tests the actual parseInstructionAdvanced function in the backend
 */

import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔥 Live NLP Integration Test");
console.log("============================");

// Test the actual parseInstructionAdvanced function by making HTTP requests
const testInstructions = [
  "add a hat",
  "give him golden teeth", 
  "make the background a forest",
  "add blood to his nose and make his teeth gold",
  "put a cigar in his mouth",
  "remove the hat",
  "turn his eyes red",
  "change the background to a snowy mountain",
  "add a crack to his skull and make his eyes glow",
  "give him a rusty sword and put him in a dark cave"
];

async function testNLPIntegration() {
  console.log("🧪 Testing Enhanced NLP Integration with Live Backend");
  console.log("====================================================");
  
  let passedTests = 0;
  let totalTests = testInstructions.length;
  
  for (let i = 0; i < testInstructions.length; i++) {
    const instruction = testInstructions[i];
    console.log(`\nTest ${i + 1}: "${instruction}"`);
    
    try {
      // Make request to the debug parse-instruction endpoint
      const response = await fetch('http://localhost:5001/api/debug/parse-instruction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instruction })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`✅ Response received:`);
      console.log(`   - Modifications: ${result.parsed.modifications.length}`);
      console.log(`   - Complexity: ${result.parsed.complexity}`);
      console.log(`   - NLP Confidence: ${result.parsed.nlp_confidence}`);
      console.log(`   - Normalized: "${result.parsed.normalized_form}"`);
      console.log(`   - Strategy: ${result.recommended_strategy}`);
      
      if (result.parsed.modifications.length > 0) {
        console.log(`   - First modification:`, {
          type: result.parsed.modifications[0].type,
          source: result.parsed.modifications[0].source,
          confidence: result.parsed.modifications[0].confidence
        });
      }
      
      // Basic validation
      if (result.success && result.parsed.modifications.length > 0) {
        console.log(`✅ Test ${i + 1} PASSED`);
        passedTests++;
      } else {
        console.log(`❌ Test ${i + 1} FAILED - No modifications detected`);
      }
      
    } catch (error) {
      console.log(`❌ Test ${i + 1} ERROR:`, error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Live Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All live tests passed! Enhanced NLP integration is working perfectly.");
  } else if (passedTests > totalTests * 0.8) {
    console.log("✅ Most tests passed! Enhanced NLP integration is working well.");
  } else {
    console.log("⚠️  Many tests failed. Check backend server and implementation.");
  }
}

// Check if backend is running first
async function checkBackendStatus() {
  try {
    const response = await fetch('http://localhost:5001/api/health');
    if (response.ok) {
      console.log("✅ Backend server is running");
      return true;
    }
  } catch (error) {
    console.log("❌ Backend server is not running or not accessible");
    console.log("   Please start the backend server with: npm start");
    return false;
  }
}

// Run the test
async function runTest() {
  const backendRunning = await checkBackendStatus();
  
  if (backendRunning) {
    await testNLPIntegration();
  } else {
    console.log("\n🔧 To run this test:");
    console.log("1. Start the backend server: cd project/backend && npm start");
    console.log("2. Run this test again: node test-nlp-integration-live.js");
  }
  
  console.log("\n✅ Live NLP Integration Test Complete");
}

runTest().catch(console.error);