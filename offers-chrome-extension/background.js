/**
 * Background Service Worker for DealStackr Extension
 * 
 * Handles:
 * - Affiliate signal processing and confidence scoring
 * - Merchant data storage and retrieval
 * - Combining card offers with affiliate data for stack value
 */

// Import affiliate data (inline for service worker compatibility)
const AFFILIATE_MERCHANT_DATA = {
  "target.com": { name: "Target", reliability: "high", portals: ["rakuten", "topcashback", "honey"], typicalRate: "1-2%" },
  "walmart.com": { name: "Walmart", reliability: "medium", portals: ["rakuten", "topcashback"], typicalRate: "1-5%" },
  "amazon.com": { name: "Amazon", reliability: "low", portals: ["topcashback"], typicalRate: "0.5-1%" },
  "costco.com": { name: "Costco", reliability: "medium", portals: ["rakuten"], typicalRate: "1-2%" },
  "bestbuy.com": { name: "Best Buy", reliability: "high", portals: ["rakuten", "topcashback", "honey", "retailmenot"], typicalRate: "1-2%" },
  "homedepot.com": { name: "Home Depot", reliability: "high", portals: ["rakuten", "topcashback", "befrugal"], typicalRate: "1-2%" },
  "lowes.com": { name: "Lowe's", reliability: "high", portals: ["rakuten", "topcashback", "retailmenot"], typicalRate: "1-2%" },
  "nike.com": { name: "Nike", reliability: "high", portals: ["rakuten", "topcashback", "honey", "befrugal"], typicalRate: "2-8%" },
  "adidas.com": { name: "Adidas", reliability: "high", portals: ["rakuten", "topcashback", "honey"], typicalRate: "4-8%" },
  "macys.com": { name: "Macy's", reliability: "high", portals: ["rakuten", "topcashback", "honey", "retailmenot", "befrugal"], typicalRate: "2-10%" },
  "nordstrom.com": { name: "Nordstrom", reliability: "high", portals: ["rakuten", "topcashback", "honey"], typicalRate: "2-6%" },
  "gap.com": { name: "Gap", reliability: "high", portals: ["rakuten", "topcashback", "honey", "retailmenot"], typicalRate: "4-10%" },
  "oldnavy.com": { name: "Old Navy", reliability: "high", portals: ["rakuten", "topcashback", "honey"], typicalRate: "4-8%" },
  "sephora.com": { name: "Sephora", reliability: "high", portals: ["rakuten", "topcashback", "honey", "befrugal"], typicalRate: "2-8%" },
  "ulta.com": { name: "Ulta Beauty", reliability: "high", portals: ["rakuten", "topcashback", "retailmenot"], typicalRate: "2-6%" },
  "apple.com": { name: "Apple", reliability: "medium", portals: ["rakuten", "topcashback"], typicalRate: "0.5-2%" },
  "samsung.com": { name: "Samsung", reliability: "high", portals: ["rakuten", "topcashback", "honey"], typicalRate: "1-4%" },
  "dell.com": { name: "Dell", reliability: "high", portals: ["rakuten", "topcashback", "befrugal"], typicalRate: "2-6%" },
  "hotels.com": { name: "Hotels.com", reliability: "high", portals: ["rakuten", "topcashback", "mrrebates"], typicalRate: "3-6%" },
  "expedia.com": { name: "Expedia", reliability: "high", portals: ["rakuten", "topcashback", "befrugal"], typicalRate: "2-5%" },
  "booking.com": { name: "Booking.com", reliability: "high", portals: ["rakuten", "topcashback"], typicalRate: "3-6%" },
  "wayfair.com": { name: "Wayfair", reliability: "high", portals: ["rakuten", "topcashback", "honey", "retailmenot"], typicalRate: "2-6%" },
  "chewy.com": { name: "Chewy", reliability: "high", portals: ["rakuten", "topcashback", "honey"], typicalRate: "2-5%" },
  "doordash.com": { name: "DoorDash", reliability: "high", portals: ["rakuten", "topcashback"], typicalRate: "$1-5" },
  "instacart.com": { name: "Instacart", reliability: "high", portals: ["rakuten", "topcashback"], typicalRate: "1-3%" },
  "staples.com": { name: "Staples", reliability: "high", portals: ["rakuten", "topcashback", "befrugal"], typicalRate: "1-5%" },
  "walgreens.com": { name: "Walgreens", reliability: "high", portals: ["rakuten", "topcashback", "retailmenot"], typicalRate: "1-4%" },
  "cvs.com": { name: "CVS", reliability: "high", portals: ["rakuten", "topcashback"], typicalRate: "1-3%" },
  "petco.com": { name: "Petco", reliability: "high", portals: ["rakuten", "topcashback"], typicalRate: "2-4%" },
  "petsmart.com": { name: "PetSmart", reliability: "high", portals: ["rakuten", "topcashback"], typicalRate: "2-4%" }
};

const CASHBACK_PORTALS = {
  rakuten: { name: "Rakuten", url: "https://www.rakuten.com", color: "#bf0000" },
  topcashback: { name: "TopCashback", url: "https://www.topcashback.com", color: "#00a651" },
  honey: { name: "Honey", url: "https://www.joinhoney.com", color: "#ff6801" },
  retailmenot: { name: "RetailMeNot", url: "https://www.retailmenot.com", color: "#e41b23" },
  befrugal: { name: "BeFrugal", url: "https://www.befrugal.com", color: "#1a73e8" },
  mrrebates: { name: "Mr. Rebates", url: "https://www.mrrebates.com", color: "#333333" }
};

// Confidence scoring weights
const SCORE_WEIGHTS = {
  staticMapping: {
    high: 40,
    medium: 25,
    low: 10
  },
  signals: {
    urlParams: 15,
    redirectLinks: 20,
    affiliateScripts: 15,
    couponField: 10
  },
  bonuses: {
    multipleSignals: 10,      // Bonus when 2+ signals detected
    checkoutPage: 5,          // Bonus on checkout/cart pages
    multiplePortals: 5        // Bonus for merchants in multiple portals
  }
};

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  high: 60,      // 60+ = "Cashback likely available"
  medium: 35,    // 35-59 = "Cashback may be available"
  low: 15        // 15-34 = "Limited cashback signals"
                 // <15 = "No cashback signals detected"
};

/**
 * Calculate affiliate confidence score for a merchant
 * @param {string} domain - Merchant domain
 * @param {Object} signals - Detected signals from content script
 * @returns {Object} Confidence score and details
 */
function calculateConfidenceScore(domain, signals = {}) {
  let score = 0;
  const breakdown = [];
  
  // 1. Check static mapping
  const staticData = AFFILIATE_MERCHANT_DATA[domain];
  if (staticData) {
    const reliabilityScore = SCORE_WEIGHTS.staticMapping[staticData.reliability] || 0;
    score += reliabilityScore;
    breakdown.push({
      source: 'static_mapping',
      points: reliabilityScore,
      detail: `Known ${staticData.reliability} reliability merchant`
    });
    
    // Bonus for multiple portals
    if (staticData.portals && staticData.portals.length > 2) {
      score += SCORE_WEIGHTS.bonuses.multiplePortals;
      breakdown.push({
        source: 'multiple_portals',
        points: SCORE_WEIGHTS.bonuses.multiplePortals,
        detail: `Available on ${staticData.portals.length} portals`
      });
    }
  }
  
  // 2. Add signal scores
  const signalData = signals.signals || {};
  let signalCount = 0;
  
  if (signalData.urlParams && signalData.urlParams.hasParams) {
    score += SCORE_WEIGHTS.signals.urlParams;
    signalCount++;
    breakdown.push({
      source: 'url_params',
      points: SCORE_WEIGHTS.signals.urlParams,
      detail: `Affiliate params detected: ${signalData.urlParams.params.join(', ')}`
    });
  }
  
  if (signalData.redirectLinks && signalData.redirectLinks.hasRedirects) {
    score += SCORE_WEIGHTS.signals.redirectLinks;
    signalCount++;
    breakdown.push({
      source: 'redirect_links',
      points: SCORE_WEIGHTS.signals.redirectLinks,
      detail: `${signalData.redirectLinks.count} affiliate links found`
    });
  }
  
  if (signalData.affiliateScripts && signalData.affiliateScripts.hasScripts) {
    score += SCORE_WEIGHTS.signals.affiliateScripts;
    signalCount++;
    breakdown.push({
      source: 'affiliate_scripts',
      points: SCORE_WEIGHTS.signals.affiliateScripts,
      detail: 'Affiliate tracking scripts detected'
    });
  }
  
  if (signalData.couponField && signalData.couponField.hasCouponField) {
    score += SCORE_WEIGHTS.signals.couponField;
    signalCount++;
    breakdown.push({
      source: 'coupon_field',
      points: SCORE_WEIGHTS.signals.couponField,
      detail: 'Coupon/promo code field present'
    });
  }
  
  // 3. Apply bonuses
  if (signalCount >= 2) {
    score += SCORE_WEIGHTS.bonuses.multipleSignals;
    breakdown.push({
      source: 'multiple_signals_bonus',
      points: SCORE_WEIGHTS.bonuses.multipleSignals,
      detail: `${signalCount} signals corroborate each other`
    });
  }
  
  if (signalData.pageType && (signalData.pageType.isCheckout || signalData.pageType.isCart)) {
    score += SCORE_WEIGHTS.bonuses.checkoutPage;
    breakdown.push({
      source: 'checkout_bonus',
      points: SCORE_WEIGHTS.bonuses.checkoutPage,
      detail: 'On checkout/cart page'
    });
  }
  
  // Cap score at 100
  score = Math.min(score, 100);
  
  // Determine confidence level
  let confidenceLevel;
  let confidenceLabel;
  if (score >= CONFIDENCE_THRESHOLDS.high) {
    confidenceLevel = 'high';
    confidenceLabel = 'Cashback likely available';
  } else if (score >= CONFIDENCE_THRESHOLDS.medium) {
    confidenceLevel = 'medium';
    confidenceLabel = 'Cashback may be available';
  } else if (score >= CONFIDENCE_THRESHOLDS.low) {
    confidenceLevel = 'low';
    confidenceLabel = 'Limited cashback signals';
  } else {
    confidenceLevel = 'none';
    confidenceLabel = 'No cashback signals detected';
  }
  
  return {
    score: score,
    confidenceLevel: confidenceLevel,
    confidenceLabel: confidenceLabel,
    breakdown: breakdown,
    staticData: staticData || null,
    portals: staticData ? staticData.portals : [],
    typicalRate: staticData ? staticData.typicalRate : null
  };
}

/**
 * Store merchant affiliate data
 * @param {string} domain - Merchant domain
 * @param {Object} data - Affiliate data to store
 */
async function storeMerchantAffiliateData(domain, data) {
  try {
    const result = await chrome.storage.local.get(['merchantAffiliateData']);
    const affiliateData = result.merchantAffiliateData || {};
    
    affiliateData[domain] = {
      ...data,
      updatedAt: new Date().toISOString(),
      // TTL: 24 hours
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    await chrome.storage.local.set({ merchantAffiliateData: affiliateData });
    console.log('[DealStackr Background] Stored affiliate data for:', domain);
  } catch (error) {
    console.error('[DealStackr Background] Error storing affiliate data:', error);
  }
}

/**
 * Get merchant affiliate data
 * @param {string} domain - Merchant domain
 * @returns {Object|null} Affiliate data or null if not found/expired
 */
async function getMerchantAffiliateData(domain) {
  try {
    const result = await chrome.storage.local.get(['merchantAffiliateData']);
    const affiliateData = result.merchantAffiliateData || {};
    
    if (affiliateData[domain]) {
      // Check if expired
      const expiresAt = new Date(affiliateData[domain].expiresAt);
      if (expiresAt > new Date()) {
        return affiliateData[domain];
      } else {
        // Expired, remove it
        delete affiliateData[domain];
        await chrome.storage.local.set({ merchantAffiliateData: affiliateData });
      }
    }
    
    return null;
  } catch (error) {
    console.error('[DealStackr Background] Error getting affiliate data:', error);
    return null;
  }
}

/**
 * Find card offers for a merchant domain
 * @param {string} domain - Merchant domain
 * @returns {Array} Matching card offers
 */
async function findCardOffersForMerchant(domain) {
  try {
    const result = await chrome.storage.local.get(['allDeals', 'dealCohorts']);
    let allOffers = [];
    
    // Get all offers from cohorts
    if (result.dealCohorts && typeof result.dealCohorts === 'object') {
      Object.values(result.dealCohorts).forEach(cohortOffers => {
        if (Array.isArray(cohortOffers)) {
          allOffers.push(...cohortOffers);
        }
      });
    } else if (result.allDeals && Array.isArray(result.allDeals)) {
      allOffers = result.allDeals;
    }
    
    // Find matching offers by domain or merchant name
    const merchantName = AFFILIATE_MERCHANT_DATA[domain]?.name?.toLowerCase();
    const domainBase = domain.replace(/\.(com|net|org|co\.uk)$/, '');
    
    return allOffers.filter(offer => {
      const offerMerchant = (offer.merchant_name || offer.merchant || '').toLowerCase();
      return offerMerchant.includes(domainBase) || 
             (merchantName && offerMerchant.includes(merchantName));
    });
  } catch (error) {
    console.error('[DealStackr Background] Error finding card offers:', error);
    return [];
  }
}

/**
 * Calculate stack value combining card offers and affiliate cashback
 * @param {Array} cardOffers - Card offers for merchant
 * @param {Object} affiliateData - Affiliate confidence data
 * @returns {Object} Stack value information
 */
function calculateStackValue(cardOffers, affiliateData) {
  const result = {
    hasCardOffer: cardOffers.length > 0,
    hasAffiliateSignal: affiliateData && affiliateData.confidenceLevel !== 'none',
    isStackable: false,
    cardOffers: cardOffers,
    affiliateConfidence: affiliateData?.confidenceLevel || 'none',
    estimatedStack: null,
    stackMessage: null
  };
  
  // Determine if stackable
  result.isStackable = result.hasCardOffer && result.hasAffiliateSignal;
  
  if (result.isStackable) {
    // Build stack message
    const cardOffer = cardOffers[0];
    const cardValue = cardOffer.offer_value || 'Card offer';
    const affiliateRate = affiliateData.typicalRate || 'additional cashback';
    
    result.estimatedStack = `${cardValue} + ${affiliateRate}`;
    result.stackMessage = `Stack ${cardValue} with ${affiliateRate} from cashback portals`;
  } else if (result.hasCardOffer) {
    result.stackMessage = 'Card offer available';
  } else if (result.hasAffiliateSignal) {
    result.stackMessage = affiliateData.confidenceLabel;
  } else {
    result.stackMessage = 'No offers detected';
  }
  
  return result;
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[DealStackr Background] Received message:', request.action);
  
  if (request.action === 'reportAffiliateSignals') {
    // Process signals from content script
    (async () => {
      try {
        const signals = request.data;
        const domain = signals.domain;
        
        // Calculate confidence score
        const confidence = calculateConfidenceScore(domain, signals);
        
        // Store the data
        await storeMerchantAffiliateData(domain, {
          domain: domain,
          merchantName: signals.merchantName,
          url: signals.url,
          confidence: confidence,
          signals: signals.signals,
          signalCount: signals.signalCount
        });
        
        sendResponse({
          success: true,
          confidence: confidence.confidenceLevel,
          score: confidence.score
        });
      } catch (error) {
        console.error('[DealStackr Background] Error processing signals:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getAffiliateConfidence') {
    // Get affiliate confidence for a domain
    (async () => {
      try {
        const domain = request.domain;
        
        // Check cache first
        let affiliateData = await getMerchantAffiliateData(domain);
        
        if (!affiliateData) {
          // Calculate from static data only
          const confidence = calculateConfidenceScore(domain, {});
          affiliateData = {
            domain: domain,
            confidence: confidence,
            signals: {},
            signalCount: 0
          };
        }
        
        // Find matching card offers
        const cardOffers = await findCardOffersForMerchant(domain);
        
        // Calculate stack value
        const stackValue = calculateStackValue(cardOffers, affiliateData.confidence);
        
        sendResponse({
          success: true,
          domain: domain,
          affiliateData: affiliateData,
          cardOffers: cardOffers,
          stackValue: stackValue
        });
      } catch (error) {
        console.error('[DealStackr Background] Error getting confidence:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'getStackableOffers') {
    // Get all offers with stack potential
    (async () => {
      try {
        const result = await chrome.storage.local.get(['allDeals', 'dealCohorts', 'merchantAffiliateData']);
        let allOffers = [];
        
        // Get all offers
        if (result.dealCohorts && typeof result.dealCohorts === 'object') {
          Object.values(result.dealCohorts).forEach(cohortOffers => {
            if (Array.isArray(cohortOffers)) {
              allOffers.push(...cohortOffers);
            }
          });
        } else if (result.allDeals && Array.isArray(result.allDeals)) {
          allOffers = result.allDeals;
        }
        
        const affiliateData = result.merchantAffiliateData || {};
        
        // Enhance offers with stack info
        const enhancedOffers = allOffers.map(offer => {
          const merchantName = (offer.merchant_name || offer.merchant || '').toLowerCase();
          
          // Find matching affiliate data
          let matchedAffiliate = null;
          for (const [domain, data] of Object.entries(affiliateData)) {
            const domainBase = domain.replace(/\.(com|net|org|co\.uk)$/, '');
            if (merchantName.includes(domainBase)) {
              matchedAffiliate = data;
              break;
            }
          }
          
          // Also check static mapping
          let staticMatch = null;
          for (const [domain, data] of Object.entries(AFFILIATE_MERCHANT_DATA)) {
            if (merchantName.includes(data.name.toLowerCase())) {
              staticMatch = data;
              break;
            }
          }
          
          return {
            ...offer,
            stackable: !!(matchedAffiliate || staticMatch),
            affiliateConfidence: matchedAffiliate?.confidence?.confidenceLevel || 
                                 (staticMatch ? staticMatch.reliability : 'none'),
            affiliatePortals: matchedAffiliate?.confidence?.portals || 
                             staticMatch?.portals || [],
            typicalRate: staticMatch?.typicalRate || null
          };
        });
        
        sendResponse({
          success: true,
          offers: enhancedOffers,
          totalStackable: enhancedOffers.filter(o => o.stackable).length
        });
      } catch (error) {
        console.error('[DealStackr Background] Error getting stackable offers:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'getPortalInfo') {
    sendResponse({
      success: true,
      portals: CASHBACK_PORTALS
    });
    return true;
  }
  
  // Handle any other messages
  return false;
});

// Log when service worker starts
console.log('[DealStackr Background] Service worker started');
