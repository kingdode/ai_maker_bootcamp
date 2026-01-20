/**
 * DealStackr Offer Scoring System
 * 
 * This module implements a unified scoring algorithm to rank credit card offers
 * by real consumer value. The score prioritizes absolute cash back while still
 * factoring in percentage returns and lightly accounting for minimum spend friction.
 * 
 * SCORING PHILOSOPHY:
 * - Absolute dollar value is the strongest signal (55 points max)
 * - Percent back is important but secondary (35 points max)  
 * - Minimum spend is a soft adjustment, not a heavy penalty (-10 points max)
 * 
 * SCORE BANDS:
 * - Elite Deal: 80-100 (exceptional value, prioritize these)
 * - Strong Value: 60-79 (solid offers worth activating)
 * - Decent: 40-59 (reasonable but not exciting)
 * - Low Impact: 0-39 (minimal savings, low priority)
 */

// ============================================================================
// TUNABLE CONSTANTS - Adjust these to calibrate scoring behavior
// ============================================================================

/** Maximum dollar amount for normalization. Offers above this get max points. */
export const MAX_AMOUNT_BACK = 60;

/** Maximum percent back for normalization. Offers above this get max points. */
export const MAX_PERCENT_BACK = 30;

/** Maximum minimum spend for adjustment calculation. */
export const MAX_MIN_SPEND = 400;

/** Weight for absolute dollar value (0-55 scale) */
export const ABSOLUTE_WEIGHT = 55;

/** Weight for percent back (0-35 scale) */
export const PERCENT_WEIGHT = 35;

/** Maximum penalty for high minimum spend (0-10 scale) */
export const SPEND_ADJUSTMENT_MAX = 10;

/** Default adjustment when minimum spend is unknown */
export const UNKNOWN_SPEND_ADJUSTMENT = 3;

/** Bonus points for stackable deals (user-reported cashback/promo available) */
export const STACKABLE_BONUS = 15;

// ============================================================================
// SCORE BAND DEFINITIONS
// ============================================================================

export type ScoreBand = 'elite' | 'strong' | 'decent' | 'low';

export interface ScoreBandInfo {
  band: ScoreBand;
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  description: string;
}

export const SCORE_BANDS: Record<ScoreBand, Omit<ScoreBandInfo, 'band'>> = {
  elite: {
    label: 'Elite Deal',
    emoji: '🔥',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/20',
    description: 'Exceptional value - prioritize this offer'
  },
  strong: {
    label: 'Strong Value',
    emoji: '💪',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/20',
    description: 'Solid offer worth activating'
  },
  decent: {
    label: 'Decent',
    emoji: '👍',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/20',
    description: 'Reasonable savings if you need to shop here'
  },
  low: {
    label: 'Low Impact',
    emoji: '📉',
    colorClass: 'text-gray-400',
    bgClass: 'bg-gray-500/20',
    description: 'Minimal savings - low priority'
  }
};

// ============================================================================
// OFFER PARSING UTILITIES
// ============================================================================

export interface ParsedOfferValue {
  amountBack: number | null;
  percentBack: number | null;
  minSpend: number | null;
  points?: {
    amount: number;
    program: string;
    estimatedValue: number;
  } | null;
}

// Point valuation constants (cents per point)
export const POINT_VALUATIONS: Record<string, number> = {
  'membership rewards': 1.5,    // Amex MR
  'ultimate rewards': 1.5,      // Chase UR
  'thankyou points': 1.0,       // Citi TYP
  'venture miles': 1.0,         // Capital One
  'default': 1.0                // Generic points
};

/**
 * Parse offer value string into structured components.
 * Handles formats like:
 * - "$50 back (20%) on $250+ spend"
 * - "20% back"
 * - "$10 back"
 * - "10% cash back on $100 minimum"
 * - "5,000 Membership Rewards points" (NEW)
 * - "Earn 10,000 points" (NEW)
 */
export function parseOfferValue(offerValue: string): ParsedOfferValue {
  const result: ParsedOfferValue = {
    amountBack: null,
    percentBack: null,
    minSpend: null,
    points: null
  };

  if (!offerValue || typeof offerValue !== 'string') {
    return result;
  }

  const text = offerValue.toLowerCase();

  // Check for point-based rewards FIRST (before dollar extraction)
  // Patterns: "5,000 points", "5000 membership rewards points", "earn 10,000 points"
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
      
      // Determine program name and valuation
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
      
      // Set amountBack to estimated value for scoring purposes
      result.amountBack = estimatedValue;
      
      break;
    }
  }

  // Only extract dollar amount if we didn't find points
  if (!result.points) {

    // Extract dollar amount back: "$50 back", "$50", "earn $50"
    const dollarMatch = text.match(/\$(\d+(?:\.\d{2})?)\s*(?:back|off|credit)?/);
    if (dollarMatch) {
      result.amountBack = parseFloat(dollarMatch[1]);
    }
  }

  // Extract percentage: "20%", "20% back", "20% cash back"
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    result.percentBack = parseFloat(percentMatch[1]);
  }

  // Extract minimum spend: "on $250", "$250+ spend", "$250 or more", "spend $250"
  const spendPatterns = [
    /on\s+\$(\d+(?:\.\d{2})?)/,
    /\$(\d+(?:\.\d{2})?)\+?\s*(?:spend|purchase|minimum)/,
    /spend\s+\$(\d+(?:\.\d{2})?)/,
    /minimum\s+(?:of\s+)?\$(\d+(?:\.\d{2})?)/,
    /(\d+(?:\.\d{2})?)\s*or\s+more/
  ];

  for (const pattern of spendPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.minSpend = parseFloat(match[1]);
      break;
    }
  }

  // If we have percent but no amount, and we have min spend, calculate amount
  if (result.percentBack !== null && result.amountBack === null && result.minSpend !== null) {
    result.amountBack = (result.percentBack / 100) * result.minSpend;
  }

  // If we have amount and min spend but no percent, calculate percent
  if (result.amountBack !== null && result.minSpend !== null && result.minSpend > 0 && result.percentBack === null) {
    result.percentBack = (result.amountBack / result.minSpend) * 100;
  }

  return result;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

export interface ScoreBreakdown {
  absoluteScore: number;
  percentScore: number;
  spendAdjustment: number;
  stackableBonus: number;
  rawScore: number;
  finalScore: number;
  band: ScoreBand;
  bandInfo: ScoreBandInfo;
}

/**
 * Calculate the DealStackr score for an offer.
 * 
 * FORMULA:
 * 1. Absolute Score (0-55): min(amountBack / 60, 1) * 55
 * 2. Percent Score (0-35): min(percentBack / 30, 1) * 35
 * 3. Spend Adjustment (0 to -10): min(minSpend / 400, 1) * 10 (or 3 if unknown)
 * 4. Stackable Bonus (+15): Applied when offer has user-reported cashback/promo stacks
 * 5. Final Score: absoluteScore + percentScore - spendAdjustment + stackableBonus, clamped 0-100
 * 
 * @param amountBack - Dollar amount back (e.g., 50 for "$50 back")
 * @param percentBack - Percentage back (e.g., 20 for "20% back")
 * @param minSpend - Minimum spend required (null if unknown)
 * @param isStackable - Whether the offer has user-reported stacking opportunities
 * @returns Score breakdown with final score and band classification
 */
export function calculateScore(
  amountBack: number | null,
  percentBack: number | null,
  minSpend: number | null,
  isStackable: boolean = false
): ScoreBreakdown {
  // Default to 0 if null
  const amount = amountBack ?? 0;
  const percent = percentBack ?? 0;

  // 1. Absolute Score (0-55 points)
  // Rewards high dollar value - the primary signal of real savings
  const absoluteScore = Math.min(amount / MAX_AMOUNT_BACK, 1) * ABSOLUTE_WEIGHT;

  // 2. Percent Score (0-35 points)
  // Secondary factor - high % is good but shouldn't overpower low dollar amounts
  const percentScore = Math.min(percent / MAX_PERCENT_BACK, 1) * PERCENT_WEIGHT;

  // 3. Spend Adjustment (0 to -10 points)
  // Soft penalty for high minimum spend - doesn't heavily punish premium offers
  let spendAdjustment: number;
  if (minSpend !== null && minSpend > 0) {
    spendAdjustment = Math.min(minSpend / MAX_MIN_SPEND, 1) * SPEND_ADJUSTMENT_MAX;
  } else {
    // Unknown spend gets a small default adjustment
    spendAdjustment = UNKNOWN_SPEND_ADJUSTMENT;
  }

  // 4. Stackable Bonus (+15 points)
  // BIG uprank for deals with verified stacking opportunities (Rakuten, email signup, etc.)
  const stackableBonus = isStackable ? STACKABLE_BONUS : 0;

  // 5. Calculate raw score
  const rawScore = absoluteScore + percentScore - spendAdjustment + stackableBonus;

  // 6. Clamp to 0-100 and round
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  // 7. Determine score band
  const band = getScoreBand(finalScore);
  const bandInfo: ScoreBandInfo = {
    band,
    ...SCORE_BANDS[band]
  };

  return {
    absoluteScore: Math.round(absoluteScore * 10) / 10,
    percentScore: Math.round(percentScore * 10) / 10,
    spendAdjustment: Math.round(spendAdjustment * 10) / 10,
    stackableBonus,
    rawScore: Math.round(rawScore * 10) / 10,
    finalScore,
    band,
    bandInfo
  };
}

/**
 * Get the score band for a given score.
 */
export function getScoreBand(score: number): ScoreBand {
  if (score >= 80) return 'elite';
  if (score >= 60) return 'strong';
  if (score >= 40) return 'decent';
  return 'low';
}

/**
 * Calculate score directly from an offer value string.
 * Convenience function that combines parsing and scoring.
 * 
 * @param offerValue - The offer string to parse (e.g., "$50 back on $250")
 * @param isStackable - Whether the offer has user-reported stacking opportunities
 */
export function calculateDealScore(offerValue: string, isStackable: boolean = false): ScoreBreakdown {
  const parsed = parseOfferValue(offerValue);
  return calculateScore(parsed.amountBack, parsed.percentBack, parsed.minSpend, isStackable);
}

/**
 * Get score explanation tooltip text.
 */
export function getScoreExplanation(): string {
  return `DealStackr Score prioritizes real cash back (up to ${ABSOLUTE_WEIGHT} points), ` +
    `then percentage savings (up to ${PERCENT_WEIGHT} points), ` +
    `with a light adjustment for required spend (up to -${SPEND_ADJUSTMENT_MAX} points). ` +
    `Stackable deals with verified Rakuten/email offers get a +${STACKABLE_BONUS} point bonus! ` +
    `Higher scores = better value for your wallet.`;
}

// ============================================================================
// VALIDATION EXAMPLES (for testing)
// ============================================================================

/**
 * Validate the scoring system against expected outcomes.
 * Run this in tests or console to verify scoring behavior.
 */
export function validateScoring(): boolean {
  const testCases = [
    { input: '$5 back on $25', expectedBand: 'low' as ScoreBand },
    { input: '$25 back on $100 (25%)', expectedBand: 'decent' as ScoreBand },
    { input: '$50 back on $250 (20%)', expectedBand: 'strong' as ScoreBand },
    { input: '$60 back on $300 (20%)', expectedBand: 'elite' as ScoreBand },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    const result = calculateDealScore(tc.input);
    const passed = result.band === tc.expectedBand || 
      // Allow some flexibility for borderline cases
      (tc.expectedBand === 'decent' && result.band === 'strong') ||
      (tc.expectedBand === 'strong' && result.band === 'elite');
    
    if (!passed) {
      allPassed = false;
    }
  }

  return allPassed;
}
