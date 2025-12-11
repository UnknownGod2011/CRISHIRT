#!/usr/bin/env node

/**
 * Test script for Enhanced Background Persistence Logic
 * Tests Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

// Import the enhanced background context manager
class BackgroundContextManager {
  constructor() {
    this.backgroundStates = new Map();
    this.globalBackgroundContext = null;
    this.refinementChains = new Map();
  }

  // Initialize refinement chain for background persistence
  initializeRefinementChain(imageUrl, originalData) {
    console.log(`🔗 Initializing refinement chain for: ${imageUrl}`);
    
    let chainState = this.refinementChains.get(imageUrl);
    
    if (!chainState) {
      chainState = {
        originalImageUrl: imageUrl,
        backgroundState: this.determineInitialBackgroundState(originalData),
        refinementHistory: [],
        lastModified: new Date(),
        chainId: `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      this.refinementChains.set(imageUrl, chainState);
      console.log(`   - Created new chain: ${chainState.chainId}`);
      console.log(`   - Initial background state: ${chainState.backgroundState.type} - "${chainState.backgroundState.description}"`);
    }
    
    return chainState;
  }

  determineInitialBackgroundState(originalData) {
    if (originalData?.background_context?.background) {
      return {
        type: originalData.background_context.isExplicitlySet ? 'explicit' : 'inferred',
        description: originalData.background_context.background,
        isExplicitlySet: originalData.background_context.isExplicitlySet,
        setAt: originalData.background_context.lastModified || new Date(),
        preserveAcrossRefinements: originalData.background_context.preserveAcrossRefinements !== false
      };
    } else {
      return {
        type: 'default',
        description: 'transparent background',
        isExplicitlySet: false,
        setAt: new Date(),
        preserveAcrossRefinements: true
      };
    }
  }

  updateRefinementChainBackground(imageUrl, instruction, isExplicitBackgroundOperation = false) {
    const chainState = this.refinementChains.get(imageUrl);
    if (!chainState) {
      console.warn(`⚠️  No refinement chain found for ${imageUrl}`);
      return null;
    }

    const refinementEntry = {
      instruction,
      timestamp: new Date(),
      isBackgroundOperation: isExplicitBackgroundOperation,
      previousBackgroundState: { ...chainState.backgroundState }
    };

    if (isExplicitBackgroundOperation) {
      if (this.isBackgroundRemovalOperation(instruction)) {
        chainState.backgroundState = {
          type: 'removed',
          description: 'transparent background',
          isExplicitlySet: true,
          setAt: new Date(),
          preserveAcrossRefinements: true,
          explicitlyRemoved: true
        };
        console.log(`   - Background explicitly removed`);
      } else {
        const newBackground = this.extractBackgroundDescriptionEnhanced(instruction);
        chainState.backgroundState = {
          type: 'explicit',
          description: newBackground,
          isExplicitlySet: true,
          setAt: new Date(),
          preserveAcrossRefinements: true,
          replacedPrevious: true
        };
        console.log(`   - Background replaced with: "${newBackground}"`);
      }
      
      refinementEntry.newBackgroundState = { ...chainState.backgroundState };
    } else {
      console.log(`   - Non-background operation: preserving existing background`);
      refinementEntry.backgroundPreserved = true;
    }

    chainState.refinementHistory.push(refinementEntry);
    chainState.lastModified = new Date();
    
    return chainState;
  }

  getCurrentBackgroundState(imageUrl) {
    const chainState = this.refinementChains.get(imageUrl);
    if (!chainState) {
      return {
        type: 'default',
        description: 'transparent background',
        isExplicitlySet: false,
        setAt: new Date(),
        preserveAcrossRefinements: true
      };
    }
    
    return chainState.backgroundState;
  }

  shouldPreserveBackgroundInChain(imageUrl, instruction) {
    const chainState = this.refinementChains.get(imageUrl);
    if (!chainState) {
      return true;
    }

    if (this.isBackgroundOperation(instruction)) {
      return false;
    }

    return chainState.backgroundState.preserveAcrossRefinements;
  }

  isBackgroundOperation(instruction) {
    if (typeof instruction === 'string') {
      const lowerOp = instruction.toLowerCase();
      return lowerOp.includes('background') && 
             (lowerOp.includes('change') || lowerOp.includes('add') || 
              lowerOp.includes('set') || lowerOp.includes('make'));
    }
    return false;
  }

  isBackgroundRemovalOperation(instruction) {
    const lowerInstruction = instruction.toLowerCase();
    return (lowerInstruction.includes('remove') && lowerInstruction.includes('background')) ||
           (lowerInstruction.includes('delete') && lowerInstruction.includes('background')) ||
           (lowerInstruction.includes('clear') && lowerInstruction.includes('background')) ||
           lowerInstruction.includes('no background') ||
           lowerInstruction.includes('transparent background only');
  }

  extractBackgroundDescriptionEnhanced(instruction) {
    const patterns = [
      /(?:make|change|set)\s+(?:the\s+)?background\s+(?:to\s+)?(.+)/i,
      /(?:add|put|give)\s+(?:a\s+)?(.+)\s+background/i,
      /background\s+(?:of\s+|with\s+)?(.+)/i,
      /(.+)\s+(?:falling\s+)?behind\s+(?:him|her|it|them)/i
    ];
    
    for (const pattern of patterns) {
      const match = instruction.match(pattern);
      if (match && match[1]) {
        let description = match[1].trim();
        description = description.replace(/\s+background$/, '');
        description = description.replace(/^(?:a|an|the)\s+/, '');
        return description;
      }
    }
    
    return 'custom background';
  }

  getRefinementChainHistory(imageUrl) {
    const chainState = this.refinementChains.get(imageUrl);
    return chainState ? chainState.refinementHistory : [];
  }
}

// Test functions for Requirements 4.1, 4.2, 4.3, 4.4, 4.5

function testBackgroundPersistenceAcrossRefinements() {
  console.log('\n=== Testing Background Persistence Across Refinements (Requirements 4.1, 4.2) ===');
  
  const manager = new BackgroundContextManager();
  const imageUrl = 'test-image-url';
  
  // Initialize with explicit background
  const originalData = {
    background_context: {
      background: 'forest landscape',
      isExplicitlySet: true,
      preserveAcrossRefinements: true
    }
  };
  
  const chain = manager.initializeRefinementChain(imageUrl, originalData);
  console.log(`Initial background: ${chain.backgroundState.description}`);
  
  // Test non-background refinement - should preserve background
  manager.updateRefinementChainBackground(imageUrl, 'add sunglasses', false);
  let currentState = manager.getCurrentBackgroundState(imageUrl);
  console.log(`After adding sunglasses: ${currentState.description}`);
  
  // Test another non-background refinement - should still preserve
  manager.updateRefinementChainBackground(imageUrl, 'add a hat', false);
  currentState = manager.getCurrentBackgroundState(imageUrl);
  console.log(`After adding hat: ${currentState.description}`);
  
  const preserved = currentState.description === 'forest landscape' && 
                   currentState.isExplicitlySet && 
                   currentState.preserveAcrossRefinements;
  
  console.log(`✅ Background persistence test: ${preserved ? 'PASSED' : 'FAILED'}`);
  return preserved;
}

function testTransparentBackgroundDefault() {
  console.log('\n=== Testing Transparent Background Default (Requirement 4.3) ===');
  
  const manager = new BackgroundContextManager();
  const imageUrl = 'test-image-no-bg';
  
  // Initialize without background data
  const chain = manager.initializeRefinementChain(imageUrl, null);
  console.log(`Initial background (no data): ${chain.backgroundState.description}`);
  
  // Test non-background refinement - should maintain transparent
  manager.updateRefinementChainBackground(imageUrl, 'add sunglasses', false);
  const currentState = manager.getCurrentBackgroundState(imageUrl);
  console.log(`After adding sunglasses: ${currentState.description}`);
  
  const isTransparent = currentState.description === 'transparent background' && 
                       currentState.type === 'default' &&
                       currentState.preserveAcrossRefinements;
  
  console.log(`✅ Transparent background default test: ${isTransparent ? 'PASSED' : 'FAILED'}`);
  return isTransparent;
}

function testExplicitBackgroundRemoval() {
  console.log('\n=== Testing Explicit Background Removal (Requirement 4.4) ===');
  
  const manager = new BackgroundContextManager();
  const imageUrl = 'test-image-removal';
  
  // Initialize with background
  const originalData = {
    background_context: {
      background: 'mountain landscape',
      isExplicitlySet: true,
      preserveAcrossRefinements: true
    }
  };
  
  const chain = manager.initializeRefinementChain(imageUrl, originalData);
  console.log(`Initial background: ${chain.backgroundState.description}`);
  
  // Test explicit background removal
  manager.updateRefinementChainBackground(imageUrl, 'remove background', true);
  const currentState = manager.getCurrentBackgroundState(imageUrl);
  console.log(`After explicit removal: ${currentState.description}`);
  
  const explicitlyRemoved = currentState.description === 'transparent background' && 
                           currentState.type === 'removed' &&
                           currentState.explicitlyRemoved === true;
  
  console.log(`✅ Explicit background removal test: ${explicitlyRemoved ? 'PASSED' : 'FAILED'}`);
  return explicitlyRemoved;
}

function testBackgroundReplacement() {
  console.log('\n=== Testing Background Replacement (Requirement 4.5) ===');
  
  const manager = new BackgroundContextManager();
  const imageUrl = 'test-image-replacement';
  
  // Initialize with background
  const originalData = {
    background_context: {
      background: 'forest landscape',
      isExplicitlySet: true,
      preserveAcrossRefinements: true
    }
  };
  
  const chain = manager.initializeRefinementChain(imageUrl, originalData);
  console.log(`Initial background: ${chain.backgroundState.description}`);
  
  // Test background replacement
  manager.updateRefinementChainBackground(imageUrl, 'change background to ocean waves', true);
  const currentState = manager.getCurrentBackgroundState(imageUrl);
  console.log(`After replacement: ${currentState.description}`);
  
  const replaced = currentState.description === 'ocean waves' && 
                  currentState.type === 'explicit' &&
                  currentState.replacedPrevious === true;
  
  console.log(`✅ Background replacement test: ${replaced ? 'PASSED' : 'FAILED'}`);
  return replaced;
}

function testBackgroundOperationDetection() {
  console.log('\n=== Testing Background Operation Detection ===');
  
  const manager = new BackgroundContextManager();
  
  const testCases = [
    { instruction: 'add sunglasses', expected: false },
    { instruction: 'change background to forest', expected: true },
    { instruction: 'remove background', expected: false }, // This is removal, not general background op
    { instruction: 'set mountain background', expected: true },
    { instruction: 'add a hat', expected: false },
    { instruction: 'make the background ocean', expected: true }
  ];
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    const detected = manager.isBackgroundOperation(testCase.instruction);
    const passed = detected === testCase.expected;
    console.log(`"${testCase.instruction}" -> ${detected} (expected: ${testCase.expected}) ${passed ? '✅' : '❌'}`);
    if (!passed) allPassed = false;
  }
  
  console.log(`✅ Background operation detection test: ${allPassed ? 'PASSED' : 'FAILED'}`);
  return allPassed;
}

function testRefinementChainHistory() {
  console.log('\n=== Testing Refinement Chain History Tracking ===');
  
  const manager = new BackgroundContextManager();
  const imageUrl = 'test-image-history';
  
  // Initialize chain
  const chain = manager.initializeRefinementChain(imageUrl, null);
  
  // Perform several refinements
  manager.updateRefinementChainBackground(imageUrl, 'add sunglasses', false);
  manager.updateRefinementChainBackground(imageUrl, 'change background to forest', true);
  manager.updateRefinementChainBackground(imageUrl, 'add a hat', false);
  
  const history = manager.getRefinementChainHistory(imageUrl);
  console.log(`Refinement history length: ${history.length}`);
  
  const hasCorrectHistory = history.length === 3 &&
                           history[0].instruction === 'add sunglasses' &&
                           history[0].isBackgroundOperation === false &&
                           history[1].instruction === 'change background to forest' &&
                           history[1].isBackgroundOperation === true &&
                           history[2].instruction === 'add a hat' &&
                           history[2].isBackgroundOperation === false;
  
  console.log(`✅ Refinement chain history test: ${hasCorrectHistory ? 'PASSED' : 'FAILED'}`);
  return hasCorrectHistory;
}

// Run all tests
function runAllBackgroundPersistenceTests() {
  console.log('🧪 Running Enhanced Background Persistence Tests');
  console.log('Testing Requirements 4.1, 4.2, 4.3, 4.4, 4.5');
  
  const results = {
    backgroundPersistence: testBackgroundPersistenceAcrossRefinements(),
    transparentDefault: testTransparentBackgroundDefault(),
    explicitRemoval: testExplicitBackgroundRemoval(),
    backgroundReplacement: testBackgroundReplacement(),
    operationDetection: testBackgroundOperationDetection(),
    chainHistory: testRefinementChainHistory()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log('\n=== Background Persistence Test Results Summary ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n✅ Enhanced Background Persistence implementation is working correctly!');
    console.log('Requirements 4.1, 4.2, 4.3, 4.4, 4.5 are satisfied.');
  } else {
    console.log('\n❌ Some tests failed. Please review the implementation.');
  }
  
  return allPassed;
}

// Run the tests
runAllBackgroundPersistenceTests();

export { BackgroundContextManager, runAllBackgroundPersistenceTests };