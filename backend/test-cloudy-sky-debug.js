// Debug test for cloudy sky issue

function enhanceBackgroundDescription(description) {
  const lowerDesc = description.toLowerCase().trim();
  
  const cleanDesc = lowerDesc
    .replace(/^(a|an|the|with|of|featuring|showing|having|some|any)\s+/, '')
    .replace(/\s+(background|behind|falling|dropping)$/, '')
    .trim();
  
  console.log(`Clean description: "${cleanDesc}"`);
  
  const enhancements = {
    'cloudy sky': 'a cloudy sky background with white fluffy clouds',
    'cloudy': 'a cloudy sky background with white fluffy clouds',
    'sky': 'a clear blue sky background with soft clouds'
  };
  
  // Check for direct matches first
  if (enhancements[cleanDesc]) {
    console.log(`Direct match found: "${cleanDesc}" -> "${enhancements[cleanDesc]}"`);
    return enhancements[cleanDesc];
  }
  
  // Check for partial matches with common descriptors (prioritize longer matches)
  const sortedEnhancements = Object.entries(enhancements).sort((a, b) => b[0].length - a[0].length);
  console.log('Sorted enhancements:', sortedEnhancements.map(([k, v]) => k));
  
  for (const [key, value] of sortedEnhancements) {
    console.log(`Checking if "${cleanDesc}" includes "${key}" or "${key}" includes "${cleanDesc}"`);
    if (cleanDesc.includes(key) || key.includes(cleanDesc)) {
      console.log(`Partial match found: "${key}" -> "${value}"`);
      return value;
    }
  }
  
  return `a ${cleanDesc} background scene`;
}

// Test the problematic case
console.log('Testing "cloudy sky":');
const result = enhanceBackgroundDescription('cloudy sky');
console.log(`Final result: "${result}"`);