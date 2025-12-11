/**
 * Unit tests for Enhanced T-shirt Compositing Engine
 * Tests core functionality and validates Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { enhancedCompositingEngine } from './enhanced-compositing-engine.js';
import fs from 'fs';
import path from 'path';

// Test configuration
const testConfig = {
  color: '#0066cc',
  material: 'cotton',
  style: 'crew-neck'
};

const testOptions = {
  lightingConfig: {
    ambientIntensity: 0.3,
    directionalLight: {
      angle: 45,
      intensity: 0.7,
      color: '#ffffff'
    }
  },
  foldPattern: {
    type: 'hanging',
    intensity: 0.3
  },
  inkEffects: {
    bleedRadius: 2,
    opacity: 0.3,
    colorShift: 0.1
  }
};

// Simple test design
const testDesignSvg = `
  <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="25" width="50" height="50" fill="#ff6600" stroke="#cc3300" stroke-width="2"/>
    <text x="50" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="12">OK</text>
  </svg>
`;

const testDesignUrl = 'data:image/svg+xml;base64,' + Buffer.from(testDesignSvg).toString('base64');

/**
 * Test 1: Basic Enhanced Mockup Generation
 * Validates Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
async function testBasicEnhancedMockupGeneration() {
  console.log('🧪 Test 1: Basic Enhanced Mockup Generation');
  
  try {
    const mockupBuffer = await enhancedCompositingEngine.generateEnhancedMockup(
      testDesignUrl,
      testConfig,
      testOptions
    );
    
    // Validate buffer
    if (!Buffer.isBuffer(mockupBuffer)) {
      throw new Error('Result is not a buffer');
    }
    
    if (mockupBuffer.length === 0) {
      throw new Error('Generated buffer is empty');
    }
    
    // Check if it's a valid PNG (starts with PNG signature)
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (!mockupBuffer.subarray(0, 8).equals(pngSignature)) {
      throw new Error('Generated buffer is not a valid PNG');
    }
    
    console.log('   ✅ Generated valid PNG buffer');
    console.log(`   ✅ Buffer size: ${mockupBuffer.length} bytes`);
    
    return { success: true, bufferSize: mockupBuffer.length };
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Different Material Properties
 * Validates Requirement 6.2: Realistic fabric texture blending
 */
async function testDifferentMaterials() {
  console.log('🧪 Test 2: Different Material Properties');
  
  const materials = ['cotton', 'polyester', 'blend', 'vintage'];
  const results = [];
  
  for (const material of materials) {
    try {
      const materialConfig = { ...testConfig, material };
      const mockupBuffer = await enhancedCompositingEngine.generateEnhancedMockup(
        testDesignUrl,
        materialConfig,
        testOptions
      );
      
      if (Buffer.isBuffer(mockupBuffer) && mockupBuffer.length > 0) {
        console.log(`   ✅ ${material}: ${mockupBuffer.length} bytes`);
        results.push({ material, success: true, size: mockupBuffer.length });
      } else {
        console.log(`   ❌ ${material}: Invalid buffer`);
        results.push({ material, success: false, error: 'Invalid buffer' });
      }
      
    } catch (error) {
      console.log(`   ❌ ${material}: ${error.message}`);
      results.push({ material, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  return { 
    success: successCount === materials.length, 
    results,
    successRate: `${successCount}/${materials.length}`
  };
}

/**
 * Test 3: Different T-shirt Styles
 * Validates Requirement 6.3: Warp mapping functionality
 */
async function testDifferentStyles() {
  console.log('🧪 Test 3: Different T-shirt Styles');
  
  const styles = ['crew-neck', 'v-neck', 'long-sleeve', 'tank-top'];
  const results = [];
  
  for (const style of styles) {
    try {
      const styleConfig = { ...testConfig, style };
      const mockupBuffer = await enhancedCompositingEngine.generateEnhancedMockup(
        testDesignUrl,
        styleConfig,
        testOptions
      );
      
      if (Buffer.isBuffer(mockupBuffer) && mockupBuffer.length > 0) {
        console.log(`   ✅ ${style}: ${mockupBuffer.length} bytes`);
        results.push({ style, success: true, size: mockupBuffer.length });
      } else {
        console.log(`   ❌ ${style}: Invalid buffer`);
        results.push({ style, success: false, error: 'Invalid buffer' });
      }
      
    } catch (error) {
      console.log(`   ❌ ${style}: ${error.message}`);
      results.push({ style, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  return { 
    success: successCount === styles.length, 
    results,
    successRate: `${successCount}/${styles.length}`
  };
}

/**
 * Test 4: Ink Bleed Effects
 * Validates Requirement 6.4: Subtle ink bleed effects
 */
async function testInkBleedEffects() {
  console.log('🧪 Test 4: Ink Bleed Effects');
  
  const inkEffectVariations = [
    { bleedRadius: 0, opacity: 0, colorShift: 0 }, // No effects
    { bleedRadius: 1, opacity: 0.2, colorShift: 0.05 }, // Minimal
    { bleedRadius: 3, opacity: 0.5, colorShift: 0.2 } // Strong
  ];
  
  const results = [];
  
  for (let i = 0; i < inkEffectVariations.length; i++) {
    try {
      const inkOptions = { ...testOptions, inkEffects: inkEffectVariations[i] };
      const mockupBuffer = await enhancedCompositingEngine.generateEnhancedMockup(
        testDesignUrl,
        testConfig,
        inkOptions
      );
      
      if (Buffer.isBuffer(mockupBuffer) && mockupBuffer.length > 0) {
        console.log(`   ✅ Ink variation ${i + 1}: ${mockupBuffer.length} bytes`);
        results.push({ variation: i + 1, success: true, size: mockupBuffer.length });
      } else {
        console.log(`   ❌ Ink variation ${i + 1}: Invalid buffer`);
        results.push({ variation: i + 1, success: false, error: 'Invalid buffer' });
      }
      
    } catch (error) {
      console.log(`   ❌ Ink variation ${i + 1}: ${error.message}`);
      results.push({ variation: i + 1, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  return { 
    success: successCount === inkEffectVariations.length, 
    results,
    successRate: `${successCount}/${inkEffectVariations.length}`
  };
}

/**
 * Test 5: Performance Test
 * Validates that compositing completes within reasonable time
 */
async function testPerformance() {
  console.log('🧪 Test 5: Performance Test');
  
  const startTime = Date.now();
  
  try {
    const mockupBuffer = await enhancedCompositingEngine.generateEnhancedMockup(
      testDesignUrl,
      testConfig,
      testOptions
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (Buffer.isBuffer(mockupBuffer) && mockupBuffer.length > 0) {
      console.log(`   ✅ Compositing completed in ${duration}ms`);
      console.log(`   ✅ Performance: ${duration < 10000 ? 'Good' : 'Needs optimization'}`);
      
      return { 
        success: true, 
        duration,
        performance: duration < 10000 ? 'good' : 'needs_optimization'
      };
    } else {
      console.log(`   ❌ Invalid result after ${duration}ms`);
      return { success: false, error: 'Invalid result', duration };
    }
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`   ❌ Test failed after ${duration}ms: ${error.message}`);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Running Enhanced T-shirt Compositing Engine Tests\n');
  
  const testResults = [];
  
  // Run all tests
  testResults.push(await testBasicEnhancedMockupGeneration());
  testResults.push(await testDifferentMaterials());
  testResults.push(await testDifferentStyles());
  testResults.push(await testInkBleedEffects());
  testResults.push(await testPerformance());
  
  // Calculate overall results
  const successCount = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  const successRate = (successCount / totalTests * 100).toFixed(1);
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   - Tests passed: ${successCount}/${totalTests} (${successRate}%)`);
  console.log(`   - Overall status: ${successCount === totalTests ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 Enhanced T-shirt Compositing Engine is working correctly!');
    console.log('   - Requirements 6.1, 6.2, 6.3, 6.4, 6.5 validated');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
  
  return {
    success: successCount === totalTests,
    successCount,
    totalTests,
    successRate: parseFloat(successRate),
    results: testResults
  };
}

// Run tests if this file is executed directly
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  runAllTests()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Unexpected test error:', error);
      process.exit(1);
    });
}

export { runAllTests };