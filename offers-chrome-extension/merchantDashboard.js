/**
 * Merchant Dashboard Script for DealStackr
 * 
 * Displays merchants from scanned card offers and routes users to sites
 * for signup offer detection. Creates stacking opportunities:
 * Card Offer + Signup Offer = Maximum Savings
 * 
 * Dashboard navigates, extension senses.
 */

(function() {
  'use strict';

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const merchantCount = document.getElementById('merchantCount');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const merchantGrid = document.getElementById('merchantGrid');
  const extensionStatus = document.getElementById('extensionStatus');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const recentlyCheckedSection = document.getElementById('recentlyCheckedSection');
  const recentlyCheckedList = document.getElementById('recentlyCheckedList');

  // State
  let cardOffers = [];           // Raw card offers from storage
  let merchantOffers = [];       // Unique merchants with their offers
  let filteredMerchants = [];
  let recentChecks = [];
  let extensionConnected = false;

  /**
   * Score band thresholds for signup detection
   */
  const SCORE_BANDS = {
    HIGH: { min: 80, max: 100, label: 'Signup offer detected', show: true },
    MEDIUM: { min: 50, max: 79, label: 'Signup offer likely', show: true },
    LOW: { min: 0, max: 49, label: 'No signup offer detected', show: false }
  };

  // Use MERCHANT_URL_MAPPINGS from merchantData.js (loaded via script tag)
  // Fallback to empty object if not loaded
  const MERCHANT_URLS = (typeof MERCHANT_URL_MAPPINGS !== 'undefined') ? MERCHANT_URL_MAPPINGS : {};

  /**
   * Get score band from score
   * @param {number} score
   * @returns {Object}
   */
  function getScoreBand(score) {
    if (score >= SCORE_BANDS.HIGH.min) return { ...SCORE_BANDS.HIGH, id: 'high' };
    if (score >= SCORE_BANDS.MEDIUM.min) return { ...SCORE_BANDS.MEDIUM, id: 'medium' };
    return { ...SCORE_BANDS.LOW, id: 'low' };
  }

  /**
   * Check if extension is installed and connected
   */
  async function checkExtensionStatus() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
              resolve(null);
            } else {
              resolve(response);
            }
          });
          setTimeout(() => resolve(null), 2000);
        });

        if (response) {
          extensionConnected = true;
          extensionStatus.className = 'extension-status connected';
          statusIcon.textContent = '✓';
          statusText.textContent = 'DealStackr connected — signup offers detected automatically on visit';
        } else {
          setExtensionDisconnected();
        }
      } else {
        setExtensionDisconnected();
      }
    } catch (error) {
      console.warn('[Merchant Dashboard] Extension check failed:', error);
      setExtensionDisconnected();
    }
  }

  /**
   * Set extension as disconnected
   */
  function setExtensionDisconnected() {
    extensionConnected = false;
    extensionStatus.className = 'extension-status disconnected';
    statusIcon.textContent = '⚠️';
    statusText.textContent = 'Extension not detected — install DealStackr to enable signup detection';
  }

  /**
   * Load card offers from storage and extract unique merchants
   */
  async function loadCardOffers() {
    console.log('[Merchant Dashboard] Loading card offers from storage...');
    
    try {
      const result = await new Promise((resolve, reject) => {
        if (!chrome?.storage?.local) {
          reject(new Error('Chrome storage not available'));
          return;
        }
        
        chrome.storage.local.get(['dealCohorts', 'allDeals'], (items) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });

      // Collect all offers
      let offers = [];
      
      if (result.dealCohorts && typeof result.dealCohorts === 'object') {
        Object.values(result.dealCohorts).forEach(cohortOffers => {
          if (Array.isArray(cohortOffers)) {
            offers.push(...cohortOffers);
          }
        });
      } else if (result.allDeals && Array.isArray(result.allDeals)) {
        offers = result.allDeals;
      }

      cardOffers = offers;
      console.log('[Merchant Dashboard] Loaded', cardOffers.length, 'card offers');

      // Extract unique merchants with their best offers
      merchantOffers = extractUniqueMerchants(cardOffers);
      console.log('[Merchant Dashboard] Found', merchantOffers.length, 'unique merchants');

      // Update category filter
      populateCategoryFilter();

      // Render
      filterAndRenderMerchants();
      
      if (merchantOffers.length > 0) {
        showMerchantGrid();
      } else {
        showEmptyState();
      }

    } catch (error) {
      console.error('[Merchant Dashboard] Error loading offers:', error);
      showEmptyState();
    }
  }

  /**
   * Extract unique merchants from card offers
   * @param {Array} offers
   * @returns {Array}
   */
  function extractUniqueMerchants(offers) {
    const merchantMap = new Map();

    for (const offer of offers) {
      const merchantName = offer.merchant_name || offer.merchant || '';
      if (!merchantName || !isValidMerchantName(merchantName)) continue;

      const normalizedName = merchantName.toLowerCase().trim();
      const existing = merchantMap.get(normalizedName);

      if (!existing) {
        merchantMap.set(normalizedName, {
          merchantId: normalizedName.replace(/[^a-z0-9]/g, '-'),
          merchantName: merchantName,
          normalizedName: normalizedName,
          offers: [offer],
          bestOffer: offer,
          issuer: offer.issuer || 'unknown',
          category: categorizeByIssuer(offer.issuer),
          landingUrl: getMerchantUrl(merchantName)
        });
      } else {
        existing.offers.push(offer);
        // Keep track of best offer (highest value)
        const existingValue = parseOfferValue(existing.bestOffer.offer_value);
        const newValue = parseOfferValue(offer.offer_value);
        if (newValue > existingValue) {
          existing.bestOffer = offer;
        }
      }
    }

    return Array.from(merchantMap.values()).sort((a, b) => 
      a.merchantName.localeCompare(b.merchantName)
    );
  }

  /**
   * Check if merchant name is valid
   * @param {string} name
   * @returns {boolean}
   */
  function isValidMerchantName(name) {
    if (!name || name.length < 2) return false;
    const lower = name.toLowerCase();
    const invalid = ['earn', 'spend', 'get', 'back', 'all offers', 'my offers', 'offers', 'unknown'];
    return !invalid.includes(lower);
  }

  /**
   * Parse offer value to numeric for comparison
   * @param {string} offerValue
   * @returns {number}
   */
  function parseOfferValue(offerValue) {
    if (!offerValue) return 0;
    const percentMatch = offerValue.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) return parseFloat(percentMatch[1]) * 10;
    const dollarMatch = offerValue.match(/\$(\d+(?:\.\d+)?)/);
    if (dollarMatch) return parseFloat(dollarMatch[1]);
    return 0;
  }

  /**
   * Get merchant URL from name
   * @param {string} merchantName
   * @returns {string|null}
   */
  function getMerchantUrl(merchantName) {
    const normalized = merchantName.toLowerCase().trim();
    
    // Check direct match
    if (MERCHANT_URLS[normalized]) {
      return MERCHANT_URLS[normalized];
    }
    
    // Check partial match
    for (const [key, url] of Object.entries(MERCHANT_URLS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return url;
      }
    }
    
    // Try to construct URL from name
    const domainName = normalized.replace(/[^a-z0-9]/g, '');
    return `https://www.${domainName}.com/`;
  }

  /**
   * Categorize merchant by issuer (simple categorization)
   * @param {string} issuer
   * @returns {string}
   */
  function categorizeByIssuer(issuer) {
    return issuer === 'chase' ? 'Chase' : issuer === 'amex' ? 'Amex' : 'Card Offer';
  }

  /**
   * Populate category filter with issuers
   */
  function populateCategoryFilter() {
    if (!categoryFilter) return;

    const issuers = [...new Set(merchantOffers.map(m => m.issuer))];
    
    categoryFilter.innerHTML = '<option value="all">All Cards</option>';
    
    issuers.forEach(issuer => {
      const option = document.createElement('option');
      option.value = issuer;
      option.textContent = issuer === 'chase' ? 'Chase' : issuer === 'amex' ? 'Amex' : issuer;
      categoryFilter.appendChild(option);
    });
  }

  /**
   * Filter merchants based on search and category
   */
  function filterMerchants() {
    const searchTerm = searchInput?.value?.toLowerCase().trim() || '';
    const issuerValue = categoryFilter?.value || 'all';

    filteredMerchants = merchantOffers.filter(merchant => {
      const matchesSearch = !searchTerm || 
        merchant.merchantName.toLowerCase().includes(searchTerm);

      const matchesIssuer = issuerValue === 'all' || 
        merchant.issuer === issuerValue;

      return matchesSearch && matchesIssuer;
    });

    return filteredMerchants;
  }

  /**
   * Filter and render merchants
   */
  function filterAndRenderMerchants() {
    filterMerchants();
    renderMerchants(filteredMerchants);
    updateMerchantCount(filteredMerchants.length);
  }

  /**
   * Render merchant cards
   * @param {Array} merchants
   */
  function renderMerchants(merchants) {
    if (!merchantGrid) return;

    merchantGrid.innerHTML = '';

    if (merchants.length === 0) {
      showEmptyState();
      return;
    }

    merchants.forEach(merchant => {
      const card = createMerchantCard(merchant);
      merchantGrid.appendChild(card);
    });

    showMerchantGrid();
  }

  /**
   * Create a merchant card element
   * @param {Object} merchant
   * @returns {HTMLElement}
   */
  function createMerchantCard(merchant) {
    const card = document.createElement('div');
    card.className = 'merchant-card';
    card.dataset.merchantId = merchant.merchantId;

    // Get recent signup check status
    const recentCheck = getRecentCheck(merchant.merchantId);
    const signupStatus = getSignupStatus(recentCheck);
    
    // Format card offer info
    const cardOfferText = merchant.bestOffer.offer_value || 'Card offer available';
    const issuerBadge = merchant.issuer === 'chase' ? 'Chase' : 'Amex';
    const hasUrl = merchant.landingUrl && !merchant.landingUrl.includes('undefined');

    card.innerHTML = `
      <div class="merchant-header">
        <h3 class="merchant-name">${escapeHtml(merchant.merchantName)}</h3>
        <span class="merchant-category ${merchant.issuer}">${issuerBadge}</span>
      </div>
      
      <div class="card-offer-section">
        <div class="card-offer-label">💳 Card Offer</div>
        <div class="card-offer-value">${escapeHtml(cardOfferText)}</div>
        ${merchant.offers.length > 1 ? `<div class="offer-count">+${merchant.offers.length - 1} more offer${merchant.offers.length > 2 ? 's' : ''}</div>` : ''}
      </div>
      
      <div class="signup-status-section">
        <div class="signup-label">📧 Signup Offer</div>
        <div class="signup-status">
          <span class="status-indicator ${signupStatus.indicatorClass}"></span>
          <span class="status-text">${signupStatus.label}</span>
        </div>
      </div>
      
      <div class="merchant-actions">
        ${hasUrl ? `
          <button class="visit-button" data-url="${escapeHtml(merchant.landingUrl)}">
            <span class="icon">🔗</span>
            Visit site to check signup offer
          </button>
        ` : `
          <div class="no-url-notice">URL not available for this merchant</div>
        `}
      </div>
    `;

    // Add click handler
    const visitButton = card.querySelector('.visit-button');
    if (visitButton) {
      visitButton.addEventListener('click', () => handleVisitClick(merchant));
    }

    return card;
  }

  /**
   * Get signup status info based on recent check
   * @param {Object|null} recentCheck
   * @returns {Object}
   */
  function getSignupStatus(recentCheck) {
    if (!recentCheck) {
      return {
        indicatorClass: 'pending',
        label: 'Check on site'
      };
    }

    const band = getScoreBand(recentCheck.score);
    
    if (recentCheck.detected && band.show) {
      return {
        indicatorClass: 'detected',
        label: `${recentCheck.value || 'Signup offer found'} — ${formatTimeAgo(recentCheck.detectedAt)}`
      };
    }

    return {
      indicatorClass: 'not-found',
      label: `Checked ${formatTimeAgo(recentCheck.detectedAt)}`
    };
  }

  /**
   * Get recent check for a merchant
   * @param {string} merchantId
   * @returns {Object|null}
   */
  function getRecentCheck(merchantId) {
    return recentChecks.find(check => check.merchantId === merchantId) || null;
  }

  /**
   * Handle visit button click
   * @param {Object} merchant
   */
  function handleVisitClick(merchant) {
    console.log('[Merchant Dashboard] Opening:', merchant.merchantName, merchant.landingUrl);

    // Track visit
    trackMerchantVisit(merchant.merchantId);

    // Open in new tab
    window.open(merchant.landingUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Track merchant visit
   * @param {string} merchantId
   */
  function trackMerchantVisit(merchantId) {
    try {
      if (chrome?.storage) {
        chrome.storage.local.get(['merchantVisits'], (result) => {
          const visits = result.merchantVisits || {};
          visits[merchantId] = {
            lastVisit: new Date().toISOString(),
            visitCount: (visits[merchantId]?.visitCount || 0) + 1
          };
          chrome.storage.local.set({ merchantVisits: visits });
        });
      }
    } catch (error) {
      console.warn('[Merchant Dashboard] Could not track visit:', error);
    }
  }

  /**
   * Load recent signup detection results
   */
  async function loadRecentChecks() {
    try {
      if (chrome?.storage) {
        const result = await new Promise((resolve) => {
          chrome.storage.local.get(['signupDetectionResults'], (items) => {
            resolve(items);
          });
        });

        if (result.signupDetectionResults && Array.isArray(result.signupDetectionResults)) {
          recentChecks = result.signupDetectionResults;
          console.log('[Merchant Dashboard] Loaded', recentChecks.length, 'recent checks');
          updateRecentlyChecked();
        }
      }
    } catch (error) {
      console.warn('[Merchant Dashboard] Could not load recent checks:', error);
    }
  }

  /**
   * Update recently checked section
   */
  function updateRecentlyChecked() {
    if (!recentlyCheckedSection || !recentlyCheckedList) return;

    const visibleChecks = recentChecks.filter(check => {
      const band = getScoreBand(check.score);
      return band.show && check.detected;
    }).slice(0, 10);

    if (visibleChecks.length === 0) {
      recentlyCheckedSection.style.display = 'none';
      return;
    }

    recentlyCheckedSection.style.display = 'block';
    recentlyCheckedList.innerHTML = '';

    visibleChecks.forEach(check => {
      const item = document.createElement('div');
      item.className = 'recent-item';
      item.innerHTML = `
        <span class="recent-merchant">${escapeHtml(check.domain)}</span>
        <span class="recent-result detected">${check.value || 'Offer found'}</span>
        <span class="recent-time">${formatTimeAgo(check.detectedAt)}</span>
      `;
      recentlyCheckedList.appendChild(item);
    });
  }

  /**
   * Update merchant count display
   * @param {number} count
   */
  function updateMerchantCount(count) {
    if (merchantCount) {
      merchantCount.textContent = `${count} merchant${count !== 1 ? 's' : ''} with card offers`;
    }
  }

  /**
   * Show loading state
   */
  function showLoading() {
    if (loadingState) loadingState.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (merchantGrid) merchantGrid.style.display = 'none';
  }

  /**
   * Show empty state
   */
  function showEmptyState() {
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) {
      emptyState.style.display = 'flex';
      const emptyText = emptyState.querySelector('p');
      if (emptyText) {
        emptyText.textContent = cardOffers.length === 0 
          ? 'No card offers found. Scan your Chase or Amex offers first.'
          : 'No merchants match your search.';
      }
    }
    if (merchantGrid) merchantGrid.style.display = 'none';
  }

  /**
   * Show merchant grid
   */
  function showMerchantGrid() {
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (merchantGrid) merchantGrid.style.display = 'grid';
  }

  /**
   * Format time ago
   * @param {string} isoString
   * @returns {string}
   */
  function formatTimeAgo(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  }

  /**
   * Escape HTML
   * @param {string} text
   * @returns {string}
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Listen for signup detection results from extension
   */
  function listenForDetectionResults() {
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'signupOfferDetected') {
          console.log('[Merchant Dashboard] Detection result received:', request.data);
          
          // Update recent checks
          const existingIndex = recentChecks.findIndex(c => c.domain === request.data.domain);
          if (existingIndex >= 0) {
            recentChecks[existingIndex] = request.data;
          } else {
            recentChecks.unshift(request.data);
          }
          
          updateRecentlyChecked();
          filterAndRenderMerchants();
          
          sendResponse({ success: true });
        }
        return true;
      });
    }
  }

  /**
   * Listen for storage changes (real-time updates)
   */
  function listenForStorageChanges() {
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          if (changes.dealCohorts || changes.allDeals) {
            console.log('[Merchant Dashboard] Card offers updated, reloading...');
            loadCardOffers();
          }
          if (changes.signupDetectionResults) {
            console.log('[Merchant Dashboard] Signup detections updated');
            loadRecentChecks();
          }
        }
      });
    }
  }

  /**
   * Debounce utility
   * @param {Function} func
   * @param {number} wait
   * @returns {Function}
   */
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Initialize dashboard
   */
  function init() {
    console.log('[Merchant Dashboard] Initializing...');

    // Set up event listeners
    if (searchInput) {
      searchInput.addEventListener('input', debounce(filterAndRenderMerchants, 300));
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', filterAndRenderMerchants);
    }

    // Check extension status
    checkExtensionStatus();

    // Load recent checks
    loadRecentChecks();

    // Listen for detection results
    listenForDetectionResults();

    // Listen for storage changes
    listenForStorageChanges();

    // Load card offers
    loadCardOffers();

    console.log('[Merchant Dashboard] Initialization complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
