/**
 * Test script for point-based rewards parsing
 * Run with: node test-points-parsing.js
 */

// Import the parsing function (adjust path as needed)
// For testing, you can copy the parseOfferValue function here

const POINT_VALUATIONS = {
  'membership rewards': 1.5,
  'ultimate rewards': 1.5,
  'thankyou points': 1.0,
  'venture miles': 1.0,
  'default': 1.0
};

function parseOfferValue(offerValue) {
  const result = {
    amountBack: null,
    percentBack: null,
    minSpend: null,
    points: null
  };

  if (!offerValue || typeof offerValue !== 'string') {
    return result;
  }

  const text = offerValue.toLowerCase();

  // Check for point-based rewards FIRST
  const pointsPatterns = [
    /(?:earn\s+)?(\d+(?:,\d+)*)\s+(membership\s+rewards?®?|ultimate\s+rewards?®?|thankyou®?|venture\s+miles?)\s+points?/i,
    /earn\s+(\d+(?:,\d+)*)\s+points?/i,
    /(\d+(?:,\d+)*)\s+points?\s*(?:back)?/i
  ];

  for (const pattern of pointsPatterns) {
    const match = offerValue.match(pattern);
    if (match) {
      const pointAmount = parseInt(match[1].replace(/,/g, ''));
      
      // Skip if this looks like a dollar amount (e.g., "$350 or more")
      if (pointAmount < 100) continue;
      
      const programMatch = match[2] ? match[2].toLowerCase() : 'default';
      
      let program = 'Points';
      let valueCentsPerPoint = POINT_VALUATIONS['default'];
      
      if (programMatch.includes('membership rewards')) {
        program = 'Membership Rewards';
        valueCentsPerPoint = POINT_VALUATIONS['membership rewards'];
      } else if (programMatch.includes('ultimate rewards')) {
        program = 'Ultimate Rewards';
        valueCentsPerPoint = POINT_VALUATIONS['ultimate rewards'];
      } else if (programMatch.includes('thankyou')) {
        program = 'ThankYou Points';
        valueCentsPerPoint = POINT_VALUATIONS['thankyou points'];
      } else if (programMatch.includes('venture')) {
        program = 'Venture Miles';
        valueCentsPerPoint = POINT_VALUATIONS['venture miles'];
      }
      
      const estimatedValue = (pointAmount * valueCentsPerPoint) / 100;
      
      result.points = {
        amount: pointAmount,
        program,
        estimatedValue
      };
      
      result.amountBack = estimatedValue;
      break;
    }
  }

  // Extract dollar amount if no points found
  if (!result.points) {
    const dollarMatch = text.match(/\$(\d+(?:\.\d{2})?)\s*(?:back|off|credit)?/);
    if (dollarMatch) {
      result.amountBack = parseFloat(dollarMatch[1]);
    }
  }

  // Extract percentage
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    result.percentBack = parseFloat(percentMatch[1]);
  }

  // Extract minimum spend
  const spendPatterns = [
    /on\s+\$(\d+(?:\.\d{2})?)/,
    /\$(\d+(?:\.\d{2})?)\+?\s*(?:spend|purchase|minimum)/,
  ];

  for (const pattern of spendPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.minSpend = parseFloat(match[1]);
      break;
    }
  }

  return result;
}

// Test cases
console.log('========================================');
console.log('Point-Based Rewards Parsing Tests');
console.log('========================================\n');

const testCases = [
  {
    name: 'Amex Membership Rewards',
    input: 'Spend $350 or more, earn 5,000 Membership Rewards® points',
    expected: {
      points: 5000,
      program: 'Membership Rewards',
      estimatedValue: 75.00,
      minSpend: 350
    }
  },
  {
    name: 'Chase Ultimate Rewards',
    input: 'Earn 10,000 Ultimate Rewards points on $500 spend',
    expected: {
      points: 10000,
      program: 'Ultimate Rewards',
      estimatedValue: 150.00,
      minSpend: 500
    }
  },
  {
    name: 'Generic Points',
    input: '5000 points back',
    expected: {
      points: 5000,
      program: 'Points',
      estimatedValue: 50.00
    }
  },
  {
    name: 'Cash Back (no points)',
    input: '$50 back on $250+ spend',
    expected: {
      points: null,
      cashBack: 50.00,
      minSpend: 250
    }
  },
  {
    name: 'Amex with comma',
    input: 'Spend $1,000+, earn 15,000 Membership Rewards points',
    expected: {
      points: 15000,
      program: 'Membership Rewards',
      estimatedValue: 225.00,
      minSpend: 1000
    }
  }
];

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`Input: "${test.input}"`);
  
  const result = parseOfferValue(test.input);
  
  console.log('Parsed:');
  console.log(`  - Points: ${result.points ? result.points.amount : 'N/A'}`);
  console.log(`  - Program: ${result.points ? result.points.program : 'N/A'}`);
  console.log(`  - Estimated Value: ${result.points ? `$${result.points.estimatedValue.toFixed(2)}` : result.amountBack ? `$${result.amountBack.toFixed(2)}` : 'N/A'}`);
  console.log(`  - Min Spend: ${result.minSpend ? `$${result.minSpend}` : 'N/A'}`);
  console.log(`  - Amount Back: ${result.amountBack ? `$${result.amountBack.toFixed(2)}` : 'N/A'}`);
  
  // Validation
  const isValid = 
    (test.expected.points ? result.points?.amount === test.expected.points : true) &&
    (test.expected.estimatedValue ? Math.abs(result.points?.estimatedValue - test.expected.estimatedValue) < 0.01 : true) &&
    (test.expected.cashBack ? Math.abs(result.amountBack - test.expected.cashBack) < 0.01 : true);
  
  console.log(`Status: ${isValid ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log('========================================');
console.log('All tests completed!');
console.log('========================================');
