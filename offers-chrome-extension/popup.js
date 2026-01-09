/**
 * Popup Script for DealStackr
 * 
 * Handles UI interactions, scanning offers, displaying results, and exporting deals
 */

(function() {
  'use strict';

  // DOM Elements
  const scanButton = document.getElementById('scanButton');
  const openDashboardButton = document.getElementById('openDashboardButton');
  const summaryRow = document.getElementById('summaryRow');
  const totalOffers = document.getElementById('totalOffers');
  const chaseCount = document.getElementById('chaseCount');
  const amexCount = document.getElementById('amexCount');
  const exportButton = document.getElementById('exportButton');
  const filters = document.getElementById('filters');
  const issuerFilter = document.getElementById('issuerFilter');
  const channelFilter = document.getElementById('channelFilter');
  const sortControls = document.getElementById('sortControls');
  const sortBy = document.getElementById('sortBy');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const noOffersState = document.getElementById('noOffersState');
  const offersContainer = document.getElementById('offersContainer');
  const offersTableBody = document.getElementById('offersTableBody');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  // Optional elements (may not exist in simplified popup)
  const cohortSelect = document.getElementById('cohortSelect');
  const newCohortButton = document.getElementById('newCohortButton');
  const cohortInfo = document.getElementById('cohortInfo');
  
  // Stack banner elements
  const stackBanner = document.getElementById('stackBanner');
  const stackMerchant = document.getElementById('stackMerchant');
  const confidenceValue = document.getElementById('confidenceValue');
  const stackCardOffer = document.getElementById('stackCardOffer');
  const cardOfferValue = document.getElementById('cardOfferValue');
  const stackTotal = document.getElementById('stackTotal');
  const stackTotalValue = document.getElementById('stackTotalValue');
  const stackPortals = document.getElementById('stackPortals');
  const portalLinks = document.getElementById('portalLinks');
  const stackableCount = document.getElementById('stackableCount');

  // State
  let allOffers = [];
  let filteredOffers = [];
  let allDeals = []; // All deals across all scans
  let dealCohorts = {}; // Organized by cohort date: { "2026-01-07": [...deals] }
  let currentCohort = null; // Current selected cohort date

  /**
   * Get current date in YYYY-MM-DD format for cohort
   * @returns {string}
   */
  function getCurrentCohortDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format cohort date for display
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {string}
   */
  function formatCohortDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  /**
   * Get the current active tab
   * @returns {Promise<chrome.tabs.Tab>}
   */
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  /**
   * Check if current page is supported
   * @returns {Promise<Object>}
   */
  async function checkPage() {
    try {
      const tab = await getCurrentTab();
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkPage' });
      return response || { issuer: null, supported: false };
    } catch (error) {
      return { issuer: null, supported: false };
    }
  }

  /**
   * Scan offers from the current page
   * @returns {Promise<Array>}
   */
  async function scanOffers() {
    try {
      const tab = await getCurrentTab();
      
      // Check if content script is loaded
      if (!tab.id) {
        throw new Error('Could not access current tab');
      }

      console.log('[DealStackr] Sending scan message to tab:', tab.id, 'URL:', tab.url);

      // Try to send message with timeout
      const response = await Promise.race([
        chrome.tabs.sendMessage(tab.id, { action: 'scanOffers' }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Content script did not respond')), 10000)
        )
      ]);
      
      console.log('[DealStackr] Received response:', response);
      
      if (!response) {
        throw new Error('No response from content script. Please refresh the page and try again.');
      }
      
      if (response && response.success) {
        const offers = response.offers || [];
        console.log('[DealStackr] Successfully received', offers.length, 'offers');
        return offers;
      } else {
        const errorMsg = response?.message || response?.error || 'Failed to scan offers';
        console.error('[DealStackr] Scan failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('[DealStackr] Error scanning offers:', error);
      console.error('[DealStackr] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Check if it's a connection error (content script not loaded)
      if (error.message && (
        error.message.includes('Could not establish connection') ||
        error.message.includes('Receiving end does not exist') ||
        error.message.includes('Timeout')
      )) {
        throw new Error('Content script not loaded. Please refresh the Chase or Amex page and try again.');
      }
      throw error;
    }
  }

  /**
   * Show loading state
   */
  function showLoading() {
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    noOffersState.style.display = 'none';
    offersContainer.style.display = 'none';
    summaryRow.style.display = 'none';
    filters.style.display = 'none';
    sortControls.style.display = 'none';
    errorState.style.display = 'none';
  }

  /**
   * Hide loading state
   */
  function hideLoading() {
    loadingState.style.display = 'none';
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  function showError(message) {
    hideLoading();
    errorState.style.display = 'block';
    errorMessage.textContent = message;
    emptyState.style.display = 'none';
    noOffersState.style.display = 'none';
    offersContainer.style.display = 'none';
    summaryRow.style.display = 'none';
    filters.style.display = 'none';
    sortControls.style.display = 'none';
  }

  /**
   * Show empty state
   */
  function showEmptyState() {
    hideLoading();
    emptyState.style.display = 'block';
    noOffersState.style.display = 'none';
    offersContainer.style.display = 'none';
    summaryRow.style.display = 'none';
    filters.style.display = 'none';
    sortControls.style.display = 'none';
    errorState.style.display = 'none';
  }

  /**
   * Show no offers state
   */
  function showNoOffersState() {
    hideLoading();
    noOffersState.style.display = 'block';
    emptyState.style.display = 'none';
    offersContainer.style.display = 'none';
    summaryRow.style.display = 'none';
    filters.style.display = 'none';
    sortControls.style.display = 'none';
    errorState.style.display = 'none';
  }

  /**
   * Format channel display name
   * @param {string} channel - Channel value
   * @returns {string}
   */
  function formatChannel(channel) {
    if (channel === 'in_store') return 'In-Store';
    if (channel === 'online') return 'Online';
    return 'Unknown';
  }

  /**
   * Format issuer display name
   * @param {string} issuer - Issuer value
   * @returns {string}
   */
  function formatIssuer(issuer) {
    if (issuer === 'chase') return 'Chase';
    if (issuer === 'amex') return 'Amex';
    return issuer;
  }

  /**
   * Sort offers based on selected criteria
   * @param {Array} offers - Offers to sort
   * @param {string} sortValue - Sort criteria
   * @returns {Array}
   */
  function sortOffers(offers, sortValue) {
    const sorted = [...offers];

    switch (sortValue) {
      case 'merchant':
        sorted.sort((a, b) => {
          return a.merchant_name.localeCompare(b.merchant_name);
        });
        break;

      case 'value-desc':
        sorted.sort((a, b) => {
          // Extract numeric value for comparison
          const aNum = parseFloat(a.offer_value.replace(/[^0-9.]/g, '')) || 0;
          const bNum = parseFloat(b.offer_value.replace(/[^0-9.]/g, '')) || 0;
          
          // If percentages, compare directly
          if (a.offer_type === 'percent' && b.offer_type === 'percent') {
            return bNum - aNum;
          }
          // If both flat, compare directly
          if (a.offer_type === 'flat' && b.offer_type === 'flat') {
            return bNum - aNum;
          }
          // Percentages generally rank higher
          if (a.offer_type === 'percent') return -1;
          if (b.offer_type === 'percent') return 1;
          
          return bNum - aNum;
        });
        break;

      case 'issuer':
        sorted.sort((a, b) => {
          return a.issuer.localeCompare(b.issuer);
        });
        break;

      default:
        break;
    }

    return sorted;
  }

  /**
   * Filter offers based on selected filters
   * @param {Array} offers - Offers to filter
   * @returns {Array}
   */
  function filterOffers(offers) {
    let filtered = [...offers];

    // Filter by issuer
    const issuerValue = issuerFilter.value;
    if (issuerValue !== 'all') {
      filtered = filtered.filter(offer => offer.issuer === issuerValue);
    }

    // Filter by channel
    const channelValue = channelFilter.value;
    if (channelValue !== 'all') {
      filtered = filtered.filter(offer => offer.channel === channelValue);
    }

    return filtered;
  }

  /**
   * Render offers table
   * @param {Array} offers - Offers to display
   */
  function renderOffers(offers) {
    // Clear existing rows
    offersTableBody.innerHTML = '';

    if (offers.length === 0) {
      showNoOffersState();
      return;
    }

    // Create table rows
    offers.forEach(offer => {
      const row = document.createElement('tr');
      
      const merchantCell = document.createElement('td');
      merchantCell.textContent = offer.merchant_name;
      merchantCell.className = 'merchant-cell';
      
      const offerCell = document.createElement('td');
      offerCell.textContent = offer.offer_value;
      offerCell.className = 'offer-cell';
      
      const cardTypeCell = document.createElement('td');
      cardTypeCell.textContent = offer.card_type || formatIssuer(offer.issuer);
      cardTypeCell.className = `card-type-cell issuer-${offer.issuer}`;
      
      const channelCell = document.createElement('td');
      channelCell.textContent = formatChannel(offer.channel);
      channelCell.className = 'channel-cell';
      
      row.appendChild(merchantCell);
      row.appendChild(offerCell);
      row.appendChild(cardTypeCell);
      row.appendChild(channelCell);
      
      offersTableBody.appendChild(row);
    });

    // Show table and controls
    hideLoading();
    offersContainer.style.display = 'block';
    summaryRow.style.display = 'flex';
    filters.style.display = 'flex';
    sortControls.style.display = 'flex';
    emptyState.style.display = 'none';
    noOffersState.style.display = 'none';
    errorState.style.display = 'none';
  }

  /**
   * Update summary counts
   * @param {Array} offers - All offers (not filtered)
   */
  function updateSummary(offers) {
    const total = offers.length;
    const chase = offers.filter(o => o.issuer === 'chase').length;
    const amex = offers.filter(o => o.issuer === 'amex').length;

    totalOffers.textContent = `Total Offers: ${total}`;
    chaseCount.textContent = `Chase: ${chase}`;
    amexCount.textContent = `Amex: ${amex}`;
  }

  /**
   * Apply filters and sorting, then render
   */
  function applyFiltersAndRender() {
    filteredOffers = filterOffers(allOffers);
    const sortedOffers = sortOffers(filteredOffers, sortBy.value);
    renderOffers(sortedOffers);
  }

  /**
   * Handle scan button click
   */
  async function handleScanClick() {
    console.log('[DealStackr] Scan button clicked');
    
    try {
      // Ensure a cohort is selected
      if (!currentCohort) {
        const todayCohort = getCurrentCohortDate();
        await createCohort(todayCohort);
        currentCohort = todayCohort;
        if (cohortSelect) {
          cohortSelect.value = currentCohort;
          updateCohortSelector();
        }
      }

      showLoading();

      // Check if page is supported
      const pageCheck = await checkPage();
      console.log('[DealStackr] Page check result:', pageCheck);
      
      if (!pageCheck.supported) {
        console.warn('[DealStackr] Page not supported');
        showEmptyState();
        return;
      }

      // Scan offers
      console.log('[DealStackr] Starting scan...');
      const offers = await scanOffers();
      console.log('[DealStackr] Scan complete, found', offers?.length || 0, 'offers');
      
      if (!offers || offers.length === 0) {
        console.warn('[DealStackr] No offers found');
        showNoOffersState();
        return;
      }

      // Store offers and render
      allOffers = offers;
      
      // Add to current cohort with timestamp
      const dealsWithTimestamp = offers.map(offer => ({
        ...offer,
        scanned_at: new Date().toISOString(),
        scanned_date: new Date().toLocaleDateString(),
        cohort_date: currentCohort
      }));
      
      // Add to cohort
      if (!dealCohorts[currentCohort]) {
        dealCohorts[currentCohort] = [];
      }
      dealCohorts[currentCohort] = dealCohorts[currentCohort].concat(dealsWithTimestamp);
      
      // Also add to allDeals for backward compatibility
      allDeals = allDeals.concat(dealsWithTimestamp);
      
      // Save to storage
      await saveDealsToStorage();
      console.log('[DealStackr] Saved', dealsWithTimestamp.length, 'offers to storage');
      
      updateSummary(allOffers);
      if (cohortInfo) {
        updateCohortInfo();
      }
      applyFiltersAndRender();

    } catch (error) {
      console.error('[DealStackr] Scan error:', error);
      console.error('[DealStackr] Error stack:', error.stack);
      const errorMsg = error.message || 'Failed to scan offers. Please make sure you are on a Chase or Amex Offers page.';
      showError(errorMsg);
    }
  }

  /**
   * Save all deals and cohorts to Chrome storage
   */
  async function saveDealsToStorage() {
    try {
      await chrome.storage.local.set({ 
        allDeals: allDeals,
        dealCohorts: dealCohorts,
        currentCohort: currentCohort
      });
      console.log('[DealStackr] Saved', allDeals.length, 'deals across', Object.keys(dealCohorts).length, 'cohorts');
    } catch (error) {
      console.error('[DealStackr] Error saving deals:', error);
    }
  }

  /**
   * Load all deals and cohorts from Chrome storage
   */
  async function loadDealsFromStorage() {
    try {
      const result = await chrome.storage.local.get(['allDeals', 'dealCohorts', 'currentCohort']);
      
      if (result.dealCohorts && typeof result.dealCohorts === 'object') {
        dealCohorts = result.dealCohorts;
      } else {
        // Migrate old data structure
        if (result.allDeals && Array.isArray(result.allDeals)) {
          // Group existing deals by cohort_date or scanned_date
          dealCohorts = {};
          result.allDeals.forEach(deal => {
            const cohortDate = deal.cohort_date || deal.scanned_date || getCurrentCohortDate();
            if (!dealCohorts[cohortDate]) {
              dealCohorts[cohortDate] = [];
            }
            dealCohorts[cohortDate].push(deal);
          });
        }
      }
      
      if (result.allDeals && Array.isArray(result.allDeals)) {
        allDeals = result.allDeals;
      }
      
      if (result.currentCohort) {
        currentCohort = result.currentCohort;
      } else if (Object.keys(dealCohorts).length > 0) {
        // Default to most recent cohort
        const sortedCohorts = Object.keys(dealCohorts).sort().reverse();
        currentCohort = sortedCohorts[0];
      }
      
      console.log('[DealStackr] Loaded', allDeals.length, 'deals across', Object.keys(dealCohorts).length, 'cohorts');
    } catch (error) {
      console.error('[DealStackr] Error loading deals:', error);
    }
  }

  /**
   * Create a new cohort
   * @param {string} dateStr - Date string in YYYY-MM-DD format (optional)
   */
  async function createCohort(dateStr = null) {
    const cohortDate = dateStr || getCurrentCohortDate();
    
    if (!dealCohorts[cohortDate]) {
      dealCohorts[cohortDate] = [];
      await saveDealsToStorage();
      if (cohortSelect) {
        updateCohortSelector();
      }
    }
    
    currentCohort = cohortDate;
    if (cohortSelect) {
      cohortSelect.value = currentCohort;
    }
    if (cohortInfo) {
      updateCohortInfo();
    }
    if (cohortSelect) {
      loadCohortDeals();
    }
  }

  /**
   * Update cohort selector dropdown
   */
  function updateCohortSelector() {
    if (!cohortSelect) return;
    
    cohortSelect.innerHTML = '<option value="">Select Cohort</option>';
    
    const sortedCohorts = Object.keys(dealCohorts).sort().reverse();
    
    sortedCohorts.forEach(cohortDate => {
      const option = document.createElement('option');
      option.value = cohortDate;
      option.textContent = formatCohortDate(cohortDate);
      if (cohortDate === currentCohort) {
        option.selected = true;
      }
      cohortSelect.appendChild(option);
    });
  }

  /**
   * Update cohort info display
   */
  function updateCohortInfo() {
    if (!cohortInfo) return;
    
    if (currentCohort && dealCohorts[currentCohort]) {
      const count = dealCohorts[currentCohort].length;
      cohortInfo.textContent = `${formatCohortDate(currentCohort)} (${count} deals)`;
      cohortInfo.style.display = 'inline';
    } else {
      cohortInfo.style.display = 'none';
    }
  }

  /**
   * Load deals for current cohort
   */
  function loadCohortDeals() {
    if (!currentCohort || !dealCohorts[currentCohort]) {
      allOffers = [];
      if (!cohortSelect) {
        // If no cohort selector, just show empty state
        showEmptyState();
      }
      return;
    }
    
    allOffers = dealCohorts[currentCohort];
    updateSummary(allOffers);
    if (cohortInfo) {
      updateCohortInfo();
    }
    applyFiltersAndRender();
  }

  /**
   * Handle cohort selection change
   */
  async function handleCohortChange() {
    if (!cohortSelect) return;
    
    const selectedCohort = cohortSelect.value;
    
    if (!selectedCohort) {
      currentCohort = null;
      allOffers = [];
      showEmptyState();
      return;
    }
    
    currentCohort = selectedCohort;
    await saveDealsToStorage();
    loadCohortDeals();
  }

  /**
   * Handle new cohort button click
   */
  async function handleNewCohortClick() {
    const todayCohort = getCurrentCohortDate();
    await createCohort(todayCohort);
  }

  /**
   * Export deals to JSON file
   */
  function exportDeals() {
    let dealsToExport = [];
    let filename = '';
    
    if (currentCohort && dealCohorts[currentCohort]) {
      // Export current cohort
      dealsToExport = dealCohorts[currentCohort];
      filename = `dealstackr-cohort-${currentCohort}.json`;
    } else if (allDeals.length > 0) {
      // Export all deals
      dealsToExport = allDeals;
      filename = `dealstackr-all-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      alert('No deals to export. Scan some offers first!');
      return;
    }

    if (dealsToExport.length === 0) {
      alert('No deals to export in this cohort.');
      return;
    }

    // Create JSON content
    const exportData = {
      cohort_date: currentCohort || 'all',
      export_date: new Date().toISOString(),
      total_deals: dealsToExport.length,
      deals: dealsToExport
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[DealStackr] Exported', dealsToExport.length, 'deals from cohort', currentCohort || 'all');
  }

  /**
   * Portal information for display
   */
  const PORTAL_INFO = {
    rakuten: { name: 'Rakuten', url: 'https://www.rakuten.com' },
    topcashback: { name: 'TopCashback', url: 'https://www.topcashback.com' },
    honey: { name: 'Honey', url: 'https://www.joinhoney.com' },
    retailmenot: { name: 'RetailMeNot', url: 'https://www.retailmenot.com' },
    befrugal: { name: 'BeFrugal', url: 'https://www.befrugal.com' },
    mrrebates: { name: 'Mr. Rebates', url: 'https://www.mrrebates.com' }
  };

  /**
   * Check affiliate confidence for current merchant
   */
  async function checkAffiliateConfidence() {
    if (!stackBanner) return;
    
    try {
      const tab = await getCurrentTab();
      if (!tab || !tab.url) return;
      
      // Skip Chase/Amex pages (they're for card offers)
      const url = tab.url.toLowerCase();
      if (url.includes('chase.com') || url.includes('americanexpress.com')) {
        stackBanner.style.display = 'none';
        return;
      }
      
      // Skip non-http pages
      if (!url.startsWith('http')) {
        stackBanner.style.display = 'none';
        return;
      }
      
      // Extract domain
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      
      console.log('[DealStackr] Checking affiliate confidence for:', domain);
      
      // Show banner with loading state
      stackBanner.style.display = 'block';
      stackMerchant.textContent = domain;
      confidenceValue.textContent = 'Checking...';
      confidenceValue.className = 'confidence-value';
      stackCardOffer.style.display = 'none';
      stackTotal.style.display = 'none';
      stackPortals.style.display = 'none';
      
      // Get affiliate confidence from background
      const response = await chrome.runtime.sendMessage({
        action: 'getAffiliateConfidence',
        domain: domain
      });
      
      if (response && response.success) {
        updateStackBanner(response);
      } else {
        confidenceValue.textContent = 'No data';
        confidenceValue.className = 'confidence-value confidence-none';
      }
      
    } catch (error) {
      console.warn('[DealStackr] Error checking affiliate confidence:', error);
      if (stackBanner) {
        stackBanner.style.display = 'none';
      }
    }
  }

  /**
   * Update the stack banner with affiliate data
   * @param {Object} data - Response from background worker
   */
  function updateStackBanner(data) {
    if (!stackBanner || !data) return;
    
    const affiliateData = data.affiliateData || {};
    const confidence = affiliateData.confidence || {};
    const cardOffers = data.cardOffers || [];
    const stackValue = data.stackValue || {};
    
    // Update merchant name
    if (affiliateData.merchantName) {
      stackMerchant.textContent = affiliateData.merchantName;
    }
    
    // Update confidence display
    const level = confidence.confidenceLevel || 'none';
    confidenceValue.textContent = confidence.confidenceLabel || 'No data';
    confidenceValue.className = `confidence-value confidence-${level}`;
    
    // Show card offer if available
    if (cardOffers.length > 0) {
      const offer = cardOffers[0];
      cardOfferValue.textContent = `${offer.offer_value} (${offer.card_type || offer.issuer})`;
      stackCardOffer.style.display = 'flex';
    } else {
      stackCardOffer.style.display = 'none';
    }
    
    // Show stack total if stackable
    if (stackValue.isStackable && stackValue.estimatedStack) {
      stackTotalValue.textContent = stackValue.estimatedStack;
      stackTotal.style.display = 'flex';
    } else {
      stackTotal.style.display = 'none';
    }
    
    // Show portal links if high/medium confidence
    const portals = confidence.portals || [];
    if (portals.length > 0 && (level === 'high' || level === 'medium')) {
      portalLinks.innerHTML = '';
      portals.slice(0, 3).forEach(portalId => {
        const portal = PORTAL_INFO[portalId];
        if (portal) {
          const link = document.createElement('a');
          link.href = portal.url;
          link.target = '_blank';
          link.className = 'portal-link';
          link.textContent = portal.name;
          link.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: portal.url });
          });
          portalLinks.appendChild(link);
        }
      });
      stackPortals.style.display = 'flex';
    } else {
      stackPortals.style.display = 'none';
    }
    
    // If no useful data, hide the banner
    if (level === 'none' && cardOffers.length === 0) {
      stackBanner.style.display = 'none';
    }
  }

  /**
   * Update stackable count in summary
   */
  async function updateStackableCount() {
    if (!stackableCount) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getStackableOffers'
      });
      
      if (response && response.success) {
        const count = response.totalStackable || 0;
        if (count > 0) {
          stackableCount.textContent = `Stackable: ${count}`;
          stackableCount.style.display = 'inline';
        } else {
          stackableCount.style.display = 'none';
        }
      }
    } catch (error) {
      console.warn('[DealStackr] Error updating stackable count:', error);
    }
  }

  /**
   * Open dashboard in a new tab
   */
  async function openDashboard() {
    console.log('[DealStackr] Opening dashboard...');
    try {
      // Open dashboard.html in a new tab
      const url = chrome.runtime.getURL('dashboard.html');
      console.log('[DealStackr] Dashboard URL:', url);
      
      await chrome.tabs.create({ url: url });
      console.log('[DealStackr] Dashboard opened successfully');
      
      // Close popup after opening dashboard
      setTimeout(() => {
        window.close();
      }, 100);
    } catch (error) {
      console.error('[DealStackr] Error opening dashboard:', error);
      alert('Failed to open dashboard: ' + error.message);
    }
  }

  /**
   * Initialize popup
   */
  async function init() {
    console.log('[DealStackr] Initializing popup...');
    
    try {
      // Verify critical elements exist
      if (!scanButton) {
        console.error('[DealStackr] scanButton not found!');
        alert('Error: Scan button not found. Please reload the extension.');
        return;
      }
      if (!openDashboardButton) {
        console.error('[DealStackr] openDashboardButton not found!');
        alert('Error: Dashboard button not found. Please reload the extension.');
        return;
      }

      console.log('[DealStackr] Buttons found, setting up event listeners...');

      // Set up event listeners FIRST (before async operations)
      scanButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[DealStackr] Scan button clicked');
        handleScanClick().catch(err => {
          console.error('[DealStackr] Scan error:', err);
          showError('Failed to scan: ' + err.message);
        });
      });
      
      openDashboardButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[DealStackr] Dashboard button clicked');
        openDashboard().catch(err => {
          console.error('[DealStackr] Dashboard open error:', err);
          alert('Failed to open dashboard: ' + err.message);
        });
      });
      
      console.log('[DealStackr] Event listeners attached');

      // Load existing deals from storage
      await loadDealsFromStorage();
    
      // Update cohort selector if it exists
      if (cohortSelect) {
        updateCohortSelector();
        
        // If no cohort selected, create today's cohort
        if (!currentCohort) {
          const todayCohort = getCurrentCohortDate();
          await createCohort(todayCohort);
        } else {
          loadCohortDeals();
        }
      } else {
        // No cohort selector - just ensure we have a current cohort for scanning
        if (!currentCohort) {
          currentCohort = getCurrentCohortDate();
          if (!dealCohorts[currentCohort]) {
            dealCohorts[currentCohort] = [];
          }
        }
      }
      
      // Check page status on load
      try {
        const pageCheck = await checkPage();
        
        if (!pageCheck.supported && allOffers.length === 0) {
          showEmptyState();
        }
      } catch (error) {
        console.warn('[DealStackr] Error checking page:', error);
        // Continue anyway
      }

      // Additional event listeners for other controls
      if (exportButton) exportButton.addEventListener('click', exportDeals);
      if (issuerFilter) issuerFilter.addEventListener('change', applyFiltersAndRender);
      if (channelFilter) channelFilter.addEventListener('change', applyFiltersAndRender);
      if (sortBy) sortBy.addEventListener('change', applyFiltersAndRender);
      if (cohortSelect) cohortSelect.addEventListener('change', handleCohortChange);
      if (newCohortButton) newCohortButton.addEventListener('click', handleNewCohortClick);
      
      // Check affiliate confidence for current page (if on a merchant site)
      checkAffiliateConfidence().catch(err => {
        console.warn('[DealStackr] Error checking affiliate:', err);
      });
      
      // Update stackable count in summary
      updateStackableCount().catch(err => {
        console.warn('[DealStackr] Error updating stackable count:', err);
      });
      
      console.log('[DealStackr] Popup initialized successfully');
    } catch (error) {
      console.error('[DealStackr] Error initializing popup:', error);
      console.error('[DealStackr] Error stack:', error.stack);
      alert('Error initializing extension: ' + error.message);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

