/**
 * Dashboard Script for DealStackr
 * 
 * Full-screen dashboard that displays all scanned offers from chrome.storage.local
 * Reads from dealCohorts and allDeals storage keys
 */

(function() {
  'use strict';

  // DOM Elements
  const summaryBar = document.getElementById('summaryBar');
  const totalOffers = document.getElementById('totalOffers');
  const chaseCount = document.getElementById('chaseCount');
  const amexCount = document.getElementById('amexCount');
  const lastScan = document.getElementById('lastScan');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const partialDataWarning = document.getElementById('partialDataWarning');
  const offersContainer = document.getElementById('offersContainer');
  const offersTableBody = document.getElementById('offersTableBody');
  const issuerFilter = document.getElementById('issuerFilter');
  const cardFilter = document.getElementById('cardFilter');
  const channelFilter = document.getElementById('channelFilter');
  const stackableFilter = document.getElementById('stackableFilter');
  const sortBy = document.getElementById('sortBy');

  // State
  let allOffers = [];
  let filteredOffers = [];
  let sortField = 'last_scanned_at';
  let sortDirection = 'desc';
  let stackableCount = 0;

  /**
   * Load all offers from chrome.storage.local
   * Reads from dealCohorts (preferred) or allDeals (legacy)
   */
  async function loadOffers() {
    console.log('[Dealstackr Dashboard] Loading offers...');
    try {
      showLoading();

      // Read from chrome.storage.local
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['dealCohorts', 'allDeals'], (items) => {
          if (chrome.runtime.lastError) {
            console.error('[Dealstackr Dashboard] Storage error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log('[Dealstackr Dashboard] Storage read successful:', {
              hasCohorts: !!items.dealCohorts,
              cohortsCount: items.dealCohorts ? Object.keys(items.dealCohorts).length : 0,
              hasDeals: !!items.allDeals,
              dealsCount: items.allDeals ? items.allDeals.length : 0
            });
            resolve(items);
          }
        });
      });

      let offers = [];

      // Prefer dealCohorts (newer structure)
      if (result.dealCohorts && typeof result.dealCohorts === 'object') {
        // Merge all cohorts into a single array
        Object.values(result.dealCohorts).forEach(cohortOffers => {
          if (Array.isArray(cohortOffers)) {
            offers.push(...cohortOffers);
          }
        });
      } 
      // Fallback to allDeals (legacy format)
      else if (result.allDeals && Array.isArray(result.allDeals)) {
        offers = result.allDeals;
      }

      // Transform extension format to dashboard format
      let transformedOffers = offers.map(transformOffer).filter(offer => {
        // Filter out invalid offers
        return offer.merchant && offer.offer_value;
      });

      if (transformedOffers.length === 0) {
        console.warn('[Dealstackr Dashboard] No offers found in storage');
        showEmptyState();
        return;
      }

      // Deduplicate offers
      const beforeDedup = transformedOffers.length;
      allOffers = deduplicateOffers(transformedOffers);
      const afterDedup = allOffers.length;
      
      if (beforeDedup !== afterDedup) {
        console.log(`[Dealstackr Dashboard] Deduplicated ${beforeDedup} offers to ${afterDedup} unique offers (removed ${beforeDedup - afterDedup} duplicates)`);
      } else {
        console.log('[Dealstackr Dashboard] Loaded', allOffers.length, 'offers (no duplicates found)');
      }

      // Fetch stackable data from background worker
      try {
        const stackableResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'getStackableOffers' }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[Dealstackr Dashboard] Error fetching stackable data:', chrome.runtime.lastError);
              resolve(null);
            } else {
              resolve(response);
            }
          });
        });

        if (stackableResponse && stackableResponse.success && stackableResponse.offers) {
          // Merge stackable info into our offers
          const stackableMap = new Map();
          stackableResponse.offers.forEach(offer => {
            const key = `${(offer.merchant_name || offer.merchant || '').toLowerCase()}|${offer.offer_value}`;
            stackableMap.set(key, offer);
          });

          allOffers = allOffers.map(offer => {
            const key = `${offer.merchant.toLowerCase()}|${offer.offer_value}`;
            const stackableInfo = stackableMap.get(key);
            return {
              ...offer,
              stackable: stackableInfo?.stackable || false,
              affiliateConfidence: stackableInfo?.affiliateConfidence || 'none',
              affiliatePortals: stackableInfo?.affiliatePortals || [],
              typicalRate: stackableInfo?.typicalRate || null
            };
          });

          stackableCount = allOffers.filter(o => o.stackable).length;
          console.log('[Dealstackr Dashboard] Found', stackableCount, 'stackable offers');
        }
      } catch (error) {
        console.warn('[Dealstackr Dashboard] Error enriching with stackable data:', error);
      }

      // Check for partial data (offers missing key fields)
      const hasPartialData = allOffers.some(offer => 
        !offer.channel || offer.channel === 'unknown' || !offer.card_name
      );
      if (hasPartialData) {
        partialDataWarning.style.display = 'flex';
      }

      updateSummary();
      updateCardFilter();
      applyFiltersAndSort();
      showOffers();

    } catch (error) {
      console.error('[Dealstackr Dashboard] Error loading offers:', error);
      console.error('[Dealstackr Dashboard] Error stack:', error.stack);
      showEmptyState();
    }
  }

  /**
   * Transform extension offer format to dashboard format
   * Extension uses: merchant_name, card_type, scanned_at
   * Dashboard expects: merchant, card_name, last_scanned_at
   */
  function transformOffer(extOffer) {
    return {
      merchant: extOffer.merchant_name || extOffer.merchant || '',
      offer_value: extOffer.offer_value || '',
      offer_type: extOffer.offer_type || 'percent',
      issuer: extOffer.issuer || 'chase',
      card_name: extOffer.card_type || extOffer.card_name || (extOffer.issuer === 'chase' ? 'Chase' : 'Amex'),
      channel: extOffer.channel || 'unknown',
      last_scanned_at: extOffer.scanned_at || extOffer.last_scanned_at || new Date().toISOString()
    };
  }

  /**
   * Deduplicate offers based on normalized merchant name, offer value, card name, and issuer
   * Keeps the most recently scanned version of each duplicate
   * @param {Array} offers - Array of offer objects
   * @returns {Array} Deduplicated array of offers
   */
  function deduplicateOffers(offers) {
    const offerMap = new Map();
    
    for (const offer of offers) {
      // Create a unique key based on normalized merchant name, offer value, card, and issuer
      const normalizedMerchant = (offer.merchant || '').toLowerCase().trim();
      const normalizedOfferValue = (offer.offer_value || '').toLowerCase().trim();
      const normalizedCard = (offer.card_name || '').toLowerCase().trim();
      const normalizedIssuer = (offer.issuer || '').toLowerCase().trim();
      
      const key = `${normalizedMerchant}|${normalizedOfferValue}|${normalizedCard}|${normalizedIssuer}`;
      
      // If we haven't seen this offer, or this one is newer, keep it
      if (!offerMap.has(key)) {
        offerMap.set(key, offer);
      } else {
        const existingOffer = offerMap.get(key);
        const existingDate = new Date(existingOffer.last_scanned_at || 0);
        const newDate = new Date(offer.last_scanned_at || 0);
        
        // Keep the more recently scanned offer
        if (newDate > existingDate) {
          offerMap.set(key, offer);
        }
      }
    }
    
    return Array.from(offerMap.values());
  }

  /**
   * Update summary bar with counts and last scan date
   */
  function updateSummary() {
    const total = allOffers.length;
    const chase = allOffers.filter(o => o.issuer === 'chase').length;
    const amex = allOffers.filter(o => o.issuer === 'amex').length;

    // Find most recent scan
    let mostRecent = null;
    if (allOffers.length > 0) {
      mostRecent = allOffers.reduce((latest, offer) => {
        const offerDate = new Date(offer.last_scanned_at);
        const latestDate = new Date(latest.last_scanned_at);
        return offerDate > latestDate ? offer : latest;
      });
    }

    totalOffers.textContent = `Total: ${total}`;
    chaseCount.textContent = `Chase: ${chase}`;
    amexCount.textContent = `Amex: ${amex}`;

    if (mostRecent) {
      const date = new Date(mostRecent.last_scanned_at);
      lastScan.textContent = `Last scan: ${formatDate(date)}`;
    } else {
      lastScan.textContent = 'Last scan: —';
    }
  }

  /**
   * Update card filter dropdown with unique card names
   */
  function updateCardFilter() {
    const uniqueCards = [...new Set(allOffers.map(o => o.card_name))].sort();
    
    // Clear existing options except "All"
    cardFilter.innerHTML = '<option value="all">All</option>';
    
    uniqueCards.forEach(card => {
      const option = document.createElement('option');
      option.value = card;
      option.textContent = card;
      cardFilter.appendChild(option);
    });
  }

  /**
   * Filter offers based on selected filters
   */
  function filterOffers() {
    filteredOffers = [...allOffers];

    // Filter by issuer
    const issuerValue = issuerFilter.value;
    if (issuerValue !== 'all') {
      filteredOffers = filteredOffers.filter(offer => offer.issuer === issuerValue);
    }

    // Filter by card
    const cardValue = cardFilter.value;
    if (cardValue !== 'all') {
      filteredOffers = filteredOffers.filter(offer => offer.card_name === cardValue);
    }

    // Filter by channel
    const channelValue = channelFilter.value;
    if (channelValue !== 'all') {
      filteredOffers = filteredOffers.filter(offer => offer.channel === channelValue);
    }

    // Filter by stackable
    if (stackableFilter) {
      const stackableValue = stackableFilter.value;
      if (stackableValue === 'stackable') {
        filteredOffers = filteredOffers.filter(offer => offer.stackable === true);
      } else if (stackableValue === 'not-stackable') {
        filteredOffers = filteredOffers.filter(offer => offer.stackable !== true);
      }
    }

    return filteredOffers;
  }

  /**
   * Sort offers based on selected criteria
   */
  function sortOffers(offers) {
    const sorted = [...offers];

    switch (sortField) {
      case 'merchant':
        sorted.sort((a, b) => a.merchant.localeCompare(b.merchant));
        break;

      case 'offer_value':
        sorted.sort((a, b) => {
          const aNum = parseFloat(a.offer_value.replace(/[^0-9.]/g, '')) || 0;
          const bNum = parseFloat(b.offer_value.replace(/[^0-9.]/g, '')) || 0;
          
          // Percentages generally rank higher
          if (a.offer_type === 'percent' && b.offer_type === 'flat') return -1;
          if (a.offer_type === 'flat' && b.offer_type === 'percent') return 1;
          
          return bNum - aNum; // Descending
        });
        break;

      case 'issuer':
        sorted.sort((a, b) => a.issuer.localeCompare(b.issuer));
        break;

      case 'card_name':
        sorted.sort((a, b) => a.card_name.localeCompare(b.card_name));
        break;

      case 'last_scanned_at':
        sorted.sort((a, b) => {
          const aDate = new Date(a.last_scanned_at);
          const bDate = new Date(b.last_scanned_at);
          return bDate - aDate; // Newest first
        });
        break;

      case 'stackable':
        sorted.sort((a, b) => {
          // Stackable offers first
          if (a.stackable && !b.stackable) return -1;
          if (!a.stackable && b.stackable) return 1;
          return 0;
        });
        break;

      default:
        break;
    }

    // Apply sort direction
    if (sortDirection === 'asc' && sortField !== 'offer_value' && sortField !== 'last_scanned_at') {
      sorted.reverse();
    }

    return sorted;
  }

  /**
   * Apply filters and sorting, then render
   */
  function applyFiltersAndSort() {
    const filtered = filterOffers();
    const sorted = sortOffers(filtered);
    renderOffers(sorted);
  }

  /**
   * Render offers table
   */
  function renderOffers(offers) {
    offersTableBody.innerHTML = '';

    if (offers.length === 0) {
      offersContainer.style.display = 'none';
      emptyState.style.display = 'block';
      emptyState.querySelector('p').textContent = 'No offers match the current filters.';
      return;
    }

    // Track merchants that appear multiple times (for highlighting)
    const merchantCounts = {};
    offers.forEach(offer => {
      merchantCounts[offer.merchant] = (merchantCounts[offer.merchant] || 0) + 1;
    });

    offers.forEach(offer => {
      const row = document.createElement('tr');
      const isMultipleCards = merchantCounts[offer.merchant] > 1;

      // Merchant cell
      const merchantCell = document.createElement('td');
      merchantCell.className = 'merchant-cell';
      merchantCell.textContent = offer.merchant;
      if (isMultipleCards) {
        merchantCell.classList.add('highlight-merchant');
        merchantCell.title = `Available on ${merchantCounts[offer.merchant]} cards`;
      }
      row.appendChild(merchantCell);

      // Offer cell
      const offerCell = document.createElement('td');
      offerCell.className = 'offer-cell';
      offerCell.textContent = offer.offer_value;
      row.appendChild(offerCell);

      // Issuer cell
      const issuerCell = document.createElement('td');
      issuerCell.className = `issuer-cell issuer-${offer.issuer}`;
      issuerCell.textContent = offer.issuer === 'chase' ? 'Chase' : 'Amex';
      row.appendChild(issuerCell);

      // Card cell
      const cardCell = document.createElement('td');
      cardCell.className = 'card-cell';
      cardCell.textContent = offer.card_name;
      row.appendChild(cardCell);

      // Channel cell
      const channelCell = document.createElement('td');
      channelCell.className = 'channel-cell';
      channelCell.textContent = formatChannel(offer.channel);
      row.appendChild(channelCell);

      // Stackable cell
      const stackCell = document.createElement('td');
      stackCell.className = 'stack-cell';
      if (offer.stackable) {
        stackCell.innerHTML = '<span class="stack-badge stackable">💰 Stackable</span>';
        if (offer.typicalRate) {
          stackCell.title = `Typical cashback: ${offer.typicalRate}`;
        }
      } else {
        stackCell.innerHTML = '<span class="stack-badge not-stackable">—</span>';
      }
      row.appendChild(stackCell);

      // Last scanned cell
      const scannedCell = document.createElement('td');
      scannedCell.className = 'scanned-cell';
      scannedCell.textContent = formatDate(new Date(offer.last_scanned_at));
      row.appendChild(scannedCell);

      offersTableBody.appendChild(row);
    });

    offersContainer.style.display = 'block';
    emptyState.style.display = 'none';
  }

  /**
   * Format channel display name
   */
  function formatChannel(channel) {
    if (channel === 'in_store') return 'In-Store';
    if (channel === 'online') return 'Online';
    return 'Unknown';
  }

  /**
   * Format date for display
   */
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Show loading state
   */
  function showLoading() {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    offersContainer.style.display = 'none';
    partialDataWarning.style.display = 'none';
  }

  /**
   * Show empty state
   */
  function showEmptyState() {
    loadingState.style.display = 'none';
    emptyState.style.display = 'block';
    offersContainer.style.display = 'none';
    partialDataWarning.style.display = 'none';
  }

  /**
   * Show offers table
   */
  function showOffers() {
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    offersContainer.style.display = 'block';
  }

  /**
   * Handle table header click for sorting
   */
  function handleHeaderClick(event) {
    const header = event.target.closest('.sortable');
    if (!header) return;

    const field = header.dataset.sort;
    if (!field) return;

    // Toggle sort direction if same field
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = field === 'offer_value' || field === 'last_scanned_at' ? 'desc' : 'asc';
    }

    // Update sort select
    sortBy.value = sortField === 'last_scanned_at' ? 'last_scanned_at' : 
                   sortField === 'offer_value' ? 'value-desc' : sortField;

    // Update sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
      indicator.textContent = '';
    });
    const indicator = header.querySelector('.sort-indicator');
    if (indicator) {
      indicator.textContent = sortDirection === 'asc' ? ' ↑' : ' ↓';
    }

    applyFiltersAndSort();
  }

  /**
   * Initialize dashboard
   */
  function init() {
    console.log('[Dealstackr Dashboard] Initializing...');
    
    try {
      // Verify critical elements exist
      if (!issuerFilter || !cardFilter || !channelFilter || !sortBy) {
        console.error('[Dealstackr Dashboard] Missing required DOM elements!');
        console.error('issuerFilter:', !!issuerFilter, 'cardFilter:', !!cardFilter, 'channelFilter:', !!channelFilter, 'sortBy:', !!sortBy);
        return;
      }

      // Event listeners
      issuerFilter.addEventListener('change', applyFiltersAndSort);
      cardFilter.addEventListener('change', applyFiltersAndSort);
      channelFilter.addEventListener('change', applyFiltersAndSort);
      if (stackableFilter) {
        stackableFilter.addEventListener('change', applyFiltersAndSort);
      }
      sortBy.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === 'value-desc') {
          sortField = 'offer_value';
          sortDirection = 'desc';
        } else if (value === 'last_scanned_at') {
          sortField = 'last_scanned_at';
          sortDirection = 'desc';
        } else {
          sortField = value;
          sortDirection = 'asc';
        }
        applyFiltersAndSort();
      });

      // Table header click handlers
      document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', handleHeaderClick);
        header.style.cursor = 'pointer';
      });

      // Listen for storage changes (real-time updates)
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && (changes.dealCohorts || changes.allDeals)) {
          console.log('[Dealstackr Dashboard] Storage changed, reloading offers...');
          loadOffers();
        }
      });

      // Load offers on init
      loadOffers();
      
      console.log('[Dealstackr Dashboard] Initialization complete');
    } catch (error) {
      console.error('[Dealstackr Dashboard] Initialization error:', error);
      console.error('[Dealstackr Dashboard] Error stack:', error.stack);
      showEmptyState();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

