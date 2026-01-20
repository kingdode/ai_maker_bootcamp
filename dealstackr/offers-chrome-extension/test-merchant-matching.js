/**
 * Merchant Matching Test Suite
 * 
 * Tests the matching logic to ensure:
 * 1. Valid matches work correctly
 * 2. False positives are prevented
 * 3. Edge cases are handled properly
 */

// Mock offers database
const testOffers = [
  { merchant_name: 'Cocoon', offer_value: '$50 back' },
  { merchant_name: 'Coco Maya', offer_value: '$25 back' },
  { merchant_name: 'Theory', offer_value: '$100 back' },
  { merchant_name: 'Mackage', offer_value: '$75 back' },
  { merchant_name: 'Nordstrom', offer_value: '$30 back' },
  { merchant_name: 'Nordstrom Rack', offer_value: '$20 back' },
  { merchant_name: 'The Container Store', offer_value: '$15 back' },
  { merchant_name: 'Target', offer_value: '$10 back' },
  { merchant_name: 'Smackage Burgers', offer_value: '$5 back' }, // Should NOT match "mackage"
  { merchant_name: 'Best Buy', offer_value: '$40 back' }, // Two-word brand that combines in domain
  { merchant_name: 'Home Depot', offer_value: '$35 back' }, // Another two-word brand
  { merchant_name: 'Whole Foods', offer_value: '$25 back' }, // Two-word brand
];

// Copy the matching function from signupDetector.js
function findMatchingOffers(offers, currentDomain, currentHostname) {
  const matching = [];
  
  const domainParts = currentDomain.split('.');
  const brandFromDomain = domainParts[0].toLowerCase();
  const hostnameParts = currentHostname.replace('www.', '').split('.');
  const brandFromHostname = hostnameParts[0].toLowerCase();
  
  const MIN_BRAND_LENGTH = 5;
  if (brandFromDomain.length < MIN_BRAND_LENGTH && brandFromHostname.length < MIN_BRAND_LENGTH) {
    console.log('[Test] Domain too short:', brandFromDomain);
    return [];
  }
  
  const brandName = brandFromDomain.length >= brandFromHostname.length ? brandFromDomain : brandFromHostname;
  
  const SKIP_DOMAINS = ['www', 'shop', 'store', 'buy', 'app', 'web', 'go', 'get', 'my', 'the', 'about', 'contact'];
  if (SKIP_DOMAINS.includes(brandName)) {
    console.log('[Test] Generic domain, skipping:', brandName);
    return [];
  }
  
  const FALSE_POSITIVE_BLOCKLIST = [
    { domain: 'cocomaya', merchant: 'cocoon' },
    { domain: 'coco', merchant: 'cocoon' },
    { domain: 'theory', merchant: 'theorie' },
  ];
  
  const brandNormalized = brandName.replace(/[^a-z0-9]/g, '');
  
  for (const offer of offers) {
    const merchantName = (offer.merchant_name || offer.merchant || '').toLowerCase().trim();
    if (!merchantName || merchantName.length < 2) continue;
    
    const merchantNormalized = merchantName.replace(/[^a-z0-9]/g, '');
    
    // Check blocklist FIRST - explicit false positive prevention
    const isBlocked = FALSE_POSITIVE_BLOCKLIST.some(block => {
      const blockDomainNorm = block.domain.replace(/[^a-z0-9]/g, '');
      const blockMerchantNorm = block.merchant.replace(/[^a-z0-9]/g, '');
      
      // Only block if:
      // 1. Current domain contains the block domain pattern
      // 2. Current merchant contains the block merchant pattern  
      // 3. They are NOT exact matches (don't block legitimate matches!)
      const domainContainsBlockPattern = brandNormalized.includes(blockDomainNorm);
      const merchantContainsBlockPattern = merchantNormalized.includes(blockMerchantNorm);
      const isExactDomainMatch = brandNormalized === blockMerchantNorm;
      const isExactMerchantMatch = merchantNormalized === blockDomainNorm;
      
      return domainContainsBlockPattern && merchantContainsBlockPattern && 
             !isExactDomainMatch && !isExactMerchantMatch;
    });
    
    if (isBlocked) {
      console.log('[Test] Blocked:', brandName, '→', merchantName);
      continue;
    }
    
    // Strategy 1: Exact match
    if (merchantNormalized === brandNormalized) {
      console.log('[Test] ✓ Exact match:', brandName, '→', merchantName);
      matching.push(offer);
      continue;
    }
    
    // Strategy 2: Exact word match
    const merchantWords = merchantName.split(/\s+/);
    const brandMatchesExactWord = merchantWords.some(word => {
      const wordNormalized = word.replace(/[^a-z0-9]/g, '');
      return wordNormalized === brandNormalized;
    });
    
    if (brandMatchesExactWord) {
      console.log('[Test] ✓ Exact word match:', brandName, '→', merchantName);
      matching.push(offer);
      continue;
    }
    
    // Strategy 3: First word exact match
    const firstMerchantWord = merchantWords[0]?.replace(/[^a-z0-9]/g, '') || '';
    if (firstMerchantWord.length >= MIN_BRAND_LENGTH && firstMerchantWord === brandNormalized) {
      console.log('[Test] ✓ First word exact match:', brandName, '→', merchantName);
      matching.push(offer);
      continue;
    }
    
    // Strategy 4: Compound brand match
    if (merchantWords.length === 1 && merchantNormalized.length >= 6 && brandNormalized.length >= 6) {
      if (brandNormalized.includes(merchantNormalized)) {
        const lengthRatio = merchantNormalized.length / brandNormalized.length;
        if (lengthRatio >= 0.6) {
          console.log('[Test] ✓ Compound brand match:', brandName, '→', merchantName);
          matching.push(offer);
          continue;
        }
      }
    }
    
    // Strategy 5: Reverse compound
    if (merchantWords.length === 1 && merchantNormalized.length >= 6) {
      if (brandNormalized.startsWith(merchantNormalized)) {
        const lengthRatio = merchantNormalized.length / brandNormalized.length;
        if (lengthRatio >= 0.6) {
          console.log('[Test] ✓ Reverse compound match:', brandName, '→', merchantName);
          matching.push(offer);
          continue;
        }
      }
    }
  }
  
  const seen = new Set();
  return matching.filter(offer => {
    const key = `${offer.merchant_name || offer.merchant}-${offer.offer_value || offer.offer}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Test cases
const testCases = [
  {
    name: 'Cocoon on cocoon.com',
    domain: 'cocoon.com',
    hostname: 'cocoon.com',
    expectedMatches: ['Cocoon'],
    expectedNonMatches: ['Coco Maya']
  },
  {
    name: 'Cocoon on www.cocoon.com',
    domain: 'cocoon.com',
    hostname: 'www.cocoon.com',
    expectedMatches: ['Cocoon'],
    expectedNonMatches: ['Coco Maya']
  },
  {
    name: 'Coco Maya on cocomaya.com',
    domain: 'cocomaya.com',
    hostname: 'cocomaya.com',
    expectedMatches: ['Coco Maya'],
    expectedNonMatches: ['Cocoon']
  },
  {
    name: 'Theory on theory.com',
    domain: 'theory.com',
    hostname: 'theory.com',
    expectedMatches: ['Theory'],
    expectedNonMatches: []
  },
  {
    name: 'Mackage on mackage.com',
    domain: 'mackage.com',
    hostname: 'mackage.com',
    expectedMatches: ['Mackage'],
    expectedNonMatches: ['Smackage Burgers']
  },
  {
    name: 'Nordstrom on nordstrom.com',
    domain: 'nordstrom.com',
    hostname: 'nordstrom.com',
    expectedMatches: ['Nordstrom', 'Nordstrom Rack'],
    expectedNonMatches: []
  },
  {
    name: 'Nordstrom Rack on nordstromrack.com',
    domain: 'nordstromrack.com',
    hostname: 'nordstromrack.com',
    expectedMatches: ['Nordstrom'], // Should match parent brand
    expectedNonMatches: []
  },
  {
    name: 'Target on target.com',
    domain: 'target.com',
    hostname: 'target.com',
    expectedMatches: ['Target'],
    expectedNonMatches: []
  },
  {
    name: 'Short domain (coco.com) - should skip',
    domain: 'coco.com',
    hostname: 'coco.com',
    expectedMatches: [],
    expectedNonMatches: ['Cocoon', 'Coco Maya']
  },
  {
    name: 'Generic domain (shop.com) - should skip',
    domain: 'shop.com',
    hostname: 'shop.com',
    expectedMatches: [],
    expectedNonMatches: []
  },
  {
    name: 'Best Buy on bestbuy.com (compound domain)',
    domain: 'bestbuy.com',
    hostname: 'bestbuy.com',
    expectedMatches: ['Best Buy'],
    expectedNonMatches: []
  },
  {
    name: 'Home Depot on homedepot.com',
    domain: 'homedepot.com',
    hostname: 'homedepot.com',
    expectedMatches: ['Home Depot'],
    expectedNonMatches: []
  },
  {
    name: 'Whole Foods on wholefoods.com',
    domain: 'wholefoods.com',
    hostname: 'wholefoods.com',
    expectedMatches: ['Whole Foods'],
    expectedNonMatches: []
  }
];

// Run tests
console.log('========================================');
console.log('Merchant Matching Test Suite');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.name}`);
  console.log(`Domain: ${test.domain}, Hostname: ${test.hostname}`);
  
  const matches = findMatchingOffers(testOffers, test.domain, test.hostname);
  const matchedMerchants = matches.map(m => m.merchant_name);
  
  console.log(`Matched: [${matchedMerchants.join(', ')}]`);
  console.log(`Expected: [${test.expectedMatches.join(', ')}]`);
  
  // Check expected matches
  let passed = true;
  for (const expected of test.expectedMatches) {
    if (!matchedMerchants.includes(expected)) {
      console.log(`  ❌ FAIL: Expected to match "${expected}" but didn't`);
      passed = false;
    }
  }
  
  // Check no false positives
  for (const notExpected of test.expectedNonMatches) {
    if (matchedMerchants.includes(notExpected)) {
      console.log(`  ❌ FAIL: Should NOT match "${notExpected}" but did (FALSE POSITIVE)`);
      passed = false;
    }
  }
  
  // Check for unexpected matches
  for (const matched of matchedMerchants) {
    if (!test.expectedMatches.includes(matched) && !test.expectedNonMatches.includes(matched)) {
      console.log(`  ⚠️  WARNING: Matched "${matched}" (not in test expectations)`);
    }
  }
  
  if (passed) {
    console.log(`  ✅ PASS`);
    passCount++;
  } else {
    failCount++;
  }
});

console.log('\n========================================');
console.log('Test Results');
console.log('========================================');
console.log(`Passed: ${passCount}/${testCases.length}`);
console.log(`Failed: ${failCount}/${testCases.length}`);
console.log(failCount === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
console.log('========================================');
