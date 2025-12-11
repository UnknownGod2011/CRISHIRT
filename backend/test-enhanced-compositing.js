/**
 * Test script for Enhanced T-shirt Compositing Engine
 */

import { enhancedCompositingEngine } from './enhanced-compositing-engine.js';
import fs from 'fs';
import path from 'path';

async function testEnhancedCompositing() {
  console.log('🧪 Testing Enhanced T-shirt Compositing Engine...');
  
  try {
    // Test configuration
    const testConfig = {
      color: '#ff0000',
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
    
    // Create a simple test design (SVG)
    const testDesignSvg = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <circle cx="75" cy="75" r="50" fill="#0066cc" stroke="#003366" stroke-width="3"/>
        <text x="75" y="80" text-anchor="middle" fill="white" font-family="Arial" font-size="16">TEST</text>
      </svg>
    `;
    
    const testDesignUrl = 'data:image/svg+xml;base64,' + Buffer.from(testDesignSvg).toString('base64');
    
    console.log('   - Test design created');
    console.log('   - T-shirt config:', testConfig);
    console.log('   - Options:', testOptions);
    
    // Test the enhanced compositing
    const mockupBuffer = await enhancedCompositingEngine.generateEnhancedMockup(
      testDesignUrl,
      testConfig,
      testOptions
    );
    
    console.log('   - Enhanced mockup generated successfully');
    console.log('   - Buffer size:', mockupBuffer.length, 'bytes');
    
    // Save the test result
    const filename = `test_enhanced_mockup_${Date.now()}.png`;
    const filepath = await enhancedCompositingEngine.saveEnhancedMockup(mockupBuffer, filename);
    
    console.log('✅ Test completed successfully!');
    console.log('   - Test mockup saved:', filename);
    console.log('   - File path:', filepath);
    
    return {
      success: true,
      filename: filename,
      filepath: filepath,
      bufferSize: mockupBuffer.length
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   - Stack trace:', error.stack);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the test
testEnhancedCompositing()
  .then(result => {
    console.log('\n📋 Test Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });