/**
 * DealStackr Offer Scoring System
 * 
 * Unified scoring algorithm to rank credit card offers by real consumer value.
 * Prioritizes absolute cash back while factoring in percentage returns and
 * lightly accounting for minimum spend friction.
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

const SCORING_CONFIG = {
  /** Maximum dollar amount for normalization. Offers above this get max points. */
  MAX_AMOUNT_BACK: 60,
  
  /** Maximum percent back for normalization. Offers above this get max points. */
  MAX_PERCENT_BACK: 30,
  
  /** Maximum minimum spend for adjustment calculation. */
  MAX_MIN_SPEND: 400,
  
  /** Weight for absolute dollar value (0-55 scale) */
  ABSOLUTE_WEIGHT: 55,
  
  /** Weight for percent back (0-35 scale) */
  PERCENT_WEIGHT: 35,
  
  /** Maximum penalty for high minimum spend (0-10 scale) */
  SPEND_ADJUSTMENT_MAX: 10,
  
  /** Default adjustment when minimum spend is unknown */
  UNKNOWN_SPEND_ADJUSTMENT: 3
};

// ============================================================================
// SCORE BAND DEFINITIONS
// ============================================================================

const SCORE_BANDS = {
  elite: {
    label: 'Elite Deal',
    emoji: '🔥',
    colorClass: 'elite-badge',
    bgColor: 'rgba(251, 191, 36, 0.2)',
    textColor: '#fbbf24',
    description: 'Exceptional value - prioritize this offer',
    minScore: 80
  },
  strong: {
    label: 'Strong Value',
    emoji: '💪',
    colorClass: 'strong-badge',
    bgColor: 'rgba(52, 211, 153, 0.2)',
    textColor: '#34d399',
    description: 'Solid offer worth activating',
    minScore: 60
  },
  decent: {
    label: 'Decent',
    emoji: '👍',
    colorClass: 'decent-badge',
    bgColor: 'rgba(96, 165, 250, 0.2)',
    textColor: '#60a5fa',
    description: 'Reasonable savings if you need to shop here',
    minScore: 40
  },
  low: {
    label: 'Low Impact',
    emoji: '📉',
    colorClass: 'low-badge',
    bgColor: 'rgba(156, 163, 175, 0.2)',
    textColor: '#9ca3af',
    description: 'Minimal savings - low priority',
    minScore: 0
  }
};

// ============================================================================
// OFFER PARSING UTILITIES
// ============================================================================

/**
 * Parse offer value string into structured components.
 * Handles formats like:
 * - "$50 back (20%) on $250+ spend"
 * - "20% back"
 * - "$10 back"
 * - "10% cash back on $100 minimum"
 * 
 * @param {string} offerValue - The offer value string to parse
 * @returns {{ amountBack: number|null, percentBack: number|null, minSpend: number|null }}
 */
function parseOfferValue(offerValue) {
  const result = {
    amountBack: null,
    percentBack: null,
    minSpend: null
  };

  if (!offerValue || typeof offerValue !== 'string') {
    return result;
  }

  const text = offerValue.toLowerCase();

  // Extract dollar amount back: "$50 back", "$50", "earn $50"
  const dollarMatch = text.match(/\$(\d+(?:\.\d{2})?)\s*(?:back|off|credit)?/);
  if (dollarMatch) {
    result.amountBack = parseFloat(dollarMatch[1]);
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

/**
 * Get the score band for a given score.
 * @param {number} score - The final score (0-100)
 * @returns {string} The band name: 'elite', 'strong', 'decent', or 'low'
 */
function getScoreBand(score) {
  if (score >= 80) return 'elite';
  if (score >= 60) return 'strong';
  if (score >= 40) return 'decent';
  return 'low';
}

/**
 * Calculate the DealStackr score for an offer.
 * 
 * FORMULA:
 * 1. Absolute Score (0-55): min(amountBack / 60, 1) * 55
 * 2. Percent Score (0-35): min(percentBack / 30, 1) * 35
 * 3. Spend Adjustment (0 to -10): min(minSpend / 400, 1) * 10 (or 3 if unknown)
 * 4. Final Score: absoluteScore + percentScore - spendAdjustment, clamped 0-100
 * 
 * @param {number|null} amountBack - Dollar amount back (e.g., 50 for "$50 back")
 * @param {number|null} percentBack - Percentage back (e.g., 20 for "20% back")
 * @param {number|null} minSpend - Minimum spend required (null if unknown)
 * @returns {Object} Score breakdown with final score and band classification
 */
function calculateScore(amountBack, percentBack, minSpend) {
  const config = SCORING_CONFIG;
  
  // Default to 0 if null
  const amount = amountBack ?? 0;
  const percent = percentBack ?? 0;

  // 1. Absolute Score (0-55 points)
  // Rewards high dollar value - the primary signal of real savings
  const absoluteScore = Math.min(amount / config.MAX_AMOUNT_BACK, 1) * config.ABSOLUTE_WEIGHT;

  // 2. Percent Score (0-35 points)
  // Secondary factor - high % is good but shouldn't overpower low dollar amounts
  const percentScore = Math.min(percent / config.MAX_PERCENT_BACK, 1) * config.PERCENT_WEIGHT;

  // 3. Spend Adjustment (0 to -10 points)
  // Soft penalty for high minimum spend - doesn't heavily punish premium offers
  let spendAdjustment;
  if (minSpend !== null && minSpend > 0) {
    spendAdjustment = Math.min(minSpend / config.MAX_MIN_SPEND, 1) * config.SPEND_ADJUSTMENT_MAX;
  } else {
    // Unknown spend gets a small default adjustment
    spendAdjustment = config.UNKNOWN_SPEND_ADJUSTMENT;
  }

  // 4. Calculate raw score
  const rawScore = absoluteScore + percentScore - spendAdjustment;

  // 5. Clamp to 0-100 and round
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  // 6. Determine score band
  const band = getScoreBand(finalScore);
  const bandInfo = { ...SCORE_BANDS[band], band };

  return {
    absoluteScore: Math.round(absoluteScore * 10) / 10,
    percentScore: Math.round(percentScore * 10) / 10,
    spendAdjustment: Math.round(spendAdjustment * 10) / 10,
    rawScore: Math.round(rawScore * 10) / 10,
    finalScore,
    band,
    bandInfo
  };
}

/**
 * Calculate score directly from an offer value string.
 * Convenience function that combines parsing and scoring.
 * 
 * @param {string} offerValue - The offer value string (e.g., "$50 back (20%) on $250+ spend")
 * @returns {Object} Score breakdown with final score and band classification
 */
function calculateDealScore(offerValue) {
  const parsed = parseOfferValue(offerValue);
  return calculateScore(parsed.amountBack, parsed.percentBack, parsed.minSpend);
}

/**
 * Get score explanation tooltip text.
 * @returns {string} Human-readable explanation of the scoring system
 */
function getScoreExplanation() {
  const config = SCORING_CONFIG;
  return `DealStackr Score prioritizes real cash back (up to ${config.ABSOLUTE_WEIGHT} points), ` +
    `then percentage savings (up to ${config.PERCENT_WEIGHT} points), ` +
    `with a light adjustment for required spend (up to -${config.SPEND_ADJUSTMENT_MAX} points). ` +
    `Higher scores = better value for your wallet.`;
}

/**
 * Get CSS for score badges.
 * @returns {string} CSS styles for score badges
 */
function getScoreBadgeStyles() {
  return `
    .deal-score-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .deal-score-badge.elite-badge {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }
    .deal-score-badge.strong-badge {
      background: rgba(52, 211, 153, 0.2);
      color: #34d399;
    }
    .deal-score-badge.decent-badge {
      background: rgba(96, 165, 250, 0.2);
      color: #60a5fa;
    }
    .deal-score-badge.low-badge {
      background: rgba(156, 163, 175, 0.2);
      color: #9ca3af;
    }
    .deal-score-number {
      font-weight: 700;
      font-size: 12px;
    }
    .deal-score-tooltip {
      position: relative;
      cursor: help;
    }
    .deal-score-tooltip::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: #e5e7eb;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 400;
      white-space: normal;
      width: 240px;
      text-align: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .deal-score-tooltip:hover::after {
      opacity: 1;
    }
  `;
}

/**
 * Create a score badge HTML element.
 * @param {Object} scoreResult - Result from calculateDealScore()
 * @param {boolean} showTooltip - Whether to show tooltip on hover
 * @returns {string} HTML string for the badge
 */
function createScoreBadgeHTML(scoreResult, showTooltip = true) {
  const { finalScore, bandInfo } = scoreResult;
  const tooltipAttr = showTooltip ? `data-tooltip="${bandInfo.description}"` : '';
  const tooltipClass = showTooltip ? 'deal-score-tooltip' : '';
  
  return `
    <span class="deal-score-badge ${bandInfo.colorClass} ${tooltipClass}" ${tooltipAttr}>
      <span class="deal-score-number">${finalScore}</span>
      <span>${bandInfo.emoji}</span>
      <span>${bandInfo.label}</span>
    </span>
  `;
}

// ============================================================================
// VALIDATION (for testing)
// ============================================================================

/**
 * Validate the scoring system against expected outcomes.
 */
function validateScoring() {
  const testCases = [
    { input: '$5 back on $25', expectedBand: 'low' },
    { input: '$25 back on $100 (25%)', expectedBand: 'decent' },
    { input: '$50 back on $250 (20%)', expectedBand: 'strong' },
    { input: '$60 back on $300 (20%)', expectedBand: 'elite' },
  ];

  console.log('[DealStackr] Validating scoring system...');
  let allPassed = true;

  for (const tc of testCases) {
    const result = calculateDealScore(tc.input);
    const passed = result.band === tc.expectedBand || 
      (tc.expectedBand === 'decent' && result.band === 'strong') ||
      (tc.expectedBand === 'strong' && result.band === 'elite');
    
    if (!passed) {
      console.warn(`FAIL: "${tc.input}" scored ${result.finalScore} (${result.band}), expected ${tc.expectedBand}`);
      allPassed = false;
    } else {
      console.log(`PASS: "${tc.input}" → ${result.finalScore} (${result.band})`);
    }
  }

  return allPassed;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SCORING_CONFIG,
    SCORE_BANDS,
    parseOfferValue,
    calculateScore,
    calculateDealScore,
    getScoreBand,
    getScoreExplanation,
    getScoreBadgeStyles,
    createScoreBadgeHTML,
    validateScoring
  };
}
