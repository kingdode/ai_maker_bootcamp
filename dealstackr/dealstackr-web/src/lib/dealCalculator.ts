/**
 * Deal Stack Calculator for DealStackr
 * 
 * Calculates the total value of stacked deals with proper order of operations.
 * 
 * KEY INSIGHT: Discounts reduce your spend BEFORE threshold check!
 * Example: $350 min spend + 20% off code
 *   - If item costs $400, with 20% off = $320 → DOESN'T hit $350!
 *   - You need to spend $437.50 pre-discount to hit $350 after 20% off
 * 
 * Order of Operations:
 * 1. Promo code discount (e.g., SAVE20 for 20% off)
 * 2. Email signup discount (e.g., 15% off first order)
 * 3. → This gives you NET SPEND (what counts toward card offer threshold)
 * 4. Card cashback/points (calculated on net spend, requires threshold)
 * 5. Portal cashback (calculated on net spend)
 */

// Point valuations in cents per point
export const POINT_VALUES = {
  'amex_mr': 2.0,      // Amex Membership Rewards
  'chase_ur': 2.0,     // Chase Ultimate Rewards
  'citi_typ': 1.8,     // Citi ThankYou Points
  'capital_one': 1.7,  // Capital One Miles
  'generic': 1.0,      // Generic/unknown
} as const;

export interface DealStackInput {
  // What you want to buy
  cartValue: number;           // Pre-discount cart value
  
  // Promo code discount (applied first)
  promoCodePercent?: number;   // e.g., 20 for "20% off"
  promoCodeFixed?: number;     // e.g., 50 for "$50 off"
  promoCodeName?: string;      // e.g., "SAVE20"
  
  // Email signup discount (applied after promo)
  emailSignupPercent?: number; // e.g., 15 for "15% off first order"
  emailSignupFixed?: number;   // e.g., 25 for "$25 off"
  
  // Card offer - Cashback
  cardCashbackFixed?: number;  // e.g., 75 for "$75 back"
  cardCashbackPercent?: number; // e.g., 10 for "10% back"
  cardMinSpend?: number;       // e.g., 350 for "on $350+ spend"
  cardMaxRedemption?: number;  // e.g., 100 for "up to $100 back"
  cardName?: string;           // e.g., "Amex Platinum"
  
  // Card offer - Points
  cardPointsAmount?: number;   // e.g., 5000 for "5,000 points"
  cardPointsProgram?: keyof typeof POINT_VALUES; // e.g., "amex_mr"
  
  // Cashback portal (Rakuten, Honey, etc.)
  portalCashbackPercent?: number;  // e.g., 5 for "5% back"
  portalCashbackFixed?: number;    // e.g., 10 for "$10 back"
  portalName?: string;             // e.g., "Rakuten"
}

export interface DealStackResult {
  // Input
  originalCart: number;
  
  // Step 1: Promo code
  promoDiscount: number;
  afterPromo: number;
  
  // Step 2: Email signup
  emailDiscount: number;
  afterEmail: number;
  
  // NET SPEND (what you actually charge to card)
  netSpend: number;
  
  // Step 3: Card offer check
  meetsCardThreshold: boolean;
  cardThreshold: number;
  shortfall: number;           // How much more you need to spend
  minimumCartToQualify: number; // What cart value you need pre-discounts
  
  // Step 4: Card value
  cardCashbackValue: number;
  cardPointsValue: number;
  cardPointsAmount: number;
  totalCardValue: number;
  
  // Step 5: Portal value
  portalValue: number;
  
  // Totals
  totalDiscounts: number;      // Promo + Email (reduces what you pay)
  totalCashback: number;       // Card + Portal (comes back to you)
  totalSavings: number;        // Everything combined
  finalEffectiveCost: number;  // What you really pay net of everything
  effectiveDiscountPercent: number;
  
  // Stack info
  stackLayers: number;
  stackType: string;
  
  // Human-readable breakdown
  breakdown: BreakdownLine[];
  warnings: string[];
  summary: string;
}

interface BreakdownLine {
  icon: string;
  label: string;
  value: number;
  note?: string;
}

/**
 * Calculate the complete stacked deal
 */
export function calculateDealStack(input: DealStackInput): DealStackResult {
  const { cartValue } = input;
  const breakdown: BreakdownLine[] = [];
  const warnings: string[] = [];
  
  // ============================================
  // STEP 1: Apply promo code discount
  // ============================================
  let promoDiscount = 0;
  if (input.promoCodePercent) {
    promoDiscount = cartValue * (input.promoCodePercent / 100);
    breakdown.push({
      icon: '🏷️',
      label: input.promoCodeName ? `Promo: ${input.promoCodeName}` : 'Promo Code',
      value: -promoDiscount,
      note: `${input.promoCodePercent}% off`
    });
  } else if (input.promoCodeFixed) {
    promoDiscount = Math.min(input.promoCodeFixed, cartValue);
    breakdown.push({
      icon: '🏷️',
      label: input.promoCodeName ? `Promo: ${input.promoCodeName}` : 'Promo Code',
      value: -promoDiscount
    });
  }
  const afterPromo = cartValue - promoDiscount;
  
  // ============================================
  // STEP 2: Apply email signup discount
  // ============================================
  let emailDiscount = 0;
  if (input.emailSignupPercent) {
    emailDiscount = afterPromo * (input.emailSignupPercent / 100);
    breakdown.push({
      icon: '📧',
      label: 'Email Signup',
      value: -emailDiscount,
      note: `${input.emailSignupPercent}% off`
    });
  } else if (input.emailSignupFixed) {
    emailDiscount = Math.min(input.emailSignupFixed, afterPromo);
    breakdown.push({
      icon: '📧',
      label: 'Email Signup',
      value: -emailDiscount
    });
  }
  const afterEmail = afterPromo - emailDiscount;
  
  // NET SPEND - This is what hits your card
  const netSpend = afterEmail;
  
  // ============================================
  // STEP 3: Check card offer threshold
  // ============================================
  const cardThreshold = input.cardMinSpend || 0;
  const meetsCardThreshold = netSpend >= cardThreshold;
  const shortfall = meetsCardThreshold ? 0 : cardThreshold - netSpend;
  
  // Calculate minimum cart value needed to qualify
  let minimumCartToQualify = cardThreshold;
  const totalDiscountPercent = (input.promoCodePercent || 0) + (input.emailSignupPercent || 0);
  const totalDiscountFixed = (input.promoCodeFixed || 0) + (input.emailSignupFixed || 0);
  
  if (totalDiscountPercent > 0) {
    // If you have X% off total, you need: threshold / (1 - X%)
    // e.g., $350 threshold with 20% off: 350 / 0.8 = $437.50 cart needed
    minimumCartToQualify = (cardThreshold + totalDiscountFixed) / (1 - totalDiscountPercent / 100);
  } else if (totalDiscountFixed > 0) {
    minimumCartToQualify = cardThreshold + totalDiscountFixed;
  }
  
  if (!meetsCardThreshold && cardThreshold > 0) {
    warnings.push(
      `⚠️ After discounts, your spend is $${netSpend.toFixed(2)} — need $${cardThreshold} to get card offer. ` +
      `Cart needs to be at least $${minimumCartToQualify.toFixed(2)} pre-discount.`
    );
  }
  
  // ============================================
  // STEP 4: Calculate card offer value
  // ============================================
  let cardCashbackValue = 0;
  let cardPointsValue = 0;
  let cardPointsAmount = 0;
  
  if (meetsCardThreshold || cardThreshold === 0) {
    // Fixed cashback (e.g., "$75 back")
    if (input.cardCashbackFixed) {
      cardCashbackValue = input.cardCashbackFixed;
      // Apply max redemption cap if specified
      if (input.cardMaxRedemption) {
        cardCashbackValue = Math.min(cardCashbackValue, input.cardMaxRedemption);
      }
      breakdown.push({
        icon: '💳',
        label: input.cardName || 'Card Offer',
        value: cardCashbackValue,
        note: `$${input.cardCashbackFixed} back on $${cardThreshold}+ spend`
      });
    }
    // Percentage cashback (e.g., "10% back")
    else if (input.cardCashbackPercent) {
      cardCashbackValue = netSpend * (input.cardCashbackPercent / 100);
      if (input.cardMaxRedemption) {
        cardCashbackValue = Math.min(cardCashbackValue, input.cardMaxRedemption);
      }
      breakdown.push({
        icon: '💳',
        label: input.cardName || 'Card Offer',
        value: cardCashbackValue,
        note: `${input.cardCashbackPercent}% back`
      });
    }
    // Points back (e.g., "5,000 MR points")
    if (input.cardPointsAmount) {
      cardPointsAmount = input.cardPointsAmount;
      const pointValue = POINT_VALUES[input.cardPointsProgram || 'generic'];
      cardPointsValue = (cardPointsAmount * pointValue) / 100; // cents to dollars
      breakdown.push({
        icon: '⭐',
        label: 'Points Earned',
        value: cardPointsValue,
        note: `${cardPointsAmount.toLocaleString()} pts @ ${pointValue}¢ each`
      });
    }
  }
  
  const totalCardValue = cardCashbackValue + cardPointsValue;
  
  // ============================================
  // STEP 5: Calculate portal cashback
  // ============================================
  let portalValue = 0;
  if (input.portalCashbackPercent) {
    portalValue = netSpend * (input.portalCashbackPercent / 100);
    breakdown.push({
      icon: '💰',
      label: input.portalName || 'Cashback Portal',
      value: portalValue,
      note: `${input.portalCashbackPercent}% of $${netSpend.toFixed(2)}`
    });
  } else if (input.portalCashbackFixed) {
    portalValue = input.portalCashbackFixed;
    breakdown.push({
      icon: '💰',
      label: input.portalName || 'Cashback Portal',
      value: portalValue
    });
  }
  
  // ============================================
  // TOTALS
  // ============================================
  const totalDiscounts = promoDiscount + emailDiscount;
  const totalCashback = totalCardValue + portalValue;
  const totalSavings = totalDiscounts + totalCashback;
  const finalEffectiveCost = cartValue - totalSavings;
  const effectiveDiscountPercent = (totalSavings / cartValue) * 100;
  
  // Count stack layers
  const layers = [
    promoDiscount > 0,
    emailDiscount > 0,
    totalCardValue > 0,
    portalValue > 0
  ].filter(Boolean).length;
  
  const stackType = getStackTypeName(layers);
  
  // Build summary
  const summary = buildSummary(cartValue, finalEffectiveCost, effectiveDiscountPercent, stackType);
  
  return {
    originalCart: cartValue,
    promoDiscount,
    afterPromo,
    emailDiscount,
    afterEmail,
    netSpend,
    meetsCardThreshold,
    cardThreshold,
    shortfall,
    minimumCartToQualify,
    cardCashbackValue,
    cardPointsValue,
    cardPointsAmount,
    totalCardValue,
    portalValue,
    totalDiscounts,
    totalCashback,
    totalSavings,
    finalEffectiveCost,
    effectiveDiscountPercent,
    stackLayers: layers,
    stackType,
    breakdown,
    warnings,
    summary
  };
}

function getStackTypeName(layers: number): string {
  switch (layers) {
    case 0: return 'No Stack';
    case 1: return 'Single';
    case 2: return 'Double Stack';
    case 3: return 'Triple Stack';
    case 4: return 'Quad Stack';
    default: return `${layers}x Stack`;
  }
}

function buildSummary(original: number, final: number, percent: number, stackType: string): string {
  return `${stackType}: $${original.toFixed(0)} → $${final.toFixed(2)} (${Math.round(percent)}% off)`;
}

/**
 * Calculate the minimum cart value needed to hit a threshold after discounts
 */
export function calculateMinimumCart(
  threshold: number,
  promoPercent: number = 0,
  promoFixed: number = 0,
  emailPercent: number = 0,
  emailFixed: number = 0
): number {
  const totalPercent = promoPercent + emailPercent;
  const totalFixed = promoFixed + emailFixed;
  
  if (totalPercent >= 100) {
    return Infinity; // Can't hit threshold with 100%+ off
  }
  
  // threshold = cart * (1 - percent/100) - fixed
  // cart = (threshold + fixed) / (1 - percent/100)
  return (threshold + totalFixed) / (1 - totalPercent / 100);
}

/**
 * Format result as human-readable text
 */
export function formatDealStackResult(result: DealStackResult): string {
  const lines: string[] = [
    `🛒 Cart Value: $${result.originalCart.toFixed(2)}`,
    ''
  ];
  
  // Add breakdown
  for (const item of result.breakdown) {
    const valueStr = item.value >= 0 
      ? `+$${item.value.toFixed(2)}` 
      : `-$${Math.abs(item.value).toFixed(2)}`;
    lines.push(`${item.icon} ${item.label}: ${valueStr}${item.note ? ` (${item.note})` : ''}`);
  }
  
  // Add warnings
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push(...result.warnings);
  }
  
  // Add totals
  lines.push('');
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💵 Net Spend (charged to card): $${result.netSpend.toFixed(2)}`);
  lines.push(`💸 Total Savings: $${result.totalSavings.toFixed(2)}`);
  lines.push(`✨ Final Cost: $${result.finalEffectiveCost.toFixed(2)}`);
  lines.push(`🔥 Effective Discount: ${Math.round(result.effectiveDiscountPercent)}% off`);
  lines.push(`📊 ${result.stackType}`);
  
  return lines.join('\n');
}

// ============================================
// LEGACY EXPORTS (for backwards compatibility)
// ============================================

export interface DealComponents {
  originalPrice: number;
  signupDiscountPercent?: number;
  signupDiscountFixed?: number;
  cardOfferBack?: number;
  cardOfferMinSpend?: number;
  cardOfferPercent?: number;
  cashbackPercent?: number;
  cashbackFixed?: number;
  portalName?: string;
}

export interface DealCalculation {
  originalPrice: number;
  priceAfterSignup: number;
  signupSavings: number;
  cardOfferValue: number;
  meetsMinSpend: boolean;
  cashbackValue: number;
  totalSavings: number;
  finalCost: number;
  effectiveDiscountPercent: number;
  summary: string;
  breakdown: string[];
}

export function calculateStackedDeal(components: DealComponents): DealCalculation {
  // Map old interface to new
  const result = calculateDealStack({
    cartValue: components.originalPrice,
    emailSignupPercent: components.signupDiscountPercent,
    emailSignupFixed: components.signupDiscountFixed,
    cardCashbackFixed: components.cardOfferBack,
    cardCashbackPercent: components.cardOfferPercent,
    cardMinSpend: components.cardOfferMinSpend,
    portalCashbackPercent: components.cashbackPercent,
    portalCashbackFixed: components.cashbackFixed,
    portalName: components.portalName
  });
  
  // Map back to old interface
  return {
    originalPrice: result.originalCart,
    priceAfterSignup: result.afterEmail,
    signupSavings: result.emailDiscount,
    cardOfferValue: result.totalCardValue,
    meetsMinSpend: result.meetsCardThreshold,
    cashbackValue: result.portalValue,
    totalSavings: result.totalSavings,
    finalCost: result.finalEffectiveCost,
    effectiveDiscountPercent: result.effectiveDiscountPercent,
    summary: result.summary,
    breakdown: result.breakdown.map(b => `${b.icon} ${b.label}: $${Math.abs(b.value).toFixed(2)}`)
  };
}

export function parseCardOffer(offerString: string): { 
  back?: number; 
  minSpend?: number; 
  percent?: number;
} {
  const result: { back?: number; minSpend?: number; percent?: number } = {};
  
  const dollarMatch = offerString.match(/\$(\d+(?:\.\d+)?)\s*back/i);
  if (dollarMatch) {
    result.back = parseFloat(dollarMatch[1]);
  }
  
  const percentMatch = offerString.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    result.percent = parseFloat(percentMatch[1]);
  }
  
  const minSpendMatch = offerString.match(/(?:on\s*)?\$(\d+(?:,\d{3})*(?:\.\d+)?)\+?\s*(?:spend|purchase)?/i);
  if (minSpendMatch) {
    result.minSpend = parseFloat(minSpendMatch[1].replace(/,/g, ''));
  }
  
  return result;
}

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
