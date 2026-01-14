/**
 * Affiliate Signal Detector for DealStackr
 * 
 * This content script runs on all pages to passively detect affiliate program signals.
 * It does NOT modify the page, click links, or intercept network requests.
 * It only observes publicly visible HTML and URL patterns.
 * 
 * Chrome Web Store compliant - passive observation only.
 */

(function() {
  'use strict';

  // Known affiliate URL parameters (subset - full list in affiliateData.js)
  const AFFILIATE_PARAMS = [
    "afsrc", "affid", "affiliate_id", "clickref", "ranMID", "ranEAID", "ranSiteID",
    "utm_affiliate", "ref_id", "subid", "subId", "clickId", "click_id", "aff_id",
    "partner_id", "partnerId", "publisher_id", "pubid", "cjevent", "irclickid", "avad", "awc"
  ];

  // Known affiliate redirect domains
  const AFFILIATE_REDIRECT_DOMAINS = [
    "go.redirectingat.com", "go.skimresources.com", "linksynergy.com",
    "pntra.com", "pntrs.com", "pntrac.com", "gopjn.com", "pjtra.com",
    "anrdoezrs.net", "jdoqocy.com", "tkqlhce.com", "dpbolvw.net",
    "kqzyfj.com", "commission-junction.com", "emjcd.com", "shareasale.com",
    "awin1.com", "webgains.com", "impactradius-go.com", "ojrq.net",
    "evyy.net", "rstyle.me", "shopstyle.com", "narrativ.com", "howl.me"
  ];

  // Known affiliate tracking script patterns
  const AFFILIATE_SCRIPT_PATTERNS = [
    /rakuten/i, /linksynergy/i, /commission-?junction/i, /shareasale/i,
    /awin/i, /impact\.com/i, /partnerize/i, /pepperjam/i, /cj\.com/i,
    /skimlinks/i, /viglink/i, /sovrn/i
  ];

  /**
   * Extract the primary domain from current URL
   * @returns {string} Domain like "target.com"
   */
  function getMerchantDomain() {
    const hostname = window.location.hostname.toLowerCase();
    // Remove www. prefix
    const domain = hostname.replace(/^www\./, '');
    return domain;
  }

  /**
   * Get normalized merchant name from page
   * @returns {string|null}
   */
  function getMerchantName() {
    // Try og:site_name meta tag
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName && ogSiteName.content) {
      return ogSiteName.content.trim();
    }

    // Try application-name meta tag
    const appName = document.querySelector('meta[name="application-name"]');
    if (appName && appName.content) {
      return appName.content.trim();
    }

    // Fallback to document title, cleaned up
    const title = document.title;
    if (title) {
      // Often format is "Page Name | Brand Name" or "Page Name - Brand Name"
      const parts = title.split(/[|\-–—]/);
      if (parts.length > 1) {
        return parts[parts.length - 1].trim();
      }
    }

    return null;
  }

  /**
   * Check if current URL has affiliate parameters
   * @returns {Object} { hasParams: boolean, params: string[] }
   */
  function detectAffiliateUrlParams() {
    const url = new URL(window.location.href);
    const detectedParams = [];

    for (const param of AFFILIATE_PARAMS) {
      if (url.searchParams.has(param)) {
        detectedParams.push(param);
      }
    }

    return {
      hasParams: detectedParams.length > 0,
      params: detectedParams
    };
  }

  /**
   * Check for affiliate redirect links in page
   * @returns {Object} { hasRedirects: boolean, count: number, domains: string[] }
   */
  function detectAffiliateRedirectLinks() {
    const links = document.querySelectorAll('a[href]');
    const detectedDomains = new Set();
    let count = 0;

    for (const link of links) {
      try {
        const href = link.href.toLowerCase();
        for (const domain of AFFILIATE_REDIRECT_DOMAINS) {
          if (href.includes(domain)) {
            detectedDomains.add(domain);
            count++;
            break;
          }
        }
      } catch (e) {
        // Skip invalid URLs
      }
    }

    return {
      hasRedirects: count > 0,
      count: count,
      domains: Array.from(detectedDomains)
    };
  }

  /**
   * Check for affiliate tracking scripts in page
   * @returns {Object} { hasScripts: boolean, patterns: string[] }
   */
  function detectAffiliateScripts() {
    const scripts = document.querySelectorAll('script[src]');
    const detectedPatterns = [];

    for (const script of scripts) {
      const src = script.src || '';
      for (const pattern of AFFILIATE_SCRIPT_PATTERNS) {
        if (pattern.test(src)) {
          detectedPatterns.push(pattern.source);
          break;
        }
      }
    }

    return {
      hasScripts: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * Check if page has a coupon/promo code input field
   * @returns {Object} { hasCouponField: boolean }
   */
  function detectCouponField() {
    // Common coupon field selectors
    const selectors = [
      'input[name*="coupon"]',
      'input[name*="promo"]',
      'input[name*="discount"]',
      'input[id*="coupon"]',
      'input[id*="promo"]',
      'input[id*="discount"]',
      'input[placeholder*="coupon"]',
      'input[placeholder*="promo"]',
      'input[placeholder*="code"]',
      'input[aria-label*="coupon"]',
      'input[aria-label*="promo"]',
      '[class*="coupon"] input',
      '[class*="promo"] input',
      '[class*="discount"] input'
    ];

    for (const selector of selectors) {
      try {
        const field = document.querySelector(selector);
        if (field) {
          return { hasCouponField: true };
        }
      } catch (e) {
        // Skip invalid selectors
      }
    }

    return { hasCouponField: false };
  }

  /**
   * Check if page appears to be a checkout or cart page
   * @returns {Object} { isCheckout: boolean, isCart: boolean }
   */
  function detectPageType() {
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    const isCheckout = path.includes('checkout') || 
                       path.includes('payment') || 
                       url.includes('checkout') ||
                       document.title.toLowerCase().includes('checkout');

    const isCart = path.includes('cart') || 
                   path.includes('basket') || 
                   url.includes('cart') ||
                   document.title.toLowerCase().includes('cart');

    return { isCheckout, isCart };
  }

  /**
   * Collect all affiliate signals from the current page
   * @returns {Object} Complete signal collection
   */
  function collectAffiliateSignals() {
    const domain = getMerchantDomain();
    const merchantName = getMerchantName();
    const urlParams = detectAffiliateUrlParams();
    const redirectLinks = detectAffiliateRedirectLinks();
    const scripts = detectAffiliateScripts();
    const couponField = detectCouponField();
    const pageType = detectPageType();

    // Calculate a raw signal score (background will do full scoring)
    let signalCount = 0;
    if (urlParams.hasParams) signalCount++;
    if (redirectLinks.hasRedirects) signalCount++;
    if (scripts.hasScripts) signalCount++;
    if (couponField.hasCouponField) signalCount++;

    return {
      domain: domain,
      merchantName: merchantName,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      signals: {
        urlParams: urlParams,
        redirectLinks: redirectLinks,
        affiliateScripts: scripts,
        couponField: couponField,
        pageType: pageType
      },
      signalCount: signalCount
    };
  }

  /**
   * Send signals to background worker for scoring
   */
  function reportSignalsToBackground() {
    try {
      const signals = collectAffiliateSignals();
      
      // Only report if we're on a potential merchant site (not search engines, etc.)
      const domain = signals.domain;
      const excludedDomains = [
        'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
        'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
        'youtube.com', 'reddit.com', 'github.com', 'localhost'
      ];

      if (excludedDomains.some(d => domain.includes(d))) {
        return;
      }

      // Send to background
      chrome.runtime.sendMessage({
        action: 'reportAffiliateSignals',
        data: signals
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Silently ignore - extension may not be ready
          return;
        }
        if (response && response.success) {
          console.log('[DealStackr Affiliate] Signals reported:', response);
        }
      });

    } catch (error) {
      console.warn('[DealStackr Affiliate] Error collecting signals:', error);
    }
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAffiliateSignals') {
      try {
        const signals = collectAffiliateSignals();
        sendResponse({
          success: true,
          data: signals
        });
      } catch (error) {
        console.error('[DealStackr Affiliate] Error getting signals:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
      return true;
    }

    if (request.action === 'getMerchantInfo') {
      try {
        sendResponse({
          success: true,
          domain: getMerchantDomain(),
          merchantName: getMerchantName(),
          url: window.location.href
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error.message
        });
      }
      return true;
    }

    return false;
  });

  // Report signals when page loads (after DOM is ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Small delay to ensure all elements are rendered
      setTimeout(reportSignalsToBackground, 1000);
    });
  } else {
    // DOM already ready
    setTimeout(reportSignalsToBackground, 500);
  }

  // Also report on page visibility change (user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(reportSignalsToBackground, 500);
    }
  });

})();


