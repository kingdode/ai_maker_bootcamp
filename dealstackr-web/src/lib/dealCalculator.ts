/**
 * Deal Stack Calculator for DealStackr
 * 
 * Calculates the total value of stacked deals accounting for the order of operations:
 * 1. Signup/Promo discount (applied first, reduces base price)
 * 2. Card offer (statement credit on discounted spend)
 * 3. Cashback portal (% or $ back on discounted spend)
 */

export interface DealComponents {
  // Original/target spend amount (before any discounts)
  originalPrice: number;
  
  // Signup/Email offer
  signupDiscountPercent?: number;  // e.g., 20 for 20% off
  signupDiscountFixed?: number;    // e.g., 25 for $25 off
  
  // Card offer (Amex/Chase)
  cardOfferBack?: number;          // e.g., 50 for $50 back
  cardOfferMinSpend?: number;      // e.g., 150 for "on $150+ spend"
  cardOfferPercent?: number;       // e.g., 10 for 10% back
  
  // Cashback portal (Rakuten, Honey, etc.)
  cashbackPercent?: number;        // e.g., 2 for 2% back
  cashbackFixed?: number;          // e.g., 5 for $5 back
  portalName?: string;             // e.g., "Rakuten"
}

export interface DealCalculation {
  // Input values
  originalPrice: number;
  
  // Step 1: After signup discount
  priceAfterSignup: number;
  signupSavings: number;
  
  // Step 2: Card offer value
  cardOfferValue: number;
  meetsMinSpend: boolean;
  
  // Step 3: Cashback value (calculated on spend after signup)
  cashbackValue: number;
  
  // Totals
  totalSavings: number;
  finalCost: number;
  effectiveDiscountPercent: number;
  
  // Summary text
  summary: string;
  breakdown: string[];
}

/**
 * Calculate the total stacked deal value
 * 
 * Order of operations:
 * 1. Apply signup discount to original price → get discounted price
 * 2. Check if discounted price meets min spend for card offer
 * 3. Calculate cashback on discounted price (not original)
 * 4. Sum all savings
 */
export function calculateStackedDeal(components: DealComponents): DealCalculation {
  const { originalPrice } = components;
  const breakdown: string[] = [];
  
  // Step 1: Apply signup/promo discount
  let signupSavings = 0;
  if (components.signupDiscountPercent) {
    signupSavings = originalPrice * (components.signupDiscountPercent / 100);
    breakdown.push(`📧 Signup: ${components.signupDiscountPercent}% off = -$${signupSavings.toFixed(2)}`);
  } else if (components.signupDiscountFixed) {
    signupSavings = Math.min(components.signupDiscountFixed, originalPrice);
    breakdown.push(`📧 Signup: $${signupSavings.toFixed(2)} off`);
  }
  
  const priceAfterSignup = originalPrice - signupSavings;
  
  // Step 2: Calculate card offer value
  let cardOfferValue = 0;
  let meetsMinSpend = true;
  
  if (components.cardOfferBack) {
    // Fixed amount back (e.g., $50 back)
    const minSpend = components.cardOfferMinSpend || 0;
    meetsMinSpend = priceAfterSignup >= minSpend;
    
    if (meetsMinSpend) {
      cardOfferValue = components.cardOfferBack;
      breakdown.push(`💳 Card: $${cardOfferValue.toFixed(2)} back on $${minSpend}+ spend`);
    } else {
      breakdown.push(`⚠️ Card: Need $${minSpend} min spend (currently $${priceAfterSignup.toFixed(2)})`);
    }
  } else if (components.cardOfferPercent) {
    // Percentage back
    cardOfferValue = priceAfterSignup * (components.cardOfferPercent / 100);
    breakdown.push(`💳 Card: ${components.cardOfferPercent}% back = $${cardOfferValue.toFixed(2)}`);
  }
  
  // Step 3: Calculate cashback on discounted spend
  let cashbackValue = 0;
  if (components.cashbackPercent) {
    cashbackValue = priceAfterSignup * (components.cashbackPercent / 100);
    const portalName = components.portalName || 'Cashback';
    breakdown.push(`💰 ${portalName}: ${components.cashbackPercent}% of $${priceAfterSignup.toFixed(2)} = $${cashbackValue.toFixed(2)}`);
  } else if (components.cashbackFixed) {
    cashbackValue = components.cashbackFixed;
    const portalName = components.portalName || 'Cashback';
    breakdown.push(`💰 ${portalName}: $${cashbackValue.toFixed(2)} back`);
  }
  
  // Calculate totals
  const totalSavings = signupSavings + cardOfferValue + cashbackValue;
  const finalCost = originalPrice - totalSavings;
  const effectiveDiscountPercent = (totalSavings / originalPrice) * 100;
  
  // Build summary
  const summary = `$${originalPrice.toFixed(0)} worth of goods for $${finalCost.toFixed(2)} (${Math.round(effectiveDiscountPercent)}% off)`;
  
  return {
    originalPrice,
    priceAfterSignup,
    signupSavings,
    cardOfferValue,
    meetsMinSpend,
    cashbackValue,
    totalSavings,
    finalCost,
    effectiveDiscountPercent,
    summary,
    breakdown
  };
}

/**
 * Parse a card offer string to extract amount and min spend
 * Examples:
 * - "$50 back on $150+ spend" → { back: 50, minSpend: 150 }
 * - "$25 back (50%) on $50+ spend" → { back: 25, minSpend: 50, percent: 50 }
 * - "10% back" → { percent: 10 }
 */
export function parseCardOffer(offerString: string): { 
  back?: number; 
  minSpend?: number; 
  percent?: number;
} {
  const result: { back?: number; minSpend?: number; percent?: number } = {};
  
  // Match dollar amount back: "$50 back" or "$50"
  const dollarMatch = offerString.match(/\$(\d+(?:\.\d+)?)\s*back/i);
  if (dollarMatch) {
    result.back = parseFloat(dollarMatch[1]);
  }
  
  // Match percentage: "50%" or "(50%)"
  const percentMatch = offerString.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    result.percent = parseFloat(percentMatch[1]);
  }
  
  // Match minimum spend: "on $150" or "$150+ spend" or "$150 spend"
  const minSpendMatch = offerString.match(/(?:on\s*)?\$(\d+(?:,\d{3})*(?:\.\d+)?)\+?\s*(?:spend|purchase)?/i);
  if (minSpendMatch) {
    result.minSpend = parseFloat(minSpendMatch[1].replace(/,/g, ''));
  }
  
  return result;
}

/**
 * Format the deal calculation as a display-ready string
 */
export function formatDealSummary(calc: DealCalculation): string {
  const lines = [
    `🛒 Original: $${calc.originalPrice.toFixed(2)}`,
    ...calc.breakdown,
    ``,
    `💵 Total Savings: $${calc.totalSavings.toFixed(2)}`,
    `✨ Final Cost: $${calc.finalCost.toFixed(2)}`,
    `🔥 Effective Discount: ${Math.round(calc.effectiveDiscountPercent)}% off`
  ];
  
  return lines.join('\n');
}

/**
 * Determine the stack type based on components
 */
export function getStackType(components: DealComponents): 'Triple Stack' | 'Double Stack' | 'Stack' | null {
  const hasSignup = !!(components.signupDiscountPercent || components.signupDiscountFixed);
  const hasCard = !!(components.cardOfferBack || components.cardOfferPercent);
  const hasCashback = !!(components.cashbackPercent || components.cashbackFixed);
  
  const count = [hasSignup, hasCard, hasCashback].filter(Boolean).length;
  
  if (count >= 3) return 'Triple Stack';
  if (count === 2) return 'Double Stack';
  if (count === 1) return 'Stack';
  return null;
}
