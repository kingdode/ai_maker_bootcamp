/**
 * Signup Offer Detector for DealStackr
 * 
 * Content script that detects signup/newsletter offer modals and popups.
 * Runs on <all_urls> to detect offers when users visit merchant sites.
 * 
 * Detection Methodology:
 * - Observes DOM for modal/popup patterns
 * - Looks for email input fields with discount messaging
 * - Detects common ESP (Email Service Provider) patterns
 * - Computes confidence score based on signal strength
 * 
 * Chrome Web Store compliant - passive observation only.
 */

(function() {
  'use strict';

  // Avoid running on extension pages
  if (window.location.protocol === 'chrome-extension:') {
    return;
  }

  // Skip known non-merchant sites
  const EXCLUDED_DOMAINS = [
    'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
    'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
    'youtube.com', 'reddit.com', 'github.com', 'stackoverflow.com',
    'chase.com', 'americanexpress.com', 'localhost'
  ];

  const hostname = window.location.hostname.toLowerCase();
  if (EXCLUDED_DOMAINS.some(d => hostname.includes(d))) {
    return;
  }

  // Score weights for different signals
  const SIGNAL_WEIGHTS = {
    modalWithEmail: 35,          // Modal/popup with email field
    discountText: 25,            // Text mentioning discount/off/%
    signupText: 15,              // "Sign up", "Subscribe", "Join" text
    emailPlaceholder: 10,        // Email placeholder in input
    espScript: 15,               // Known ESP tracking script
    couponField: 10,             // Coupon/promo code field
    urgencyText: 5,              // "Limited time", "Today only"
    welcomeText: 10,             // "Welcome", "First order"
  };

  // Score thresholds
  const SCORE_THRESHOLDS = {
    HIGH: 80,      // Signup offer detected
    MEDIUM: 50,    // Signup offer likely
    LOW: 0         // Do not surface
  };

  // Common ESP (Email Service Provider) patterns
  const ESP_PATTERNS = [
    { name: 'Klaviyo', patterns: [/klaviyo/i, /klav\.io/i] },
    { name: 'Mailchimp', patterns: [/mailchimp/i, /chimpstatic/i, /mc\.us/i] },
    { name: 'Attentive', patterns: [/attentive/i, /attn\.tv/i] },
    { name: 'Privy', patterns: [/privy/i] },
    { name: 'Justuno', patterns: [/justuno/i] },
    { name: 'OptinMonster', patterns: [/optinmonster/i, /omapi/i] },
    { name: 'Sumo', patterns: [/sumo\.com/i, /sumome/i] },
    { name: 'Listrak', patterns: [/listrak/i] },
    { name: 'Drip', patterns: [/getdrip/i, /drip\.com/i] },
    { name: 'ConvertKit', patterns: [/convertkit/i] },
    { name: 'Yotpo', patterns: [/yotpo/i] },
    { name: 'Springbot', patterns: [/springbot/i] },
    { name: 'Omnisend', patterns: [/omnisend/i] },
    { name: 'Emarsys', patterns: [/emarsys/i] },
    { name: 'Braze', patterns: [/braze/i, /appboy/i] }
  ];

  // Discount text patterns
  const DISCOUNT_PATTERNS = [
    /(\d{1,2})\s*%\s*(off|discount|save)/i,
    /save\s*(\d{1,2})\s*%/i,
    /(\d{1,2})\s*%\s*off\s*(your\s+)?(first|next)/i,
    /\$(\d+)\s*off/i,
    /free\s+shipping/i,
    /exclusive\s+(offer|discount|deal)/i,
    /first\s+order\s+discount/i,
    /welcome\s+(offer|discount|gift)/i,
    /new\s+subscriber/i
  ];

  // State
  let detectionResult = null;
  let hasReported = false;
  let confirmationWidget = null;
  let hasUserConfirmed = false;
  let shouldAutoOpen = false;

  // Check if we came from DealStackr dashboard (auto-open trigger)
  function checkAutoOpenTrigger() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dealstackr') === 'report') {
      shouldAutoOpen = true;
      console.log('[DealStackr] Auto-open triggered from dashboard');
      
      // Clean up the URL parameter without reloading
      urlParams.delete('dealstackr');
      const newUrl = urlParams.toString() 
        ? `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`
        : `${window.location.pathname}${window.location.hash}`;
      
      try {
        window.history.replaceState({}, '', newUrl);
      } catch (e) {
        // Ignore if we can't modify history
      }
    }
  }
  
  // Check immediately
  checkAutoOpenTrigger();

  /**
   * Get domain from current URL
   * @returns {string}
   */
  function getDomain() {
    return hostname.replace(/^www\./, '');
  }

  /**
   * Generate an anonymous but consistent hash for the user
   * Used to deduplicate reports without identifying users
   * @returns {string}
   */
  function generateAnonymousHash() {
    // Use a combination of factors that are consistent for a user session
    // but don't personally identify them
    const data = navigator.userAgent + screen.width + screen.height + new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check for modal/popup elements with email capture
   * @returns {Object}
   */
  function detectModalWithEmail() {
    const result = {
      found: false,
      emailField: null,
      discountText: null,
      element: null
    };

    // Common modal/popup selectors
    const modalSelectors = [
      '[class*="modal"]',
      '[class*="popup"]',
      '[class*="overlay"]',
      '[class*="lightbox"]',
      '[role="dialog"]',
      '[class*="klaviyo"]',
      '[class*="privy"]',
      '[class*="optinmonster"]',
      '[class*="sumo"]',
      '[class*="justuno"]',
      '[id*="modal"]',
      '[id*="popup"]'
    ];

    for (const selector of modalSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const el of elements) {
          // Must be visible
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            continue;
          }

          // Check for email input
          const emailInputs = el.querySelectorAll('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
          
          if (emailInputs.length > 0) {
            result.found = true;
            result.emailField = emailInputs[0];
            result.element = el;
            
            // Check for discount text in the modal
            const text = el.textContent || '';
            for (const pattern of DISCOUNT_PATTERNS) {
              const match = text.match(pattern);
              if (match) {
                result.discountText = match[0];
                break;
              }
            }
            
            return result;
          }
        }
      } catch (e) {
        // Skip invalid selectors
      }
    }

    return result;
  }

  /**
   * Detect ESP scripts on the page
   * @returns {Object}
   */
  function detectESPScripts() {
    const result = {
      found: false,
      providers: []
    };

    // Check scripts
    const scripts = document.querySelectorAll('script[src]');
    for (const script of scripts) {
      const src = script.src || '';
      
      for (const esp of ESP_PATTERNS) {
        for (const pattern of esp.patterns) {
          if (pattern.test(src)) {
            result.found = true;
            if (!result.providers.includes(esp.name)) {
              result.providers.push(esp.name);
            }
            break;
          }
        }
      }
    }

    // Also check inline scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    for (const script of inlineScripts) {
      const content = script.textContent || '';
      
      for (const esp of ESP_PATTERNS) {
        for (const pattern of esp.patterns) {
          if (pattern.test(content)) {
            result.found = true;
            if (!result.providers.includes(esp.name)) {
              result.providers.push(esp.name);
            }
            break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Detect signup/subscribe text patterns
   * @returns {Object}
   */
  function detectSignupText() {
    const result = {
      found: false,
      hasDiscount: false,
      discountValue: null,
      hasWelcome: false,
      hasUrgency: false
    };

    const pageText = document.body.textContent || '';

    // Check for discount patterns
    for (const pattern of DISCOUNT_PATTERNS) {
      const match = pageText.match(pattern);
      if (match) {
        result.found = true;
        result.hasDiscount = true;
        result.discountValue = match[0];
        break;
      }
    }

    // Check for welcome text
    if (/welcome\s+(offer|discount|gift|bonus)/i.test(pageText) ||
        /first\s+(order|purchase)\s+(discount|offer)/i.test(pageText) ||
        /new\s+customer\s+(offer|discount)/i.test(pageText)) {
      result.found = true;
      result.hasWelcome = true;
    }

    // Check for urgency text
    if (/limited\s+time/i.test(pageText) ||
        /today\s+only/i.test(pageText) ||
        /ends\s+soon/i.test(pageText) ||
        /don't\s+miss/i.test(pageText)) {
      result.hasUrgency = true;
    }

    // Check for signup text near email fields
    const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
    for (const input of emailInputs) {
      const parent = input.closest('form, div, section');
      if (parent) {
        const text = parent.textContent || '';
        if (/sign\s*up/i.test(text) || /subscribe/i.test(text) || /join/i.test(text) || /newsletter/i.test(text)) {
          result.found = true;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Check for email input fields with suggestive placeholders
   * @returns {Object}
   */
  function detectEmailFields() {
    const result = {
      found: false,
      count: 0,
      hasDiscountContext: false
    };

    const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
    result.count = emailInputs.length;
    result.found = result.count > 0;

    // Check if any email field is near discount-related text
    for (const input of emailInputs) {
      const parent = input.closest('form, div, section, article');
      if (parent) {
        const text = parent.textContent || '';
        for (const pattern of DISCOUNT_PATTERNS) {
          if (pattern.test(text)) {
            result.hasDiscountContext = true;
            break;
          }
        }
        if (result.hasDiscountContext) break;
      }
    }

    return result;
  }

  /**
   * Calculate overall confidence score
   * @returns {Object}
   */
  function calculateScore() {
    let score = 0;
    const signals = [];

    // Check for modal with email
    const modalResult = detectModalWithEmail();
    if (modalResult.found) {
      score += SIGNAL_WEIGHTS.modalWithEmail;
      signals.push({ type: 'modal_with_email', weight: SIGNAL_WEIGHTS.modalWithEmail });
      
      if (modalResult.discountText) {
        score += SIGNAL_WEIGHTS.discountText;
        signals.push({ type: 'discount_in_modal', weight: SIGNAL_WEIGHTS.discountText, value: modalResult.discountText });
      }
    }

    // Check for ESP scripts
    const espResult = detectESPScripts();
    if (espResult.found) {
      score += SIGNAL_WEIGHTS.espScript;
      signals.push({ type: 'esp_script', weight: SIGNAL_WEIGHTS.espScript, providers: espResult.providers });
    }

    // Check for signup/discount text
    const textResult = detectSignupText();
    if (textResult.hasDiscount) {
      score += SIGNAL_WEIGHTS.discountText;
      signals.push({ type: 'discount_text', weight: SIGNAL_WEIGHTS.discountText, value: textResult.discountValue });
    }
    if (textResult.hasWelcome) {
      score += SIGNAL_WEIGHTS.welcomeText;
      signals.push({ type: 'welcome_text', weight: SIGNAL_WEIGHTS.welcomeText });
    }
    if (textResult.hasUrgency) {
      score += SIGNAL_WEIGHTS.urgencyText;
      signals.push({ type: 'urgency_text', weight: SIGNAL_WEIGHTS.urgencyText });
    }

    // Check for email fields
    const emailResult = detectEmailFields();
    if (emailResult.found && emailResult.hasDiscountContext) {
      score += SIGNAL_WEIGHTS.emailPlaceholder;
      signals.push({ type: 'email_with_discount', weight: SIGNAL_WEIGHTS.emailPlaceholder });
    }

    // Cap at 100
    score = Math.min(score, 100);

    // Determine band
    let band = 'low';
    if (score >= SCORE_THRESHOLDS.HIGH) {
      band = 'high';
    } else if (score >= SCORE_THRESHOLDS.MEDIUM) {
      band = 'medium';
    }

    return {
      score,
      band,
      detected: score >= SCORE_THRESHOLDS.MEDIUM,
      signals,
      value: modalResult.discountText || textResult.discountValue || null,
      esp: espResult.providers.length > 0 ? espResult.providers[0] : null
    };
  }

  /**
   * Build detection result object
   * @returns {Object}
   */
  function buildDetectionResult() {
    const scoreResult = calculateScore();
    
    return {
      merchantId: null, // Will be matched by domain in dashboard
      domain: getDomain(),
      score: scoreResult.score,
      band: scoreResult.band,
      detected: scoreResult.detected,
      value: scoreResult.value,
      delivery: 'email',
      esp: scoreResult.esp,
      detectedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      signals: scoreResult.signals
    };
  }

  /**
   * Report detection result to background/popup
   */
  function reportResult() {
    if (hasReported) return;
    
    detectionResult = buildDetectionResult();
    
    // Only report if we found something worth mentioning
    if (detectionResult.score < SCORE_THRESHOLDS.MEDIUM) {
      console.log('[DealStackr Signup] Low confidence, not reporting:', detectionResult.score);
      return;
    }

    hasReported = true;
    console.log('[DealStackr Signup] Reporting detection result:', detectionResult);

    try {
      // Send to background worker
      chrome.runtime.sendMessage({
        action: 'signupOfferDetected',
        data: detectionResult
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[DealStackr Signup] Failed to report:', chrome.runtime.lastError);
        } else {
          console.log('[DealStackr Signup] Reported successfully');
        }
      });
    } catch (error) {
      console.warn('[DealStackr Signup] Error reporting:', error);
    }
  }

  /**
   * Listen for messages from popup/background
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSignupDetection') {
      // Force recalculation
      detectionResult = buildDetectionResult();
      sendResponse({
        success: true,
        data: detectionResult
      });
      return true;
    }

    if (request.action === 'checkSignupOffer') {
      // Run detection and respond
      const result = buildDetectionResult();
      sendResponse({
        success: true,
        data: result
      });
      return true;
    }

    return false;
  });

  /**
   * Observe DOM for dynamically loaded modals
   */
  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      // Check if any new modal-like elements were added
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const className = (node.className || '').toLowerCase();
              const id = (node.id || '').toLowerCase();
              
              // Check if it looks like a modal/popup
              if (className.includes('modal') || className.includes('popup') ||
                  className.includes('overlay') || className.includes('dialog') ||
                  id.includes('modal') || id.includes('popup')) {
                // Wait a moment for content to render, then re-check
                setTimeout(() => {
                  if (!hasReported) {
                    reportResult();
                  }
                }, 500);
                return;
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Stop observing after 30 seconds to save resources
    setTimeout(() => {
      observer.disconnect();
    }, 30000);
  }

  /**
   * Create the user confirmation widget - Waze-style deal reporting
   */
  function createConfirmationWidget() {
    if (confirmationWidget) {
      console.log('[DealStackr] Widget already exists');
      return;
    }
    
    if (!document.body) {
      console.log('[DealStackr] No document.body yet');
      return;
    }
    
    console.log('[DealStackr] Building confirmation widget...');

    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'dealstackr-confirm-widget';
    widget.innerHTML = `
      <style>
        #dealstackr-confirm-widget {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
        }
        #dealstackr-confirm-widget * {
          box-sizing: border-box;
        }
        .ds-widget-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px 10px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 2px solid white;
          border-radius: 24px;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(102, 126, 234, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }
        .ds-widget-trigger:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.5);
        }
        .ds-widget-trigger-icon {
          width: 22px;
          height: 22px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ds-widget-trigger-icon svg {
          width: 14px;
          height: 14px;
          fill: white;
        }
        .ds-widget-trigger-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          color: white;
        }
        .ds-widget-trigger-label {
          font-size: 12px;
          font-weight: 600;
          line-height: 1.2;
        }
        .ds-widget-trigger-sublabel {
          font-size: 10px;
          font-weight: 400;
          opacity: 0.85;
          line-height: 1.2;
        }
        .ds-widget-trigger-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #10b981;
          color: white;
          font-size: 8px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 8px;
          border: 2px solid white;
          text-transform: uppercase;
        }
        .ds-widget-panel {
          display: none;
          position: absolute;
          bottom: 60px;
          left: 0;
          width: 280px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          overflow: hidden;
        }
        .ds-widget-panel.open {
          display: block;
          animation: ds-slide-up 0.25s ease;
        }
        @keyframes ds-slide-up {
          from { opacity: 0; transform: translateY(15px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ds-widget-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 10px 14px;
          font-weight: 600;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ds-widget-header-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ds-widget-header-badge {
          display: none;
        }
        .ds-widget-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 3px 6px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .ds-widget-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .ds-widget-body {
          padding: 12px;
        }
        .ds-widget-question {
          color: #1f2937;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 10px;
          line-height: 1.3;
        }
        .ds-widget-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ds-widget-option {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          transition: all 0.2s;
          overflow: hidden;
        }
        .ds-widget-option:hover {
          border-color: #667eea;
        }
        .ds-widget-option.selected {
          border-color: #667eea;
          background: #f5f3ff;
        }
        .ds-widget-option-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          cursor: pointer;
        }
        .ds-widget-option input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #667eea;
          cursor: pointer;
          flex-shrink: 0;
        }
        .ds-widget-option-icon {
          font-size: 18px;
          flex-shrink: 0;
        }
        .ds-widget-option-text {
          flex: 1;
        }
        .ds-widget-option-label {
          font-weight: 600;
          color: #1f2937;
          font-size: 12px;
        }
        .ds-widget-option-sublabel {
          font-size: 10px;
          color: #6b7280;
          margin-top: 1px;
        }
        .ds-widget-option.rakuten {
          border-left: 3px solid #eb0029;
        }
        .ds-widget-option.promo {
          border-left: 3px solid #10b981;
        }
        .ds-widget-option.other-cashback {
          border-left: 3px solid #f59e0b;
        }
        .ds-widget-detail-input {
          display: none;
          padding: 0 10px 10px 10px;
          animation: ds-fade-in 0.2s ease;
        }
        .ds-widget-option.selected .ds-widget-detail-input {
          display: block;
        }
        @keyframes ds-fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ds-widget-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 12px;
        }
        .ds-widget-input-group:focus-within {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .ds-widget-input-group input {
          border: none;
          outline: none;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          width: 60px;
          text-align: center;
          background: transparent;
        }
        .ds-widget-input-group input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }
        .ds-widget-input-group span {
          color: #6b7280;
          font-size: 13px;
        }
        .ds-widget-input-label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 6px;
        }
        .ds-widget-quick-picks {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .ds-widget-quick-pick {
          padding: 4px 10px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
          color: #374151;
        }
        .ds-widget-quick-pick:hover {
          background: #e5e7eb;
          border-color: #667eea;
        }
        .ds-widget-quick-pick.selected {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        /* Perk picks (multi-selectable) */
        .ds-perk-pick {
          font-size: 10px;
          padding: 4px 8px;
        }
        .ds-perk-pick.selected {
          background: #10b981;
          border-color: #10b981;
        }
        #ds-promo-perks {
          margin-top: 6px;
        }
        .ds-widget-text-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          transition: all 0.2s;
        }
        .ds-widget-text-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .ds-widget-text-input::placeholder {
          color: #9ca3af;
        }
        .ds-widget-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .ds-widget-submit {
          flex: 1;
          padding: 12px 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .ds-widget-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .ds-widget-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .ds-widget-skip {
          padding: 12px 16px;
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .ds-widget-skip:hover {
          background: #e5e7eb;
          color: #374151;
        }
        .ds-widget-thanks {
          text-align: center;
          padding: 30px 20px;
        }
        .ds-widget-thanks-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 28px;
          color: white;
        }
        .ds-widget-thanks-text {
          color: #1f2937;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 6px;
        }
        .ds-widget-thanks-sub {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.4;
        }
        .ds-widget-thanks-count {
          margin-top: 12px;
          padding: 8px 16px;
          background: #f0fdf4;
          border-radius: 20px;
          display: inline-block;
          font-size: 12px;
          color: #059669;
          font-weight: 500;
        }
        .ds-hidden {
          display: none !important;
        }
        .ds-widget-portal-select {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .ds-widget-portal-btn {
          padding: 5px 10px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
          color: #374151;
        }
        .ds-widget-portal-btn:hover {
          background: #e5e7eb;
        }
        .ds-widget-portal-btn.selected {
          background: #fef2f2;
          border-color: #eb0029;
          color: #eb0029;
        }
        .ds-widget-portal-btn.selected.honey {
          background: #fff7ed;
          border-color: #f59e0b;
          color: #d97706;
        }
        .ds-widget-portal-btn.selected.topcashback {
          background: #f0fdf4;
          border-color: #10b981;
          color: #059669;
        }
        .ds-widget-toggle {
          display: flex;
          gap: 4px;
          margin-top: 6px;
        }
        .ds-widget-toggle-btn {
          flex: 1;
          padding: 6px 10px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          color: #6b7280;
        }
        .ds-widget-toggle-btn:hover {
          background: #e5e7eb;
        }
        .ds-widget-toggle-btn.selected {
          background: #6366f1;
          border-color: #6366f1;
          color: white;
        }
      </style>
      <div class="ds-widget-panel" id="ds-panel">
        <div class="ds-widget-header">
          <div class="ds-widget-header-title">
            <span>🏷️ Report a Deal</span>
            <span class="ds-widget-header-badge">Help others stack!</span>
          </div>
          <button class="ds-widget-close" id="ds-close">&times;</button>
        </div>
        <div class="ds-widget-body" id="ds-body-options">
          <div class="ds-widget-question">What offers did you spot on this site?</div>
          <div class="ds-widget-options">
            
            <!-- Cashback Portal Option -->
            <div class="ds-widget-option rakuten" id="ds-option-cashback">
              <label class="ds-widget-option-header">
                <input type="checkbox" id="ds-check-cashback" value="cashback">
                <span class="ds-widget-option-icon">💰</span>
                <div class="ds-widget-option-text">
                  <div class="ds-widget-option-label">Cashback Popup</div>
                  <div class="ds-widget-option-sublabel">Rakuten, Honey, TopCashback, etc.</div>
                </div>
              </label>
              <div class="ds-widget-detail-input">
                <div class="ds-widget-input-label">Which portal?</div>
                <div class="ds-widget-portal-select" id="ds-portal-select">
                  <button type="button" class="ds-widget-portal-btn" data-portal="rakuten">🔴 Rakuten</button>
                  <button type="button" class="ds-widget-portal-btn honey" data-portal="honey">🍯 Honey</button>
                  <button type="button" class="ds-widget-portal-btn topcashback" data-portal="topcashback">💚 TopCashback</button>
                  <button type="button" class="ds-widget-portal-btn" data-portal="other">Other</button>
                </div>
                <div class="ds-widget-input-label" style="margin-top: 12px;">Cashback type:</div>
                <div class="ds-widget-toggle" id="ds-cashback-type-toggle">
                  <button type="button" class="ds-widget-toggle-btn selected" data-type="percent">% Back</button>
                  <button type="button" class="ds-widget-toggle-btn" data-type="fixed">$ Back</button>
                </div>
                <div class="ds-widget-input-label" style="margin-top: 8px;">Amount:</div>
                <div class="ds-widget-input-group">
                  <input type="number" id="ds-cashback-rate" placeholder="7" min="0" max="100" step="any">
                  <span id="ds-cashback-unit">% Cash Back</span>
                </div>
                <div class="ds-widget-quick-picks" id="ds-cashback-picks">
                  <span class="ds-widget-quick-pick" data-value="1">1%</span>
                  <span class="ds-widget-quick-pick" data-value="2">2%</span>
                  <span class="ds-widget-quick-pick" data-value="2.5">2.5%</span>
                  <span class="ds-widget-quick-pick" data-value="3">3%</span>
                  <span class="ds-widget-quick-pick" data-value="5">5%</span>
                  <span class="ds-widget-quick-pick" data-value="7">7%</span>
                  <span class="ds-widget-quick-pick" data-value="10">10%</span>
                  <span class="ds-widget-quick-pick" data-value="15">15%</span>
                </div>
                <div class="ds-widget-quick-picks" id="ds-cashback-fixed-picks" style="display: none;">
                  <span class="ds-widget-quick-pick" data-value="1">$1</span>
                  <span class="ds-widget-quick-pick" data-value="2">$2</span>
                  <span class="ds-widget-quick-pick" data-value="3">$3</span>
                  <span class="ds-widget-quick-pick" data-value="5">$5</span>
                  <span class="ds-widget-quick-pick" data-value="10">$10</span>
                  <span class="ds-widget-quick-pick" data-value="15">$15</span>
                  <span class="ds-widget-quick-pick" data-value="20">$20</span>
                  <span class="ds-widget-quick-pick" data-value="25">$25</span>
                </div>
              </div>
            </div>
            
            <!-- Promo Code Option -->
            <div class="ds-widget-option promo" id="ds-option-promo">
              <label class="ds-widget-option-header">
                <input type="checkbox" id="ds-check-promo" value="promo">
                <span class="ds-widget-option-icon">🎟️</span>
                <div class="ds-widget-option-text">
                  <div class="ds-widget-option-label">Email Signup Offer</div>
                  <div class="ds-widget-option-sublabel">Newsletter discount, first-order promo</div>
                </div>
              </label>
              <div class="ds-widget-detail-input">
                <div class="ds-widget-input-label">Discount % (if any):</div>
                <div class="ds-widget-input-group">
                  <input type="number" id="ds-promo-rate" placeholder="15" min="0" max="100" step="any">
                  <span>% off</span>
                </div>
                <div class="ds-widget-quick-picks" id="ds-promo-picks">
                  <span class="ds-widget-quick-pick" data-value="10">10%</span>
                  <span class="ds-widget-quick-pick" data-value="15">15%</span>
                  <span class="ds-widget-quick-pick" data-value="20">20%</span>
                  <span class="ds-widget-quick-pick" data-value="25">25%</span>
                </div>
                <div class="ds-widget-input-label" style="margin-top: 10px;">+ Additional perks:</div>
                <input type="text" id="ds-promo-fixed" class="ds-widget-text-input" placeholder="e.g. Free shipping, $10 credit, Gift">
                <div class="ds-widget-quick-picks" id="ds-promo-perks">
                  <span class="ds-widget-quick-pick ds-perk-pick" data-value="Free shipping">🚚 Free ship</span>
                  <span class="ds-widget-quick-pick ds-perk-pick" data-value="Free gift">🎁 Gift</span>
                  <span class="ds-widget-quick-pick ds-perk-pick" data-value="Free returns">↩️ Returns</span>
                </div>
              </div>
            </div>
            
          </div>
          <div class="ds-widget-actions">
            <button class="ds-widget-submit" id="ds-submit">
              <span>📍</span> Log This Deal
            </button>
            <button class="ds-widget-skip" id="ds-skip">Nothing here</button>
          </div>
        </div>
        <div class="ds-widget-body ds-hidden" id="ds-body-thanks">
          <div class="ds-widget-thanks">
            <div class="ds-widget-thanks-icon">✓</div>
            <div class="ds-widget-thanks-text">Deal Logged!</div>
            <div class="ds-widget-thanks-sub">Your report helps other DealStackr users find the best stacking opportunities.</div>
            <div class="ds-widget-thanks-count" id="ds-thanks-count">🎯 1 report from this site</div>
          </div>
        </div>
      </div>
      <button class="ds-widget-trigger" id="ds-trigger" title="Log any deals you see on this site">
        <span class="ds-widget-trigger-badge">New</span>
        <span class="ds-widget-trigger-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
          </svg>
        </span>
        <span class="ds-widget-trigger-text">
          <span class="ds-widget-trigger-label">Log a Deal</span>
          <span class="ds-widget-trigger-sublabel">Rakuten, promo codes & more</span>
        </span>
      </button>
    `;

    document.body.appendChild(widget);
    confirmationWidget = widget;

    // Element references
    const trigger = widget.querySelector('#ds-trigger');
    const panel = widget.querySelector('#ds-panel');
    const closeBtn = widget.querySelector('#ds-close');
    const submitBtn = widget.querySelector('#ds-submit');
    const skipBtn = widget.querySelector('#ds-skip');
    
    const optionCashback = widget.querySelector('#ds-option-cashback');
    const optionPromo = widget.querySelector('#ds-option-promo');
    const checkCashback = widget.querySelector('#ds-check-cashback');
    const checkPromo = widget.querySelector('#ds-check-promo');
    
    const cashbackRateInput = widget.querySelector('#ds-cashback-rate');
    const promoRateInput = widget.querySelector('#ds-promo-rate');
    const promoFixedInput = widget.querySelector('#ds-promo-fixed');
    const portalSelect = widget.querySelector('#ds-portal-select');
    const cashbackPicks = widget.querySelector('#ds-cashback-picks');
    const cashbackFixedPicks = widget.querySelector('#ds-cashback-fixed-picks');
    const cashbackTypeToggle = widget.querySelector('#ds-cashback-type-toggle');
    const cashbackUnit = widget.querySelector('#ds-cashback-unit');
    const promoPicks = widget.querySelector('#ds-promo-picks');
    
    const bodyOptions = widget.querySelector('#ds-body-options');
    const bodyThanks = widget.querySelector('#ds-body-thanks');
    const thanksCount = widget.querySelector('#ds-thanks-count');

    let selectedPortal = null;
    let cashbackType = 'percent'; // 'percent' or 'fixed'

    // Toggle panel
    trigger.addEventListener('click', () => {
      panel.classList.toggle('open');
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
    });

    // Option toggle handlers
    checkCashback.addEventListener('change', () => {
      optionCashback.classList.toggle('selected', checkCashback.checked);
    });

    checkPromo.addEventListener('change', () => {
      optionPromo.classList.toggle('selected', checkPromo.checked);
    });

    // Portal selection
    portalSelect.querySelectorAll('.ds-widget-portal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        portalSelect.querySelectorAll('.ds-widget-portal-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedPortal = btn.dataset.portal;
      });
    });

    // Cashback type toggle (percent vs fixed)
    cashbackTypeToggle.querySelectorAll('.ds-widget-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        cashbackTypeToggle.querySelectorAll('.ds-widget-toggle-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        cashbackType = btn.dataset.type;
        
        // Update UI based on type
        if (cashbackType === 'percent') {
          cashbackUnit.textContent = '% Cash Back';
          cashbackRateInput.placeholder = '7';
          cashbackRateInput.max = '100';
          cashbackPicks.style.display = 'flex';
          cashbackFixedPicks.style.display = 'none';
        } else {
          cashbackUnit.textContent = '$ Cash Back';
          cashbackRateInput.placeholder = '5';
          cashbackRateInput.max = '500';
          cashbackPicks.style.display = 'none';
          cashbackFixedPicks.style.display = 'flex';
        }
        
        // Clear input and selections when switching
        cashbackRateInput.value = '';
        cashbackPicks.querySelectorAll('.ds-widget-quick-pick').forEach(p => p.classList.remove('selected'));
        cashbackFixedPicks.querySelectorAll('.ds-widget-quick-pick').forEach(p => p.classList.remove('selected'));
      });
    });

    // Quick pick handlers for cashback (percent)
    cashbackPicks.querySelectorAll('.ds-widget-quick-pick').forEach(pick => {
      pick.addEventListener('click', () => {
        cashbackPicks.querySelectorAll('.ds-widget-quick-pick').forEach(p => p.classList.remove('selected'));
        pick.classList.add('selected');
        cashbackRateInput.value = pick.dataset.value;
      });
    });

    // Quick pick handlers for cashback (fixed $)
    cashbackFixedPicks.querySelectorAll('.ds-widget-quick-pick').forEach(pick => {
      pick.addEventListener('click', () => {
        cashbackFixedPicks.querySelectorAll('.ds-widget-quick-pick').forEach(p => p.classList.remove('selected'));
        pick.classList.add('selected');
        cashbackRateInput.value = pick.dataset.value;
      });
    });

    // Quick pick handlers for promo percentage
    promoPicks.querySelectorAll('.ds-widget-quick-pick').forEach(pick => {
      pick.addEventListener('click', () => {
        promoPicks.querySelectorAll('.ds-widget-quick-pick').forEach(p => p.classList.remove('selected'));
        pick.classList.add('selected');
        promoRateInput.value = pick.dataset.value;
      });
    });

    // Quick pick handlers for promo perks (additive, can select multiple)
    const promoPerksPicks = widget.querySelector('#ds-promo-perks');
    promoPerksPicks.querySelectorAll('.ds-widget-quick-pick').forEach(pick => {
      pick.addEventListener('click', () => {
        pick.classList.toggle('selected');
        // Build combined perks text from all selected
        const selectedPerks = Array.from(promoPerksPicks.querySelectorAll('.ds-widget-quick-pick.selected'))
          .map(p => p.dataset.value);
        // Append to existing text if not already there
        const currentText = promoFixedInput.value.trim();
        const newPerk = pick.dataset.value;
        if (pick.classList.contains('selected')) {
          // Add perk
          if (currentText && !currentText.includes(newPerk)) {
            promoFixedInput.value = currentText + ', ' + newPerk;
          } else if (!currentText) {
            promoFixedInput.value = newPerk;
          }
        } else {
          // Remove perk
          promoFixedInput.value = currentText
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== newPerk)
            .join(', ');
        }
      });
    });

    // Submit handler
    submitBtn.addEventListener('click', () => {
      const reports = [];
      
      // Collect cashback data
      if (checkCashback.checked) {
        const amount = parseFloat(cashbackRateInput.value) || null;
        reports.push({
          type: 'cashback',
          portal: selectedPortal || 'unknown',
          cashbackType: cashbackType, // 'percent' or 'fixed'
          rate: cashbackType === 'percent' ? amount : null,
          fixedAmount: cashbackType === 'fixed' ? amount : null,
          rateDisplay: amount ? (cashbackType === 'percent' ? `${amount}%` : `$${amount}`) : null
        });
      }
      
      // Collect promo data (can have both percentage AND additional perks)
      if (checkPromo.checked) {
        const rate = parseFloat(promoRateInput.value) || null;
        const perks = promoFixedInput.value.trim() || null;
        
        // Build combined display string
        let rateDisplay = null;
        if (rate && perks) {
          rateDisplay = `${rate}% off + ${perks}`;
        } else if (rate) {
          rateDisplay = `${rate}% off`;
        } else if (perks) {
          rateDisplay = perks;
        }
        
        reports.push({
          type: 'promo',
          rate: rate,
          rateDisplay: rateDisplay,
          fixedAmount: perks, // Now called "perks" but kept field name for backward compatibility
          hasPercentage: rate !== null,
          hasPerks: perks !== null
        });
      }
      
      if (reports.length === 0) {
        // Nothing selected
        submitUserConfirmation({ type: 'nothing' });
      } else {
        // Submit all reports
        reports.forEach(report => {
          submitUserConfirmation(report);
        });
      }
      
      // Update thanks count
      updateThanksCount();
      
      // Show thanks
      bodyOptions.classList.add('ds-hidden');
      bodyThanks.classList.remove('ds-hidden');
      
      // Close after delay
      setTimeout(() => {
        panel.classList.remove('open');
        setTimeout(() => {
          widget.style.display = 'none';
        }, 300);
      }, 2000);
    });

    // Skip handler
    skipBtn.addEventListener('click', () => {
      submitUserConfirmation({ type: 'nothing' });
      
      bodyOptions.classList.add('ds-hidden');
      bodyThanks.classList.remove('ds-hidden');
      
      setTimeout(() => {
        panel.classList.remove('open');
        setTimeout(() => {
          widget.style.display = 'none';
        }, 300);
      }, 1500);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!widget.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    // Helper to update thanks count
    async function updateThanksCount() {
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'getDomainReportCount',
            domain: getDomain()
          }, resolve);
        });
        if (response && response.count) {
          thanksCount.textContent = `🎯 ${response.count} report${response.count > 1 ? 's' : ''} from this site`;
        }
      } catch (e) {
        // Ignore errors
      }
    }

    console.log('[DealStackr] Confirmation widget created');
  }

  /**
   * Submit user confirmation to storage - enhanced with deal details
   * @param {Object|string} reportData - Report data object or legacy type string
   */
  function submitUserConfirmation(reportData) {
    hasUserConfirmed = true;
    
    // Handle legacy string format
    if (typeof reportData === 'string') {
      reportData = { type: reportData };
    }
    
    // Extract merchant name from page title
    const getMerchantName = () => {
      let title = document.title || '';
      // Remove common suffixes
      title = title.replace(/\s*[-–—|:]\s*(Official Site|Home|Shop|Store|Online|Website).*$/i, '');
      title = title.replace(/\s*[-–—|:].*$/, ''); // Take first part before separator
      title = title.trim();
      // If title is too long, try to extract from domain
      if (title.length > 50 || !title) {
        const domain = getDomain();
        title = domain.replace(/\.(com|net|org|co\.uk|io)$/, '').replace(/^www\./, '');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
      return title;
    };

    const confirmation = {
      domain: getDomain(),
      merchant: getMerchantName(), // Add merchant name for better matching
      type: reportData.type, // 'cashback', 'promo', 'nothing'
      portal: reportData.portal || null, // 'rakuten', 'honey', 'topcashback', 'other'
      rate: reportData.rate || null, // numeric rate (e.g., 7 for 7%)
      rateDisplay: reportData.rateDisplay || null, // formatted string (e.g., "7%")
      fixedAmount: reportData.fixedAmount || null, // for fixed promos like "$10 off"
      cashbackType: reportData.cashbackType || null, // 'percent' or 'fixed'
      confirmedAt: new Date().toISOString(),
      url: window.location.href,
      // Metadata for aggregation
      reporterHash: generateAnonymousHash(), // anonymous but consistent per user
    };

    console.log('[DealStackr] User confirmation:', confirmation);

    try {
      chrome.runtime.sendMessage({
        action: 'userConfirmation',
        data: confirmation
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[DealStackr] Failed to save confirmation:', chrome.runtime.lastError);
        } else {
          console.log('[DealStackr] Confirmation saved');
        }
      });
    } catch (error) {
      console.warn('[DealStackr] Error saving confirmation:', error);
    }
  }

  /**
   * Check if user has already confirmed for this domain recently
   */
  async function hasRecentConfirmation() {
    try {
      // Check if chrome.runtime is available
      if (!chrome?.runtime?.sendMessage) {
        console.log('[DealStackr] chrome.runtime not available');
        return false;
      }
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[DealStackr] Confirmation check timed out');
          resolve(false);
        }, 2000);
        
        chrome.runtime.sendMessage({
          action: 'getRecentConfirmation',
          domain: getDomain()
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            console.log('[DealStackr] No recent confirmation (error):', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }
          console.log('[DealStackr] Recent confirmation check:', response);
          resolve(response && response.hasRecent);
        });
      });
    } catch (error) {
      console.log('[DealStackr] Confirmation check error:', error);
      return false;
    }
  }

  /**
   * Initialize detection
   */
  function init() {
    console.log('[DealStackr Signup] Initializing on:', getDomain());

    // Initial detection after page loads
    setTimeout(() => {
      reportResult();
    }, 2000);

    // Observe for dynamically loaded popups
    if (document.body) {
      observeDOM();
    } else {
      document.addEventListener('DOMContentLoaded', observeDOM);
    }

    // Re-check after some time (popups often appear after delay)
    setTimeout(() => {
      if (!hasReported) {
        reportResult();
      }
    }, 5000);

    setTimeout(() => {
      if (!hasReported) {
        reportResult();
      }
    }, 10000);

    // Show confirmation widget after a delay (give popups time to appear)
    // If auto-open is triggered (came from dashboard), show immediately and open
    if (shouldAutoOpen) {
      console.log('[DealStackr] Auto-opening widget from dashboard navigation');
      setTimeout(() => {
        createConfirmationWidget();
        // Auto-open the panel after widget is created
        setTimeout(() => {
          const panel = document.querySelector('#ds-panel');
          if (panel) {
            panel.classList.add('open');
            console.log('[DealStackr] Panel auto-opened');
          }
        }, 100);
      }, 1500); // Slightly faster for auto-open
    } else {
      // Normal flow - wait longer
      setTimeout(async () => {
        console.log('[DealStackr] Checking if should show widget...');
        try {
          const hasRecent = await hasRecentConfirmation();
          console.log('[DealStackr] Has recent confirmation:', hasRecent, 'User confirmed:', hasUserConfirmed);
          if (!hasRecent && !hasUserConfirmed) {
            console.log('[DealStackr] Creating confirmation widget');
            createConfirmationWidget();
          }
        } catch (error) {
          console.log('[DealStackr] Error checking confirmation, showing widget anyway:', error);
          createConfirmationWidget();
        }
      }, 3000);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a global function for manual testing via console
  window.__dealstackrShowWidget = function() {
    console.log('[DealStackr] Manually showing widget');
    createConfirmationWidget();
  };

  /**
   * Check for saved card offers for the current merchant and show reminder banner
   */
  async function checkForSavedOffers() {
    const currentDomain = getDomain();
    const currentHostname = window.location.hostname.toLowerCase();
    
    console.log('[DealStackr] Checking for saved offers on:', currentDomain, currentHostname);
    
    try {
      // Get saved offers AND crowdsourced data from chrome.storage.local
      const result = await new Promise((resolve, reject) => {
        if (!chrome?.storage?.local) {
          reject(new Error('Chrome storage API not available'));
          return;
        }
        chrome.storage.local.get(['dealCohorts', 'allDeals', 'crowdsourcedDeals'], (items) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });
      
      // FIRST CHECK: Does this domain have crowdsourced (user-generated) data?
      const crowdsourcedDeals = result.crowdsourcedDeals || {};
      const hasCrowdsourcedData = crowdsourcedDeals[currentDomain] && 
                                   crowdsourcedDeals[currentDomain].totalReports > 0;
      
      if (!hasCrowdsourcedData) {
        console.log('[DealStackr] No user-generated reports for this domain, not showing banner');
        return;
      }
      
      console.log('[DealStackr] Found', crowdsourcedDeals[currentDomain].totalReports, 'user report(s) for', currentDomain);
      
      // Collect all offers from storage
      let allOffers = [];
      
      if (result.dealCohorts && typeof result.dealCohorts === 'object') {
        Object.values(result.dealCohorts).forEach(cohort => {
          if (Array.isArray(cohort.offers)) {
            allOffers = allOffers.concat(cohort.offers);
          }
        });
      }
      
      if (Array.isArray(result.allDeals)) {
        allOffers = allOffers.concat(result.allDeals);
      }
      
      if (allOffers.length === 0) {
        console.log('[DealStackr] No saved offers found');
        return;
      }
      
      console.log('[DealStackr] Found', allOffers.length, 'total offers');
      
      // Find offers matching the current domain/merchant
      const matchingOffers = findMatchingOffers(allOffers, currentDomain, currentHostname);
      
      if (matchingOffers.length > 0) {
        console.log('[DealStackr] Found', matchingOffers.length, 'matching offers for this merchant with user reports');
        showOfferReminderBanner(matchingOffers, crowdsourcedDeals[currentDomain]);
      } else {
        console.log('[DealStackr] No matching offers for this merchant');
      }
    } catch (error) {
      console.log('[DealStackr] Error checking for saved offers:', error);
    }
  }
  
  /**
   * Find offers that match the current domain/hostname
   * Uses strict matching to avoid false positives (e.g., x.com matching Dropbox)
   */
  function findMatchingOffers(offers, currentDomain, currentHostname) {
    const matching = [];
    
    // Extract brand name from domain (e.g., "mackage" from "mackage.com")
    const domainParts = currentDomain.split('.');
    const brandFromDomain = domainParts[0].toLowerCase();
    
    // Also check for subdomains (e.g., "www.mackage.com" -> "mackage")
    const hostnameParts = currentHostname.replace('www.', '').split('.');
    const brandFromHostname = hostnameParts[0].toLowerCase();
    
    // Skip very short domain names (too likely to cause false positives)
    // Examples: x.com, t.co, fb.com, go.com
    const MIN_BRAND_LENGTH = 4;
    if (brandFromDomain.length < MIN_BRAND_LENGTH && brandFromHostname.length < MIN_BRAND_LENGTH) {
      console.log('[DealStackr] Domain too short for reliable matching:', brandFromDomain);
      return [];
    }
    
    // Use the longer brand name for matching
    const brandName = brandFromDomain.length >= brandFromHostname.length ? brandFromDomain : brandFromHostname;
    
    // Skip generic domains that would match too many things
    const SKIP_DOMAINS = ['www', 'shop', 'store', 'buy', 'app', 'web', 'go', 'get', 'my', 'the'];
    if (SKIP_DOMAINS.includes(brandName)) {
      console.log('[DealStackr] Generic domain, skipping matching:', brandName);
      return [];
    }
    
    for (const offer of offers) {
      const merchantName = (offer.merchant_name || offer.merchant || '').toLowerCase().trim();
      
      if (!merchantName || merchantName.length < 2) continue;
      
      // Normalize merchant name for comparison
      const merchantNormalized = merchantName.replace(/[^a-z0-9]/g, '');
      const brandNormalized = brandName.replace(/[^a-z0-9]/g, '');
      
      // Strategy 1: Exact match (domain equals merchant name)
      if (merchantNormalized === brandNormalized) {
        matching.push(offer);
        continue;
      }
      
      // Strategy 2: Brand is contained within merchant name at word boundary
      // e.g., "mackage" matches "Mackage Store" but not "smackage"
      const merchantWords = merchantName.split(/\s+/);
      const brandMatchesWord = merchantWords.some(word => {
        const wordNormalized = word.replace(/[^a-z0-9]/g, '');
        return wordNormalized === brandNormalized || 
               (wordNormalized.length >= 4 && brandNormalized.length >= 4 && wordNormalized.startsWith(brandNormalized));
      });
      
      if (brandMatchesWord) {
        matching.push(offer);
        continue;
      }
      
      // Strategy 3: First word of merchant name matches brand
      const firstMerchantWord = merchantWords[0]?.replace(/[^a-z0-9]/g, '') || '';
      if (firstMerchantWord.length >= 4 && brandNormalized.length >= 4) {
        if (firstMerchantWord === brandNormalized || 
            firstMerchantWord.startsWith(brandNormalized) ||
            brandNormalized.startsWith(firstMerchantWord)) {
          matching.push(offer);
          continue;
        }
      }
      
      // Strategy 4: Merchant name (single word) is contained within brand
      // e.g., domain "nordstromrack.com" should match merchant "Nordstrom"
      if (merchantWords.length === 1 && merchantNormalized.length >= 5) {
        if (brandNormalized.includes(merchantNormalized) || merchantNormalized.includes(brandNormalized)) {
          matching.push(offer);
          continue;
        }
      }
    }
    
    // Deduplicate by offer value
    const seen = new Set();
    return matching.filter(offer => {
      const key = `${offer.merchant_name || offer.merchant}-${offer.offer_value || offer.offer}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Show a reminder banner for saved offers (only when user reports exist)
   * @param {Array} offers - Matching offers for this merchant
   * @param {Object} crowdsourcedData - User-generated report data for this domain
   */
  function showOfferReminderBanner(offers, crowdsourcedData) {
    // Don't show if banner already exists
    if (document.getElementById('dealstackr-offer-banner')) {
      return;
    }
    
    // Check if user dismissed banner recently (last 24 hours for this domain)
    const dismissKey = `ds_banner_dismissed_${getDomain()}`;
    const dismissedAt = localStorage.getItem(dismissKey);
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
      console.log('[DealStackr] Banner was dismissed recently, not showing');
      return;
    }
    
    const bestOffer = offers[0]; // Show the first/best offer
    const offerValue = bestOffer.offer_value || bestOffer.offer || '';
    const issuer = (bestOffer.issuer || 'Card').replace(/^./, c => c.toUpperCase());
    const merchantName = bestOffer.merchant_name || bestOffer.merchant || 'this merchant';
    
    // Extract crowdsourced info
    const userReportCount = crowdsourcedData?.totalReports || 0;
    const cashbackInfo = crowdsourcedData?.aggregated?.cashback;
    const promoInfo = crowdsourcedData?.aggregated?.promo;
    
    // Create banner element
    const banner = document.createElement('div');
    banner.id = 'dealstackr-offer-banner';
    banner.innerHTML = `
      <style>
        #dealstackr-offer-banner {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: ds-banner-slide-in 0.4s ease;
        }
        @keyframes ds-banner-slide-in {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        #dealstackr-offer-banner * {
          box-sizing: border-box;
        }
        .ds-banner-container {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
          max-width: 340px;
          position: relative;
          overflow: hidden;
        }
        .ds-banner-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #10b981, #22d3ee, #818cf8);
        }
        .ds-banner-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .ds-banner-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        .ds-banner-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .ds-banner-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #10b981 0%, #22d3ee 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .ds-banner-title {
          color: white;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.3;
        }
        .ds-banner-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          margin-top: 2px;
        }
        .ds-banner-offer {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 12px;
        }
        .ds-banner-offer-label {
          color: #10b981;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .ds-banner-offer-value {
          color: white;
          font-size: 16px;
          font-weight: 700;
        }
        .ds-banner-offer-issuer {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
          margin-top: 4px;
        }
        .ds-banner-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ds-banner-powered {
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }
        .ds-banner-count {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 12px;
        }
      </style>
      <div class="ds-banner-container">
        <button class="ds-banner-close" id="ds-banner-close-btn">×</button>
        <div class="ds-banner-header">
          <div class="ds-banner-icon">💰</div>
          <div>
            <div class="ds-banner-title">You have a saved offer here!</div>
            <div class="ds-banner-subtitle">👥 ${userReportCount} user ${userReportCount === 1 ? 'report' : 'reports'} for this merchant</div>
          </div>
        </div>
        <div class="ds-banner-offer">
          <div class="ds-banner-offer-label">${issuer} Offer</div>
          <div class="ds-banner-offer-value">${offerValue}</div>
          <div class="ds-banner-offer-issuer">at ${merchantName}</div>
        </div>
        ${cashbackInfo && cashbackInfo.count > 0 ? `
        <div style="background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px;">
          <div style="color: #22d3ee; font-size: 10px; font-weight: 600; margin-bottom: 2px;">💸 CASHBACK AVAILABLE</div>
          <div style="color: rgba(255, 255, 255, 0.9); font-size: 12px;">
            ${cashbackInfo.avgRate ? `${cashbackInfo.avgRate}% back` : cashbackInfo.avgFixedAmount ? `$${cashbackInfo.avgFixedAmount} back` : 'Available'} 
            ${cashbackInfo.lastPortal ? ` via ${cashbackInfo.lastPortal}` : ''}
          </div>
        </div>
        ` : ''}
        ${promoInfo && promoInfo.count > 0 && promoInfo.avgRate ? `
        <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px;">
          <div style="color: #a855f7; font-size: 10px; font-weight: 600; margin-bottom: 2px;">🏷️ PROMO CODE</div>
          <div style="color: rgba(255, 255, 255, 0.9); font-size: 12px;">${promoInfo.avgRate}% off with signup</div>
        </div>
        ` : ''}
        <div class="ds-banner-footer">
          <span class="ds-banner-powered">DealStackr • Community-verified</span>
          ${offers.length > 1 ? `<span class="ds-banner-count">+${offers.length - 1} more</span>` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    // Add close button handler
    const closeBtn = document.getElementById('ds-banner-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        banner.style.animation = 'ds-banner-slide-out 0.3s ease forwards';
        banner.style.setProperty('--slide-out', 'translateX(100px)');
        // Add slide-out animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes ds-banner-slide-out {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100px); }
          }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
          banner.remove();
          style.remove();
        }, 300);
        
        // Remember dismissal
        localStorage.setItem(dismissKey, Date.now().toString());
      });
    }
    
    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (document.getElementById('dealstackr-offer-banner')) {
        const bannerEl = document.getElementById('dealstackr-offer-banner');
        if (bannerEl) {
          bannerEl.style.animation = 'ds-banner-slide-out 0.3s ease forwards';
          setTimeout(() => bannerEl.remove(), 300);
        }
      }
    }, 15000);
    
    console.log('[DealStackr] Showing offer reminder banner');
  }
  
  // Check for saved offers after a short delay (let the page load)
  setTimeout(() => {
    checkForSavedOffers();
  }, 2500);

})();

