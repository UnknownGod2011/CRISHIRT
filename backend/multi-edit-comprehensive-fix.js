/**
 * Comprehensive Multi-Edit Fix
 * This script will create a complete fix for the multi-edit parsing issue
 */

import fs from 'fs';
import path from 'path';

const MAIN_FILE = 'index.fibo.js';

/**
 * Create the complete fixed parseMultipleOperationsEnhanced function
 */
function createFixedFunction() {
  return `
/**
 * Get action word from operation type for inheritance
 */
function getActionWordFromType(operationType) {
  const actionMap = {
    'object_addition': 'add',
    'object_modification': 'change',
    'background_edit': 'change',
    'object_removal': 'remove',
    'general_edit': 'modify'
  };
  return actionMap[operationType] || 'add';
}

/**
 * Enhanced multi-operation parser with comprehensive pattern recognition and validation
 * Implements Requirements 1.1, 1.2, 1.4, 1.5 for complete multi-refinement parsing
 * FIXED VERSION - Properly handles action inheritance for conjunctions like "add X and Y"
 */
function parseMultipleOperationsEnhanced(instruction) {
  const operations = [];
  
  console.log(\`🔍 FIXED Enhanced parsing of multi-edit instruction: "\${instruction}"\`);
  
  // SPECIAL CASE: Handle "add X and Y" pattern specifically
  const addAndPattern = /^add\\s+(.+?)\\s+and\\s+(.+)$/i;
  const addAndMatch = instruction.match(addAndPattern);
  
  if (addAndMatch) {
    console.log(\`   - 🎯 Special case: "add X and Y" pattern detected\`);
    const firstItem = addAndMatch[1].trim();
    const secondItem = addAndMatch[2].trim();
    
    // Create two operations
    const op1 = parseIndividualOperationWithValidation(\`add \${firstItem}\`);
    const op2 = parseIndividualOperationWithValidation(\`add \${secondItem}\`);
    
    if (op1 && op1.isValid) {
      operations.push(op1);
      console.log(\`   - ✅ Special case parsed: "add \${firstItem}" as \${op1.type}\`);
    }
    
    if (op2 && op2.isValid) {
      operations.push(op2);
      console.log(\`   - ✅ Special case parsed: "add \${secondItem}" as \${op2.type}\`);
    }
    
    console.log(\`✅ FIXED Special case extracted \${operations.length} operations\`);
    return operations;
  }
  
  // GENERAL CASE: Use enhanced splitting strategies
  let parts = [];
  let bestCount = 1;
  
  const strategies = [
    // Strategy 1: Split on "and" 
    () => instruction.split(/\\s+and\\s+/i),
    
    // Strategy 2: Split on commas followed by action words
    () => instruction.split(/,\\s*(?=add|change|make|turn|give|put|place|remove)/i),
    
    // Strategy 3: Split on any conjunction
    () => instruction.split(/\\s+(?:and|&|plus|also|then)\\s+/i),
    
    // Strategy 4: Extract action patterns with lookahead
    () => {
      const matches = instruction.match(/(?:add|change|make|turn|give|put|place|remove)\\s+(?:a\\s+|an\\s+|the\\s+|him\\s+|her\\s+|it\\s+)?[^,]+?(?=\\s+(?:and|&|plus|also|then|,)|$)/gi);
      return matches || [instruction];
    }
  ];
  
  // Try each strategy and use the one that gives the most parts
  for (const strategy of strategies) {
    try {
      const testParts = strategy();
      if (testParts.length > bestCount) {
        parts = testParts;
        bestCount = testParts.length;
      }
    } catch (error) {
      // Skip failed strategies
    }
  }
  
  console.log(\`   - Split into \${parts.length} parts using best strategy\`);
  
  // Process each part with smart action inheritance
  const validOperations = [];
  const droppedOperations = [];
  let lastActionWord = null;
  
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].trim();
    if (part.length === 0) continue;
    
    // Clean up the part (remove leading conjunctions and articles)
    part = part.replace(/^(and|also|plus|then|a|an|the)\\s+/i, '');
    
    // Check if this part has an action word
    const hasActionWord = /\\b(?:add|change|make|turn|give|put|place|remove|color|paint|dye)\\b/i.test(part);
    
    if (!hasActionWord && lastActionWord && i > 0) {
      // This part doesn't have an action word, inherit from previous
      const looksLikeObject = /^(?:a\\s+|an\\s+|the\\s+)?[\\w\\s]+$/i.test(part);
      
      if (looksLikeObject) {
        part = \`\${lastActionWord} \${part}\`;
        console.log(\`   - 🔄 Inherited action "\${lastActionWord}" for: "\${parts[i].trim()}" → "\${part}"\`);
      }
    }
    
    // Extract action word for next iteration
    const actionMatch = part.match(/\\b(add|change|make|turn|give|put|place|remove|color|paint|dye)\\b/i);
    if (actionMatch) {
      lastActionWord = actionMatch[1].toLowerCase();
    }
    
    // Parse the operation with enhanced validation
    const operation = parseIndividualOperationWithValidation(part);
    if (operation && operation.isValid) {
      validOperations.push(operation);
      console.log(\`   - ✅ Parsed: "\${part}" as \${operation.type} (target: \${operation.target || 'none'})\`);
    } else {
      droppedOperations.push({ part, reason: operation ? operation.invalidReason : 'parsing_failed' });
      console.log(\`   - ❌ Dropped: "\${part}" - \${operation ? operation.invalidReason : 'parsing failed'}\`);
    }
  }
  
  // Attempt recovery for dropped operations
  if (droppedOperations.length > 0) {
    console.log(\`⚠️  \${droppedOperations.length} operations were dropped during parsing:\`);
    droppedOperations.forEach(dropped => {
      console.log(\`   - "\${dropped.part}" (\${dropped.reason})\`);
    });
    
    const recoveredOperations = attemptOperationRecovery(droppedOperations);
    validOperations.push(...recoveredOperations);
    
    if (recoveredOperations.length > 0) {
      console.log(\`   - ✅ Recovered \${recoveredOperations.length} operations\`);
    }
  }
  
  console.log(\`✅ FIXED Enhanced parsing extracted \${validOperations.length} valid operations\`);
  
  return validOperations;
}`;
}

/**
 * Apply the comprehensive fix to the main file
 */
function applyComprehensiveFix() {
  console.log('🔧 Applying comprehensive multi-edit fix...');
  
  try {
    // Read the current file
    const content = fs.readFileSync(MAIN_FILE, 'utf8');
    
    // Find the function to replace
    const functionStart = content.indexOf('function parseMultipleOperationsEnhanced(instruction) {');
    if (functionStart === -1) {
      throw new Error('Could not find parseMultipleOperationsEnhanced function');
    }
    
    // Find the end of the function (look for the closing brace)
    let braceCount = 0;
    let functionEnd = functionStart;
    let inFunction = false;
    
    for (let i = functionStart; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inFunction = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          functionEnd = i + 1;
          break;
        }
      }
    }
    
    if (functionEnd === functionStart) {
      throw new Error('Could not find end of parseMultipleOperationsEnhanced function');
    }
    
    console.log(`   - Found function at position ${functionStart} to ${functionEnd}`);
    
    // Replace the function
    const beforeFunction = content.substring(0, functionStart);
    const afterFunction = content.substring(functionEnd);
    const fixedFunction = createFixedFunction();
    
    const newContent = beforeFunction + fixedFunction + afterFunction;
    
    // Write the fixed file
    fs.writeFileSync(MAIN_FILE, newContent, 'utf8');
    
    console.log('✅ Comprehensive fix applied successfully');
    console.log('   - Added special case handler for "add X and Y" pattern');
    console.log('   - Enhanced action inheritance logic');
    console.log('   - Improved logging for debugging');
    
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to apply fix: ${error.message}`);
    return false;
  }
}

// Apply the fix
if (applyComprehensiveFix()) {
  console.log('\n🎯 Fix applied! Please restart the server and test again.');
  console.log('\nTest command: node multi-edit-regression-test.js');
} else {
  console.log('\n💥 Fix failed! Please check the error messages above.');
}