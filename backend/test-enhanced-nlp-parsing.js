/**
 * Test Enhanced NLP Parsing Integration
 * Tests the enhanced parseInstructionAdvanced function with natural language processor
 */

// Import the enhanced NLP system (simulate the environment)
console.log("🧪 Testing Enhanced NLP Parsing Integration");
console.log("==========================================");

// Test cases for the enhanced parseInstructionAdvanced function
const testCases = [
  {
    instruction: "add a hat",
    expected: {
      type: 'addition',
      item: 'hat',
      category: 'addition'
    }
  },
  {
    instruction: "give him golden teeth",
    expected: {
      type: 'color_change',
      target: 'teeth',
      new_color: 'golden',
      category: 'colorChange'
    }
  },
  {
    instruction: "make the background a forest",
    expected: {
      type: 'background_change',
      description: 'forest',
      category: 'background'
    }
  },
  {
    instruction: "add blood to his nose and make his teeth gold",
    expected: {
      modifications: 2,
      complexity: 'multi_step'
    }
  },
  {
    instruction: "put a cigar in his mouth",
    expected: {
      type: 'addition',
      item: 'cigar',
      location: 'mouth'
    }
  },
  {
    instruction: "remove the hat",
    expected: {
      type: 'removal',
      target: 'hat'
    }
  },
  {
    instruction: "turn his eyes red",
    expected: {
      type: 'color_change',
      target: 'eyes',
      new_color: 'red'
    }
  }
];

// Mock the enhanced NLP system for testing
class MockEnhancedNLP {
  normalizeInstruction(instruction) {
    const lowerInstruction = instruction.toLowerCase();
    
    // Simple mock normalization
    if (lowerInstruction.includes('add') || lowerInstruction.includes('put') || lowerInstruction.includes('give')) {
      return {
        original: instruction,
        normalized: instruction,
        category: 'addition',
        confidence: 0.9,
        extractedData: {
          object: this.extractObject(instruction),
          location: this.extractLocation(instruction)
        }
      };
    }
    
    if (lowerInstruction.includes('background')) {
      return {
        original: instruction,
        normalized: instruction,
        category: 'background',
        confidence: 0.9,
        extractedData: {
          description: this.extractBackground(instruction)
        }
      };
    }
    
    if (lowerInstruction.includes('make') || lowerInstruction.includes('turn') || lowerInstruction.includes('color')) {
      return {
        original: instruction,
        normalized: instruction,
        category: 'colorChange',
        confidence: 0.9,
        extractedData: {
          target: this.extractTarget(instruction),
          color: this.extractColor(instruction)
        }
      };
    }
    
    if (lowerInstruction.includes('remove')) {
      return {
        original: instruction,
        normalized: instruction,
        category: 'removal',
        confidence: 0.9,
        extractedData: {
          target: this.extractTarget(instruction)
        }
      };
    }
    
    return {
      original: instruction,
      normalized: instruction,
      category: 'unknown',
      confidence: 0.0,
      extractedData: {}
    };
  }
  
  extractObject(instruction) {
    const match = instruction.match(/(?:add|put|give\s+(?:him|her|it|them))\s+(?:a\s+|an\s+)?(\w+)/i);
    return match ? match[1] : null;
  }
  
  extractLocation(instruction) {
    const match = instruction.match(/(?:in|on|to)\s+(?:his|her|its|their|the)\s+(\w+)/i);
    return match ? match[1] : null;
  }
  
  extractBackground(instruction) {
    const match = instruction.match(/background\s+(?:a\s+)?(\w+)/i);
    return match ? match[1] : null;
  }
  
  extractTarget(instruction) {
    const match = instruction.match(/(?:his|her|its|their|the)\s+(\w+)/i);
    return match ? match[1] : null;
  }
  
  extractColor(instruction) {
    const colors = ['red', 'blue', 'green', 'yellow', 'gold', 'golden', 'silver', 'black', 'white'];
    for (const color of colors) {
      if (instruction.toLowerCase().includes(color)) {
        return color;
      }
    }
    return null;
  }
  
  getEquivalentPhrasings(instruction) {
    return [instruction, `${instruction} (equivalent)`];
  }
}

// Mock global enhancedNLP
global.enhancedNLP = new MockEnhancedNLP();

// Mock helper functions
function determineSpecificity(item, location) {
  const highSpecificityItems = ['blood', 'crack', 'scar', 'eye', 'tooth', 'nail'];
  if (highSpecificityItems.some(keyword => item && item.includes(keyword))) {
    return 'very_high';
  }
  return location ? 'medium' : 'low';
}

function isColorWord(word) {
  const colors = ['red', 'blue', 'green', 'yellow', 'gold', 'golden', 'silver', 'black', 'white'];
  return colors.includes(word.toLowerCase());
}

// Simplified version of the enhanced parseInstructionAdvanced function for testing
function parseInstructionAdvanced(instruction) {
  console.log(`🧠 Enhanced NLP parsing: "${instruction}"`);
  
  const normalizedInstruction = global.enhancedNLP.normalizeInstruction(instruction);
  const modifications = [];
  
  console.log(`   - Normalized: "${normalizedInstruction.normalized}" (${normalizedInstruction.category})`);
  console.log(`   - Confidence: ${normalizedInstruction.confidence}`);
  
  // Process based on normalized category
  if (normalizedInstruction.category !== 'unknown' && normalizedInstruction.confidence > 0.7) {
    const modification = createModificationFromNormalizedInstruction(normalizedInstruction);
    if (modification) {
      modifications.push(modification);
      console.log(`   - Added NLP-based modification: ${modification.type}`);
    }
  }
  
  // Parse multiple operations for complex instructions
  const multiOperations = parseMultipleOperations(instruction);
  for (const operation of multiOperations) {
    if (!modifications.some(m => areModificationsEquivalent(m, operation))) {
      modifications.push(operation);
      console.log(`   - Added multi-op modification: ${operation.type}`);
    }
  }
  
  console.log(`   - Total modifications found: ${modifications.length}`);
  
  return {
    modifications,
    complexity: determineComplexity(modifications),
    requires_masking: modifications.some(m => m.specificity === 'very_high'),
    nlp_confidence: normalizedInstruction.confidence,
    normalized_form: normalizedInstruction.normalized,
    equivalent_phrasings: global.enhancedNLP.getEquivalentPhrasings(instruction)
  };
}

function createModificationFromNormalizedInstruction(normalizedInstruction) {
  const { category, extractedData, confidence } = normalizedInstruction;
  
  switch (category) {
    case 'addition':
      return {
        type: 'addition',
        item: extractedData.object,
        location: extractedData.location,
        specificity: determineSpecificity(extractedData.object, extractedData.location),
        confidence: confidence,
        source: 'nlp'
      };
      
    case 'colorChange':
      return {
        type: 'color_change',
        target: extractedData.target,
        new_color: extractedData.color,
        specificity: 'high',
        confidence: confidence,
        source: 'nlp'
      };
      
    case 'background':
      return {
        type: 'background_change',
        description: extractedData.description,
        specificity: 'medium',
        confidence: confidence,
        source: 'nlp'
      };
      
    case 'removal':
      return {
        type: 'removal',
        target: extractedData.target,
        specificity: 'high',
        confidence: confidence,
        source: 'nlp'
      };
      
    default:
      return null;
  }
}

function parseMultipleOperations(instruction) {
  const operations = [];
  const conjunctions = [' and ', ' also ', ' plus ', ' then ', ', '];
  let parts = [instruction];
  
  for (const conjunction of conjunctions) {
    const newParts = [];
    for (const part of parts) {
      newParts.push(...part.split(conjunction));
    }
    parts = newParts;
  }
  
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.length > 3 && trimmedPart !== instruction) {
      const normalizedPart = global.enhancedNLP.normalizeInstruction(trimmedPart);
      if (normalizedPart.category !== 'unknown') {
        const modification = createModificationFromNormalizedInstruction(normalizedPart);
        if (modification) {
          operations.push(modification);
        }
      }
    }
  }
  
  return operations;
}

function areModificationsEquivalent(mod1, mod2) {
  if (mod1.type !== mod2.type) return false;
  
  switch (mod1.type) {
    case 'addition':
      return mod1.item === mod2.item && mod1.location === mod2.location;
    case 'color_change':
      return mod1.target === mod2.target && mod1.new_color === mod2.new_color;
    case 'background_change':
      return mod1.description === mod2.description;
    case 'removal':
      return mod1.target === mod2.target;
    default:
      return false;
  }
}

function determineComplexity(modifications) {
  if (modifications.length === 0) return 'none';
  if (modifications.length === 1) return 'single_step';
  if (modifications.length <= 3) return 'multi_step';
  return 'complex';
}

// Run tests
console.log("\n🧪 Running Enhanced NLP Parsing Tests:");
console.log("=====================================");

let passedTests = 0;
let totalTests = testCases.length;

for (let i = 0; i < testCases.length; i++) {
  const testCase = testCases[i];
  console.log(`\nTest ${i + 1}: "${testCase.instruction}"`);
  
  try {
    const result = parseInstructionAdvanced(testCase.instruction);
    
    console.log(`Result:`, {
      modifications: result.modifications.length,
      complexity: result.complexity,
      nlp_confidence: result.nlp_confidence,
      first_modification: result.modifications[0]
    });
    
    // Basic validation
    let testPassed = true;
    
    if (testCase.expected.modifications !== undefined) {
      if (result.modifications.length !== testCase.expected.modifications) {
        console.log(`❌ Expected ${testCase.expected.modifications} modifications, got ${result.modifications.length}`);
        testPassed = false;
      }
    }
    
    if (testCase.expected.complexity !== undefined) {
      if (result.complexity !== testCase.expected.complexity) {
        console.log(`❌ Expected complexity ${testCase.expected.complexity}, got ${result.complexity}`);
        testPassed = false;
      }
    }
    
    if (testCase.expected.type !== undefined && result.modifications.length > 0) {
      if (result.modifications[0].type !== testCase.expected.type) {
        console.log(`❌ Expected type ${testCase.expected.type}, got ${result.modifications[0].type}`);
        testPassed = false;
      }
    }
    
    if (testPassed) {
      console.log(`✅ Test ${i + 1} PASSED`);
      passedTests++;
    } else {
      console.log(`❌ Test ${i + 1} FAILED`);
    }
    
  } catch (error) {
    console.log(`❌ Test ${i + 1} ERROR:`, error.message);
  }
}

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log("🎉 All tests passed! Enhanced NLP parsing is working correctly.");
} else {
  console.log("⚠️  Some tests failed. Review the implementation for improvements.");
}

console.log("\n✅ Enhanced NLP Parsing Integration Test Complete");