/**
 * Background Service Worker for DealStackr Extension
 * 
 * Handles:
 * - Affiliate signal processing and confidence scoring
 * - Merchant data storage and retrieval
 * - Combining card offers with affiliate data for stack value
 * - Crowdsourced deal reporting (Waze-style)
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
  "petsmart.com": { name: "PetSmart", reliability: "high", portals: ["rakuten", "topcashback"], typicalRate: "2-4%" },
  "therabody.com": { name: "Therabody", reliability: "high", portals: ["rakuten", "topcashback", "honey"], typicalRate: "5-10%" }
};

const CASHBACK_PORTALS = {
  rakuten: { name: "Rakuten", url: "https://www.rakuten.com", color: "#bf0000" },
  topcashback: { name: "TopCashback", url: "https://www.topcashback.com", color: "#00a651" },
  honey: { name: "Honey", url: "https://www.joinhoney.com", color: "#ff6801" },
  retailmenot: { name: "RetailMeNot", url: "https://www.retailmenot.com", color: "#e41b23" },
  befrugal: { name: "BeFrugal", url: "https://www.befrugal.com", color: "#1a73e8" },
  mrrebates: { name: "Mr. Rebates", url: "https://www.mrrebates.com", color: "#333333" }
};

const SCORE_WEIGHTS = {
  staticMapping: { high: 40, medium: 25, low: 10 },
  signals: { urlParams: 15, redirectLinks: 20, affiliateScripts: 15, couponField: 10 },
  bonuses: { multipleSignals: 10, checkoutPage: 5, multiplePortals: 5, crowdsourcedReport: 15 }
};

const CONFIDENCE_THRESHOLDS = { high: 60, medium: 35, low: 15 };

function calculateConfidenceScore(domain, signals = {}) {
  let score = 0;
  const breakdown = [];
  
  const staticData = AFFILIATE_MERCHANT_DATA[domain];
  if (staticData) {
    const reliabilityScore = SCORE_WEIGHTS.staticMapping[staticData.reliability] || 0;
    score += reliabilityScore;
    breakdown.push({ source: 'static_mapping', points: reliabilityScore, detail: 'Known ' + staticData.reliability + ' reliability merchant' });
    if (staticData.portals && staticData.portals.length > 2) {
      score += SCORE_WEIGHTS.bonuses.multiplePortals;
      breakdown.push({ source: 'multiple_portals', points: SCORE_WEIGHTS.bonuses.multiplePortals, detail: 'Available on ' + staticData.portals.length + ' portals' });
    }
  }
  
  const signalData = signals.signals || {};
  let signalCount = 0;
  
  if (signalData.urlParams && signalData.urlParams.hasParams) { score += SCORE_WEIGHTS.signals.urlParams; signalCount++; }
  if (signalData.redirectLinks && signalData.redirectLinks.hasRedirects) { score += SCORE_WEIGHTS.signals.redirectLinks; signalCount++; }
  if (signalData.affiliateScripts && signalData.affiliateScripts.hasScripts) { score += SCORE_WEIGHTS.signals.affiliateScripts; signalCount++; }
  if (signalData.couponField && signalData.couponField.hasCouponField) { score += SCORE_WEIGHTS.signals.couponField; signalCount++; }
  if (signalCount >= 2) { score += SCORE_WEIGHTS.bonuses.multipleSignals; }
  if (signalData.pageType && (signalData.pageType.isCheckout || signalData.pageType.isCart)) { score += SCORE_WEIGHTS.bonuses.checkoutPage; }
  
  score = Math.min(score, 100);
  
  let confidenceLevel, confidenceLabel;
  if (score >= CONFIDENCE_THRESHOLDS.high) { confidenceLevel = 'high'; confidenceLabel = 'Cashback likely available'; }
  else if (score >= CONFIDENCE_THRESHOLDS.medium) { confidenceLevel = 'medium'; confidenceLabel = 'Cashback may be available'; }
  else if (score >= CONFIDENCE_THRESHOLDS.low) { confidenceLevel = 'low'; confidenceLabel = 'Limited cashback signals'; }
  else { confidenceLevel = 'none'; confidenceLabel = 'No cashback signals detected'; }
  
  return { score, confidenceLevel, confidenceLabel, breakdown, staticData: staticData || null, portals: staticData ? staticData.portals : [], typicalRate: staticData ? staticData.typicalRate : null };
}

async function storeMerchantAffiliateData(domain, data) {
  try {
    const result = await chrome.storage.local.get(['merchantAffiliateData']);
    const affiliateData = result.merchantAffiliateData || {};
    affiliateData[domain] = { ...data, updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
    await chrome.storage.local.set({ merchantAffiliateData: affiliateData });
  } catch (error) { console.error('[DealStackr Background] Error storing affiliate data:', error); }
}

/**
 * Auto-sync a single crowdsourced report to the website
 * Runs silently in background, doesn't interrupt user
 */
async function autoSyncCrowdsourcedReport(domain, reportData) {
  try {
    const crowdsourcedDeals = { [domain]: reportData };
    
    console.log('[DealStackr Background] Auto-syncing report for', domain);
    
    const response = await fetch('https://dealstackr-dashboard.up.railway.app/api/crowdsourced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crowdsourcedDeals })
    });
    
    if (response.ok) {
      console.log('[DealStackr Background] ✓ Auto-synced report for', domain);
    } else {
      console.warn('[DealStackr Background] Auto-sync failed for', domain, ':', response.status);
    }
  } catch (error) {
    console.warn('[DealStackr Background] Auto-sync error (will retry later):', error.message);
    // Silent fail - sync will happen when user opens dashboard
  }
}

async function getMerchantAffiliateData(domain) {
  try {
    const result = await chrome.storage.local.get(['merchantAffiliateData']);
    const affiliateData = result.merchantAffiliateData || {};
    if (affiliateData[domain]) {
      if (new Date(affiliateData[domain].expiresAt) > new Date()) { return affiliateData[domain]; }
      delete affiliateData[domain];
      await chrome.storage.local.set({ merchantAffiliateData: affiliateData });
    }
    return null;
  } catch (error) { return null; }
}

async function findCardOffersForMerchant(domain) {
  try {
    const result = await chrome.storage.local.get(['allDeals', 'dealCohorts']);
    let allOffers = [];
    if (result.dealCohorts && typeof result.dealCohorts === 'object') {
      Object.values(result.dealCohorts).forEach(cohortOffers => { if (Array.isArray(cohortOffers)) allOffers.push(...cohortOffers); });
    } else if (result.allDeals && Array.isArray(result.allDeals)) { allOffers = result.allDeals; }
    const merchantName = AFFILIATE_MERCHANT_DATA[domain]?.name?.toLowerCase();
    const domainBase = domain.replace(/\.(com|net|org|co\.uk)$/, '');
    return allOffers.filter(offer => {
      const offerMerchant = (offer.merchant_name || offer.merchant || '').toLowerCase();
      return offerMerchant.includes(domainBase) || (merchantName && offerMerchant.includes(merchantName));
    });
  } catch (error) { return []; }
}

function calculateStackValue(cardOffers, affiliateData) {
  const result = { hasCardOffer: cardOffers.length > 0, hasAffiliateSignal: affiliateData && affiliateData.confidenceLevel !== 'none', isStackable: false, cardOffers, affiliateConfidence: affiliateData?.confidenceLevel || 'none', estimatedStack: null, stackMessage: null };
  result.isStackable = result.hasCardOffer && result.hasAffiliateSignal;
  if (result.isStackable) {
    const cardOffer = cardOffers[0];
    const cardValue = cardOffer.offer_value || 'Card offer';
    const affiliateRate = affiliateData.typicalRate || 'additional cashback';
    result.estimatedStack = cardValue + ' + ' + affiliateRate;
    result.stackMessage = 'Stack ' + cardValue + ' with ' + affiliateRate + ' from cashback portals';
  } else if (result.hasCardOffer) { result.stackMessage = 'Card offer available'; }
  else if (result.hasAffiliateSignal) { result.stackMessage = affiliateData.confidenceLabel; }
  else { result.stackMessage = 'No offers detected'; }
  return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[DealStackr Background] Received message:', request.action);
  
  if (request.action === 'ping') { sendResponse({ success: true, version: '1.3.0' }); return true; }
  
  if (request.action === 'signupOfferDetected') {
    (async () => {
      try {
        const data = request.data;
        const result = await chrome.storage.local.get(['signupDetectionResults']);
        let detections = result.signupDetectionResults || [];
        const existingIndex = detections.findIndex(d => d.domain === data.domain);
        if (existingIndex >= 0) { detections[existingIndex] = data; } else { detections.unshift(data); }
        if (detections.length > 50) { detections = detections.slice(0, 50); }
        await chrome.storage.local.set({ signupDetectionResults: detections });
        sendResponse({ success: true });
      } catch (error) { sendResponse({ success: false, error: error.message }); }
    })();
    return true;
  }
  
  if (request.action === 'getSignupDetection') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['signupDetectionResults']);
        const detection = (result.signupDetectionResults || []).find(d => d.domain === request.domain);
        sendResponse({ success: true, detection: detection || null });
      } catch (error) { sendResponse({ success: false, error: error.message }); }
    })();
    return true;
  }
  
  if (request.action === 'userConfirmation') {
    (async () => {
      try {
        const data = request.data;
        console.log('[DealStackr Background] User confirmation:', data);
        const result = await chrome.storage.local.get(['crowdsourcedDeals', 'userConfirmations', 'signupDetectionResults']);
        let crowdsourcedDeals = result.crowdsourcedDeals || {};
        let confirmations = result.userConfirmations || [];
        let detections = result.signupDetectionResults || [];
        
        if (!crowdsourcedDeals[data.domain]) {
          crowdsourcedDeals[data.domain] = {
            domain: data.domain, merchant: data.merchant || null, reports: [],
            aggregated: { cashback: { count: 0, rates: [], avgRate: null, lastPortal: null, lastReportAt: null }, promo: { count: 0, rates: [], avgRate: null, lastOffer: null, lastReportAt: null } },
            lastReportAt: null, totalReports: 0
          };
        }
        
        if (data.merchant && !crowdsourcedDeals[data.domain].merchant) { crowdsourcedDeals[data.domain].merchant = data.merchant; }
        const domainData = crowdsourcedDeals[data.domain];
        
        if (data.type !== 'nothing') {
          const report = { type: data.type, portal: data.portal || null, rate: data.rate || null, rateDisplay: data.rateDisplay || null, fixedAmount: data.fixedAmount || null, reportedAt: data.confirmedAt, reporterHash: data.reporterHash || 'anonymous' };
          domainData.reports.unshift(report);
          if (domainData.reports.length > 20) { domainData.reports = domainData.reports.slice(0, 20); }
          domainData.lastReportAt = data.confirmedAt;
          domainData.totalReports++;
          
          if (data.type === 'cashback') {
            domainData.aggregated.cashback.count++;
            domainData.aggregated.cashback.lastReportAt = data.confirmedAt;
            if (data.rate) { domainData.aggregated.cashback.rates.push(data.rate); if (domainData.aggregated.cashback.rates.length > 10) domainData.aggregated.cashback.rates.shift(); domainData.aggregated.cashback.avgRate = domainData.aggregated.cashback.rates.reduce((a, b) => a + b, 0) / domainData.aggregated.cashback.rates.length; }
            if (data.portal) { domainData.aggregated.cashback.lastPortal = data.portal; }
          } else if (data.type === 'promo') {
            domainData.aggregated.promo.count++;
            domainData.aggregated.promo.lastReportAt = data.confirmedAt;
            if (data.rate) { domainData.aggregated.promo.rates.push(data.rate); if (domainData.aggregated.promo.rates.length > 10) domainData.aggregated.promo.rates.shift(); domainData.aggregated.promo.avgRate = domainData.aggregated.promo.rates.reduce((a, b) => a + b, 0) / domainData.aggregated.promo.rates.length; }
            if (data.fixedAmount) { domainData.aggregated.promo.lastOffer = data.fixedAmount; }
          }
        }
        
        await chrome.storage.local.set({ crowdsourcedDeals });
        
        // Auto-sync crowdsourced report to website
        autoSyncCrowdsourcedReport(data.domain, crowdsourcedDeals[data.domain]);
        
        confirmations.unshift({ domain: data.domain, type: data.type, portal: data.portal, rate: data.rate, rateDisplay: data.rateDisplay, fixedAmount: data.fixedAmount, confirmedAt: data.confirmedAt, url: data.url });
        if (confirmations.length > 100) { confirmations = confirmations.slice(0, 100); }
        await chrome.storage.local.set({ userConfirmations: confirmations });
        
        const detectionIndex = detections.findIndex(d => d.domain === data.domain);
        if (detectionIndex >= 0) {
          detections[detectionIndex].userConfirmed = data.type;
          detections[detectionIndex].userConfirmedAt = data.confirmedAt;
          if (data.type === 'cashback') { detections[detectionIndex].cashbackConfirmed = true; detections[detectionIndex].cashbackRate = data.rate; detections[detectionIndex].cashbackPortal = data.portal; detections[detectionIndex].score = Math.max(detections[detectionIndex].score || 0, 90); detections[detectionIndex].band = 'high'; }
          else if (data.type === 'promo') { detections[detectionIndex].promoConfirmed = true; detections[detectionIndex].promoRate = data.rate; detections[detectionIndex].promoFixed = data.fixedAmount; detections[detectionIndex].score = Math.max(detections[detectionIndex].score || 0, 85); detections[detectionIndex].band = 'high'; }
          await chrome.storage.local.set({ signupDetectionResults: detections });
        } else if (data.type !== 'nothing') {
          detections.unshift({ domain: data.domain, score: data.type === 'cashback' ? 90 : 85, band: 'high', detected: true, userConfirmed: data.type, userConfirmedAt: data.confirmedAt, cashbackConfirmed: data.type === 'cashback', cashbackRate: data.type === 'cashback' ? data.rate : null, cashbackPortal: data.type === 'cashback' ? data.portal : null, promoConfirmed: data.type === 'promo', promoRate: data.type === 'promo' ? data.rate : null, promoFixed: data.type === 'promo' ? data.fixedAmount : null, detectedAt: data.confirmedAt, sourceUrl: data.url });
          if (detections.length > 50) { detections = detections.slice(0, 50); }
          await chrome.storage.local.set({ signupDetectionResults: detections });
        }
        
        sendResponse({ success: true });
      } catch (error) { console.error('[DealStackr Background] Error storing user confirmation:', error); sendResponse({ success: false, error: error.message }); }
    })();
    return true;
  }
  
  if (request.action === 'getDomainReportCount') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['crowdsourcedDeals']);
        const count = (result.crowdsourcedDeals || {})[request.domain]?.totalReports || 0;
        sendResponse({ success: true, count });
      } catch (error) { sendResponse({ success: false, count: 0 }); }
    })();
    return true;
  }
  
  if (request.action === 'getCrowdsourcedDeals') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['crowdsourcedDeals']);
        const deals = result.crowdsourcedDeals || {};
        sendResponse({ success: true, deals, totalDomains: Object.keys(deals).length });
      } catch (error) { sendResponse({ success: false, error: error.message }); }
    })();
    return true;
  }
  
  if (request.action === 'getRecentConfirmation') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['userConfirmations']);
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recent = (result.userConfirmations || []).find(c => c.domain === request.domain && new Date(c.confirmedAt).getTime() > oneDayAgo);
        sendResponse({ success: true, hasRecent: !!recent, confirmation: recent || null });
      } catch (error) { sendResponse({ success: false, hasRecent: false }); }
    })();
    return true;
  }
  
  if (request.action === 'reportAffiliateSignals') {
    (async () => {
      try {
        const signals = request.data;
        const confidence = calculateConfidenceScore(signals.domain, signals);
        await storeMerchantAffiliateData(signals.domain, { domain: signals.domain, merchantName: signals.merchantName, url: signals.url, confidence, signals: signals.signals, signalCount: signals.signalCount });
        sendResponse({ success: true, confidence: confidence.confidenceLevel, score: confidence.score });
      } catch (error) { sendResponse({ success: false, error: error.message }); }
    })();
    return true;
  }
  
  if (request.action === 'getAffiliateConfidence') {
    (async () => {
      try {
        let affiliateData = await getMerchantAffiliateData(request.domain);
        if (!affiliateData) { const confidence = calculateConfidenceScore(request.domain, {}); affiliateData = { domain: request.domain, confidence, signals: {}, signalCount: 0 }; }
        const cardOffers = await findCardOffersForMerchant(request.domain);
        const stackValue = calculateStackValue(cardOffers, affiliateData.confidence);
        sendResponse({ success: true, domain: request.domain, affiliateData, cardOffers, stackValue });
      } catch (error) { sendResponse({ success: false, error: error.message }); }
    })();
    return true;
  }
  
  if (request.action === 'getStackableOffers') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['allDeals', 'dealCohorts', 'merchantAffiliateData', 'crowdsourcedDeals']);
        let allOffers = [];
        if (result.dealCohorts && typeof result.dealCohorts === 'object') { Object.values(result.dealCohorts).forEach(cohortOffers => { if (Array.isArray(cohortOffers)) allOffers.push(...cohortOffers); }); }
        else if (result.allDeals && Array.isArray(result.allDeals)) { allOffers = result.allDeals; }
        
        const affiliateData = result.merchantAffiliateData || {};
        const crowdsourcedDeals = result.crowdsourcedDeals || {};
        
        const enhancedOffers = allOffers.map(offer => {
          const merchantName = (offer.merchant_name || offer.merchant || '').toLowerCase();
          let matchedAffiliate = null, staticMatch = null, crowdsourcedMatch = null;
          for (const [domain, data] of Object.entries(affiliateData)) { if (merchantName.includes(domain.replace(/\.(com|net|org|co\.uk)$/, ''))) { matchedAffiliate = data; break; } }
          for (const [domain, data] of Object.entries(AFFILIATE_MERCHANT_DATA)) { if (merchantName.includes(data.name.toLowerCase())) { staticMatch = data; break; } }
          for (const [domain, data] of Object.entries(crowdsourcedDeals)) { if (merchantName.includes(domain.replace(/\.(com|net|org|co\.uk)$/, ''))) { crowdsourcedMatch = data; break; } }
          return { ...offer, stackable: !!(matchedAffiliate || staticMatch || crowdsourcedMatch), affiliateConfidence: matchedAffiliate?.confidence?.confidenceLevel || (staticMatch ? staticMatch.reliability : 'none'), affiliatePortals: matchedAffiliate?.confidence?.portals || staticMatch?.portals || [], typicalRate: staticMatch?.typicalRate || null, crowdsourced: crowdsourcedMatch ? { totalReports: crowdsourcedMatch.totalReports, cashbackAvgRate: crowdsourcedMatch.aggregated?.cashback?.avgRate, cashbackPortal: crowdsourcedMatch.aggregated?.cashback?.lastPortal, promoAvgRate: crowdsourcedMatch.aggregated?.promo?.avgRate, lastReportAt: crowdsourcedMatch.lastReportAt } : null };
        });
        
        sendResponse({ success: true, offers: enhancedOffers, totalStackable: enhancedOffers.filter(o => o.stackable).length });
      } catch (error) { sendResponse({ success: false, error: error.message }); }
    })();
    return true;
  }
  
  if (request.action === 'getPortalInfo') { sendResponse({ success: true, portals: CASHBACK_PORTALS }); return true; }
  
  return false;
});

console.log('[DealStackr Background] Service worker started');