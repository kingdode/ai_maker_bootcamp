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
      
      // Step 1: Scroll to load all offers (Chase lazy-loads)
      sendProgress('info', 'Scrolling to load all offers...');
      let lastHeight = 0;
      let scrollAttempts = 0;
      
      while (scrollAttempts < 10) {
        window.scrollTo(0, document.body.scrollHeight);
        await delay(1500);
        
        const newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight) break;
        lastHeight = newHeight;
        scrollAttempts++;
        console.log('[DealStackr] Scrolled...', scrollAttempts);
      }
      
      // Scroll back to top
      window.scrollTo(0, 0);
      await delay(1000);
      
      // Step 2: Find all add buttons
      console.log('[DealStackr] Looking for Add/+ buttons...');
      
      const allClickable = document.querySelectorAll('button, [role="button"], a, span[onclick], div[onclick]');
      
      let addButtons = Array.from(allClickable).filter(btn => {
        const text = btn.textContent?.trim() || '';
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        const svg = btn.querySelector('svg');
        
        // Multiple detection strategies - including + buttons
        const isAddButton = 
          text === '+' ||
          text === '＋' ||
          text.toLowerCase() === 'add' ||
          text.toLowerCase().includes('add to card') ||
          text.toLowerCase().includes('save offer') ||
          ariaLabel.includes('add') ||
          title.includes('add') ||
          (svg && text.length < 5); // Small button with icon (likely + icon)
        
        // Must be visible and not already clicked
        const isVisible = btn.offsetParent !== null;
        const notAdded = !text.toLowerCase().includes('added') && 
                         !btn.classList.contains('added') &&
                         !btn.disabled;
        
        return isAddButton && isVisible && notAdded;
      });
      
      console.log('[DealStackr] Found', addButtons.length, 'add buttons');

      if (addButtons.length === 0) {
        sendProgress('warning', 'No "Add to Card" or "+" buttons found on this page.');
        sendProgress('info', 'Make sure you are logged in and viewing your offers.');
        sendProgress('info', 'Navigate to: Chase Dashboard → Credit Card → Offers');
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

          // Check if already added
          const buttonText = button.textContent?.toLowerCase() || '';
          if (buttonText.includes('added') || buttonText.includes('saved')) {
            alreadyAdded++;
            sendProgress('info', `⏭ Already added: ${merchantName}`);
            continue;
          }

          await scrollToElement(button);
          await delay(400);
          
          // Click the button
          console.log('[DealStackr] Clicking button for:', merchantName);
          button.click();
          activated++;
          
          sendProgress('success', `✓ Added: ${merchantName}`);
          
          // Wait between clicks to avoid rate limiting
          await delay(1200 + Math.random() * 500);
          
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
