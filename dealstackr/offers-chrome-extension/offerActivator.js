/**
 * Offer Activator for DealStackr
 * 
 * Automatically activates Chase and Amex offers by clicking "Add to Card" buttons.
 * This script runs when triggered from the DealStackr dashboard.
 */

(function() {
  'use strict';

  const isChase = window.location.hostname.includes('chase.com');
  const isAmex = window.location.hostname.includes('americanexpress.com');

  console.log('[DealStackr Activator] Starting on:', window.location.href);
  console.log('[DealStackr Activator] Is Chase:', isChase, 'Is Amex:', isAmex);

  // Send message to background script
  function sendProgress(type, message, data = {}) {
    chrome.runtime.sendMessage({
      action: 'activationProgress',
      type,
      message,
      data,
      issuer: isChase ? 'chase' : 'amex'
    });
  }

  // Wait for element to appear
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element not found: ${selector}`));
          return;
        }
        
        setTimeout(check, 500);
      };
      
      check();
    });
  }

  // Wait for multiple elements
  function waitForElements(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          resolve(elements);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Elements not found: ${selector}`));
          return;
        }
        
        setTimeout(check, 500);
      };
      
      check();
    });
  }

  // Delay helper
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Scroll element into view and wait
  async function scrollToElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(300);
  }

  // ============================================
  // CHASE ACTIVATION
  // ============================================
  async function activateChaseOffers() {
    sendProgress('info', 'Looking for Chase offers on this page...');
    console.log('[DealStackr] Starting Chase activation on:', window.location.href);
    
    try {
      // Wait for page to fully load (Chase uses heavy JS)
      await delay(3000);
      
      // Log page info for debugging
      console.log('[DealStackr] Page title:', document.title);
      console.log('[DealStackr] Looking for Add to Card buttons...');
      
      // Chase Merchant Offers page selectors (based on their dashboard structure)
      // The offers are typically in a grid/list with "Add to card" or "Save offer" buttons
      let addButtons = [];
      
      // Strategy 1: Look for buttons with specific text patterns
      const allButtons = document.querySelectorAll('button, [role="button"]');
      console.log('[DealStackr] Found', allButtons.length, 'total buttons on page');
      
      addButtons = Array.from(allButtons).filter(btn => {
        const text = btn.textContent?.toLowerCase().trim() || '';
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        
        // Check for Chase's various button texts
        const isAddButton = 
          text.includes('add to card') ||
          text.includes('save offer') ||
          text.includes('add offer') ||
          text === 'add' ||
          ariaLabel.includes('add to card') ||
          ariaLabel.includes('save offer') ||
          title.includes('add to card');
        
        // Must be visible and enabled
        const isVisible = btn.offsetParent !== null;
        const isEnabled = !btn.disabled && !btn.classList.contains('disabled');
        
        return isAddButton && isVisible && isEnabled;
      });
      
      console.log('[DealStackr] Found', addButtons.length, 'Add to Card buttons');
      
      // Strategy 2: Look for Chase's specific component patterns
      if (addButtons.length === 0) {
        // Chase uses mds (Modern Design System) components
        const mdsButtons = document.querySelectorAll('[class*="mds-button"], [class*="offer"] button, [class*="Offer"] button');
        addButtons = Array.from(mdsButtons).filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return (text.includes('add') || text.includes('save')) && 
                 btn.offsetParent !== null && 
                 !btn.disabled;
        });
        console.log('[DealStackr] Strategy 2 found', addButtons.length, 'buttons');
      }
      
      // Strategy 3: Look for any clickable element with add/save text
      if (addButtons.length === 0) {
        const allClickable = document.querySelectorAll('button, a, [role="button"], [onclick]');
        addButtons = Array.from(allClickable).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.match(/\b(add|save)\b.*\b(card|offer)\b/i) && 
                 el.offsetParent !== null;
        });
        console.log('[DealStackr] Strategy 3 found', addButtons.length, 'elements');
      }

      if (addButtons.length === 0) {
        sendProgress('warning', 'No "Add to Card" buttons found on this page.');
        sendProgress('info', 'Make sure you are logged in and viewing your offers.');
        sendProgress('info', 'Navigate to: Chase Dashboard → Credit Card → Offers');
        
        // Debug: Log what's on the page
        const pageText = document.body?.innerText?.substring(0, 500) || '';
        console.log('[DealStackr] Page preview:', pageText);
        return;
      }

      sendProgress('info', `Found ${addButtons.length} offers to activate`);

      let activated = 0;
      let failed = 0;
      let alreadyAdded = 0;

      for (let i = 0; i < addButtons.length; i++) {
        const button = addButtons[i];
        
        try {
          // Get merchant name from nearby elements
          const card = button.closest('[class*="offer"], [class*="Offer"], [class*="card"], [class*="Card"], li, article');
          const merchantEl = card?.querySelector('h2, h3, h4, [class*="merchant"], [class*="name"], [class*="title"], strong');
          const merchantName = merchantEl?.textContent?.trim() || `Offer ${i + 1}`;

          // Check if already added (button might say "Added" or be disabled now)
          const buttonText = button.textContent?.toLowerCase() || '';
          if (buttonText.includes('added') || buttonText.includes('saved')) {
            alreadyAdded++;
            sendProgress('info', `⏭ Already added: ${merchantName}`);
            continue;
          }

          await scrollToElement(button);
          await delay(300);
          
          // Click the button
          console.log('[DealStackr] Clicking button for:', merchantName);
          button.click();
          activated++;
          
          sendProgress('success', `✓ Added: ${merchantName}`);
          
          // Wait between clicks to avoid rate limiting
          await delay(1000 + Math.random() * 500);
          
          // Update progress
          const progress = Math.round(((i + 1) / addButtons.length) * 100);
          sendProgress('progress', `${progress}%`, { progress, current: i + 1, total: addButtons.length });
          
        } catch (error) {
          failed++;
          console.error('[DealStackr] Error clicking button:', error);
          sendProgress('error', `✗ Failed to add offer ${i + 1}: ${error.message}`);
        }
      }

      const summary = `Activation complete! Added ${activated} offers` + 
        (alreadyAdded > 0 ? `, ${alreadyAdded} already saved` : '') +
        (failed > 0 ? `, ${failed} failed` : '');
      
      sendProgress('complete', summary, {
        activated,
        alreadyAdded,
        failed,
        total: addButtons.length
      });

    } catch (error) {
      console.error('[DealStackr] Chase activation error:', error);
      sendProgress('error', `Chase activation error: ${error.message}`);
    }
  }

  // ============================================
  // AMEX ACTIVATION
  // ============================================
  async function activateAmexOffers() {
    sendProgress('info', 'Looking for Amex offers page...');
    
    try {
      // Wait for page to load
      await delay(2000);
      
      // Amex offers page has "Add to Card" buttons
      // Selectors may need updating as Amex changes their site
      const addButtonSelectors = [
        'button[title*="Add to Card"]',
        'button[aria-label*="Add to Card"]',
        '[data-testid*="add-offer-button"]',
        '.offer-cta button',
        'button.btn-add-offer',
        'button.offer-add-btn',
      ];

      let addButtons = [];
      
      for (const selector of addButtonSelectors) {
        try {
          const buttons = document.querySelectorAll(selector);
          if (buttons.length > 0) {
            addButtons = Array.from(buttons).filter(btn => !btn.disabled);
            if (addButtons.length > 0) break;
          }
        } catch (e) {
          // Selector might not be valid, try next
        }
      }

      // Fallback: Find buttons by text content
      if (addButtons.length === 0) {
        const allButtons = document.querySelectorAll('button');
        addButtons = Array.from(allButtons).filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          const title = btn.getAttribute('title')?.toLowerCase() || '';
          return (text.includes('add to card') || title.includes('add to card')) && 
                 !btn.disabled &&
                 btn.offsetParent !== null; // visible
        });
      }

      if (addButtons.length === 0) {
        sendProgress('warning', 'No "Add to Card" buttons found. Make sure you are logged in and on the Amex offers page.');
        sendProgress('info', 'Try navigating to: americanexpress.com/en-us/benefits/offers');
        return;
      }

      sendProgress('info', `Found ${addButtons.length} offers to activate`);

      let activated = 0;
      let failed = 0;

      for (let i = 0; i < addButtons.length; i++) {
        const button = addButtons[i];
        
        try {
          // Get merchant name if possible
          const card = button.closest('[class*="offer"], [class*="Offer"], .card');
          const merchantEl = card?.querySelector('[class*="merchant"], [class*="name"], h3, h4, .offer-title');
          const merchantName = merchantEl?.textContent?.trim() || `Offer ${i + 1}`;

          await scrollToElement(button);
          
          // Click the button
          button.click();
          activated++;
          
          sendProgress('success', `✓ Added: ${merchantName}`);
          
          // Wait between clicks to avoid rate limiting
          await delay(1000 + Math.random() * 500);
          
          // Update progress
          const progress = Math.round(((i + 1) / addButtons.length) * 100);
          sendProgress('progress', `${progress}%`, { progress, current: i + 1, total: addButtons.length });
          
        } catch (error) {
          failed++;
          sendProgress('error', `✗ Failed to add offer ${i + 1}: ${error.message}`);
        }
      }

      sendProgress('complete', `Activation complete! Added ${activated} offers, ${failed} failed.`, {
        activated,
        failed,
        total: addButtons.length
      });

    } catch (error) {
      sendProgress('error', `Amex activation error: ${error.message}`);
    }
  }

  // ============================================
  // MAIN EXECUTION
  // ============================================
  
  // Listen for activation command from dashboard
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[DealStackr Activator] Received message:', message);
    
    if (message.action === 'startActivation') {
      if (isChase) {
        activateChaseOffers();
      } else if (isAmex) {
        activateAmexOffers();
      } else {
        sendProgress('error', 'Not on a Chase or Amex page');
      }
      sendResponse({ received: true });
    }
    
    return true;
  });

  // Check if we should auto-start (from session storage set by dashboard)
  function checkAutoStart() {
    try {
      const shouldActivate = sessionStorage.getItem('dealstackr_auto_activate');
      if (shouldActivate === 'true') {
        console.log('[DealStackr Activator] Auto-starting from session storage');
        sessionStorage.removeItem('dealstackr_auto_activate');
        
        setTimeout(() => {
          if (isChase) activateChaseOffers();
          else if (isAmex) activateAmexOffers();
        }, 4000); // Give page time to fully load
        
        return true;
      }
    } catch (e) {
      console.log('[DealStackr Activator] Session storage not available');
    }
    return false;
  }
  
  // Also check URL params for auto-start (legacy support)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('dealstackr_activate') === 'true' || checkAutoStart()) {
    console.log('[DealStackr Activator] Auto-starting activation');
    
    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          if (isChase) activateChaseOffers();
          else if (isAmex) activateAmexOffers();
        }, 4000);
      });
    } else {
      setTimeout(() => {
        if (isChase) activateChaseOffers();
        else if (isAmex) activateAmexOffers();
      }, 4000);
    }
  }
  
  // Log that script is ready
  console.log('[DealStackr Activator] Script ready. Call window.__dealstackrActivate() to manually activate.')
  window.__dealstackrActivate = function() {
    if (isChase) activateChaseOffers();
    else if (isAmex) activateAmexOffers();
    else console.log('Not on Chase or Amex page');
  };

})();
