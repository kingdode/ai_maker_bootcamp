// ============================================================================
// Bitcoin Ordinals Tax Tracker - Main Application Logic
// ============================================================================

// Storage keys for localStorage
const STORAGE_KEYS = {
    ASSETS: 'ordinals_tax_tracker_assets',
    TRANSACTIONS: 'ordinals_tax_tracker_transactions',
    BTC_PRICE: 'ordinals_tax_tracker_btc_price',
    ETH_PRICE: 'ordinals_tax_tracker_eth_price'
};

// State management
let assets = [];
let transactions = [];
let btcPriceToday = 0;
let ethPriceToday = 0;
let editingAssetId = null;
let editingTransactionId = null;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the application on page load
 */
async function init() {
    loadData();
    await initHistoricalBTCPriceMap(); // Initialize historical BTC price lookup maps
    renderTransactions();
    renderAssetSummary();
    populateSaleAssetDropdown(); // Populate sale asset dropdown
    updateDashboard();
    setAssetDefaultDate();
    setSaleDefaultDate();
    updateCurrencyLabels('purchase'); // Initialize labels
    updateCurrencyLabels('sale'); // Initialize labels
    calculateAssetUSD();
    calculateSaleUSD();
    
    // Load BTC price if available
    const savedBTCPrice = localStorage.getItem(STORAGE_KEYS.BTC_PRICE);
    if (savedBTCPrice) {
        btcPriceToday = parseFloat(savedBTCPrice);
        document.getElementById('btcPriceToday').value = btcPriceToday;
        updateBTCPriceDisplay();
    }
    
    // Load ETH price if available
    const savedETHPrice = localStorage.getItem(STORAGE_KEYS.ETH_PRICE);
    if (savedETHPrice) {
        ethPriceToday = parseFloat(savedETHPrice);
        document.getElementById('ethPriceToday').value = ethPriceToday;
        updateETHPriceDisplay();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================================================
// Data Persistence (localStorage)
// ============================================================================

/**
 * Load all data from localStorage
 */
function loadData() {
    const assetsData = localStorage.getItem(STORAGE_KEYS.ASSETS);
    const transactionsData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    
    assets = assetsData ? JSON.parse(assetsData) : [];
    transactions = transactionsData ? JSON.parse(transactionsData) : [];
}

/**
 * Save assets to localStorage
 */
function saveAssets() {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
}

/**
 * Save transactions to localStorage
 */
function saveTransactions() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

// ============================================================================
// Asset Management
// ============================================================================

/**
 * Handle asset form submission (create or update)
 */
function handleAssetSubmit(event) {
    event.preventDefault();
    
    const assetType = document.getElementById('assetType').value;
    const assetName = document.getElementById('assetName').value.trim();
    const quantity = parseFloat(document.getElementById('assetQuantity').value);
    const valueBTC = parseFloat(document.getElementById('assetValueBTC').value);
    
    // Validate inputs
    if (!assetType) {
        alert('Please select an asset type');
        document.getElementById('assetType').focus();
        return;
    }
    if (!assetName) {
        alert('Please enter an asset name/ticker');
        document.getElementById('assetName').focus();
        return;
    }
    if (isNaN(quantity) || quantity < 0) {
        alert('Please enter a valid quantity');
        document.getElementById('assetQuantity').focus();
        return;
    }
    if (isNaN(valueBTC) || valueBTC < 0) {
        alert('Please enter a valid BTC value');
        document.getElementById('assetValueBTC').focus();
        return;
    }
    
    const assetData = {
        type: assetType,
        name: assetName,
        identifier: document.getElementById('assetIdentifier').value.trim(),
        quantity: quantity,
        valueBTC: valueBTC
    };
    
    if (editingAssetId !== null) {
        // Update existing asset
        const index = assets.findIndex(a => a.id === editingAssetId);
        if (index !== -1) {
            assets[index] = { ...assets[index], ...assetData };
            saveAssets();
            renderAssets();
            resetAssetForm();
        }
    } else {
        // Create new asset
        const newAsset = {
            id: Date.now().toString(), // Simple ID generation
            ...assetData,
            createdAt: new Date().toISOString()
        };
        assets.push(newAsset);
        saveAssets();
        resetAssetForm();
    }
    
    updateDashboard();
}

/**
 * Edit an asset
 */
function editAsset(id) {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    
    editingAssetId = id;
    document.getElementById('assetType').value = asset.type;
    document.getElementById('assetName').value = asset.name;
    document.getElementById('assetIdentifier').value = asset.identifier || '';
    document.getElementById('assetQuantity').value = asset.quantity;
    document.getElementById('assetValueBTC').value = asset.valueBTC;
    
    document.getElementById('assetFormTitle').textContent = 'Edit Asset';
    document.getElementById('assetSubmitBtn').textContent = 'Update Asset';
    document.getElementById('assetCancelBtn').style.display = 'inline-block';
    
    // Scroll to form
    document.querySelector('.asset-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Delete an asset
 */
function deleteAsset(id) {
    if (!confirm('Are you sure you want to delete this asset? This will not delete associated transactions.')) {
        return;
    }
    
    assets = assets.filter(a => a.id !== id);
    saveAssets();
    renderAssets();
    populateSellAssetDropdown();
    updateDashboard();
}

/**
 * Cancel asset editing
 */
function cancelAssetEdit() {
    resetAssetForm();
}

/**
 * Reset asset form to initial state
 */
function resetAssetForm() {
    editingAssetId = null;
    document.getElementById('assetForm').reset();
    document.getElementById('assetFormTitle').textContent = 'Add New Asset';
    document.getElementById('assetSubmitBtn').textContent = 'Add Asset';
    document.getElementById('assetCancelBtn').style.display = 'none';
}

// Old asset management functions removed - using simplified transaction-based approach

// ============================================================================
// Add Asset Management (Simplified)
// ============================================================================

let editingAssetPurchaseId = null;

// Initialize price lookup maps on load
// highPriceMap: Used for BUY transactions
// lowPriceMap: Used for SELL transactions
let historicalBTCHighPriceMap = null;
let historicalBTCLowPriceMap = null;

/**
 * Load and parse CSV file with Bitcoin price data
 * CSV format: Start,End,Open,High,Low,Close,Volume,Market Cap
 * Uses Start date as the key, High for BUY, Low for SELL
 */
async function loadBTCPriceDataFromCSV() {
    try {
        const response = await fetch('bitcoin_2025-11-17_2025-12-17.csv');
        if (!response.ok) {
            console.error('Failed to load BTC price CSV file');
            return { highMap: new Map(), lowMap: new Map() };
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        const highMap = new Map();
        const lowMap = new Map();
        
        // Skip header row (index 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV line (comma-separated)
            const parts = line.split(',');
            if (parts.length < 6) continue; // Need at least Start, End, Open, High, Low, Close
            
            // Start date is in YYYY-MM-DD format (column 0)
            const startDate = parts[0].trim();
            
            // High price (column 3) - used for BUY
            const high = parseFloat(parts[3].trim());
            
            // Low price (column 4) - used for SELL
            const low = parseFloat(parts[4].trim());
            
            if (!isNaN(high) && high > 0) {
                highMap.set(startDate, high);
            }
            
            if (!isNaN(low) && low > 0) {
                lowMap.set(startDate, low);
            }
        }
        
        return { highMap, lowMap };
    } catch (error) {
        console.error('Error loading BTC price CSV:', error);
        return { highMap: new Map(), lowMap: new Map() };
    }
}

/**
 * Initialize historical BTC price lookup maps
 */
async function initHistoricalBTCPriceMap() {
    if (!historicalBTCHighPriceMap || !historicalBTCLowPriceMap) {
        const { highMap, lowMap } = await loadBTCPriceDataFromCSV();
        historicalBTCHighPriceMap = highMap;
        historicalBTCLowPriceMap = lowMap;
    }
}

/**
 * Handle Add Asset form submission
 * Allows multiple purchases of the same asset (especially for Runes/BRC-20)
 */
function handleAddAsset(event) {
    event.preventDefault();
    
    const assetType = document.getElementById('assetType').value;
    const assetDescription = document.getElementById('assetDescription').value.trim();
    const currency = document.getElementById('assetCurrency').value;
    const date = document.getElementById('assetDate').value;
    const cryptoAmount = parseFloat(document.getElementById('assetCryptoAmount').value);
    const cryptoPrice = parseFloat(document.getElementById('assetCryptoPrice').value);
    
    // Validate inputs
    if (!assetType) {
        alert('Please select an asset type');
        document.getElementById('assetType').focus();
        return;
    }
    if (!assetDescription) {
        alert('Please enter an asset description');
        document.getElementById('assetDescription').focus();
        return;
    }
    if (!currency) {
        alert('Please select a currency');
        document.getElementById('assetCurrency').focus();
        return;
    }
    if (isNaN(cryptoAmount) || cryptoAmount <= 0) {
        alert(`Please enter a valid ${currency} amount`);
        document.getElementById('assetCryptoAmount').focus();
        return;
    }
    const priceDenomination = document.getElementById('assetPriceDenomination')?.value || 'USD';
    
    // Warn if cross-currency pricing is used but conversion price is not set
    if (currency === 'ETH' && priceDenomination === 'BTC' && btcPriceToday <= 0) {
        if (!confirm('BTC price is not set in the dashboard. ETH/BTC prices cannot be converted to USD without a BTC price. Do you want to continue?')) {
            return;
        }
    }
    if (currency === 'BTC' && priceDenomination === 'ETH' && ethPriceToday <= 0) {
        if (!confirm('ETH price is not set in the dashboard. BTC/ETH prices cannot be converted to USD without an ETH price. Do you want to continue?')) {
            return;
        }
    }
    
    if (isNaN(cryptoPrice) || cryptoPrice <= 0) {
        let priceLabel = '';
        if (priceDenomination === 'USD') {
            priceLabel = `${currency}/USD`;
        } else if (priceDenomination === 'BTC') {
            priceLabel = `${currency}/BTC`;
        } else if (priceDenomination === 'ETH') {
            priceLabel = `${currency}/ETH`;
        }
        alert(`Please enter a valid ${priceLabel} price`);
        document.getElementById('assetCryptoPrice').focus();
        return;
    }
    
    // Calculate USD value using price denomination
    const priceInUSD = calculatePriceInUSD(cryptoPrice, currency, priceDenomination);
    const usdValue = cryptoAmount * priceInUSD;
    
    // Create asset purchase transaction
    // For Runes and BRC-20, same description + type can have multiple entries
    const transactionData = {
        type: 'BUY',
        assetType: assetType,
        assetDescription: assetDescription,
        currency: currency,
        priceDenomination: priceDenomination,
        date: date,
        cryptoAmount: cryptoAmount,
        cryptoPrice: cryptoPrice,
        usdValue: usdValue
    };
    
    if (editingAssetPurchaseId !== null) {
        // Update existing transaction
        const index = transactions.findIndex(t => t.id === editingAssetPurchaseId);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], ...transactionData };
            saveTransactions();
            renderTransactions();
            renderAssetSummary();
            populateSaleAssetDropdown(); // Update sale dropdown
            resetAddAssetForm();
        }
    } else {
        // Create new transaction
        const newTransaction = {
            id: Date.now().toString(),
            ...transactionData,
            createdAt: new Date().toISOString()
        };
        transactions.push(newTransaction);
        saveTransactions();
        renderTransactions();
        renderAssetSummary();
        populateSaleAssetDropdown(); // Update sale dropdown
        resetAddAssetForm();
    }
    
    // Clear sale editing state
    editingSaleId = null;
    
    updateDashboard();
}

// ============================================================================
// Sale Management
// ============================================================================

let editingSaleId = null;

/**
 * Handle Record Sale form submission
 */
function handleRecordSale(event) {
    event.preventDefault();
    
    const assetType = document.getElementById('saleAssetType').value;
    const assetDescription = document.getElementById('saleAssetDescription').value.trim();
    const currency = document.getElementById('saleCurrency').value;
    const date = document.getElementById('saleDate').value;
    const cryptoAmount = parseFloat(document.getElementById('saleCryptoAmount').value);
    const cryptoPrice = parseFloat(document.getElementById('saleCryptoPrice').value);
    
    // Validate inputs
    if (!assetType) {
        alert('Please select an asset type');
        document.getElementById('saleAssetType').focus();
        return;
    }
    if (!assetDescription) {
        alert('Please enter an asset description');
        document.getElementById('saleAssetDescription').focus();
        return;
    }
    if (!currency) {
        alert('Please select a currency');
        document.getElementById('saleCurrency').focus();
        return;
    }
    if (isNaN(cryptoAmount) || cryptoAmount < 0) {
        alert(`Please enter a valid ${currency} amount (zero is allowed)`);
        document.getElementById('saleCryptoAmount').focus();
        return;
    }
    const priceDenomination = document.getElementById('salePriceDenomination')?.value || 'USD';
    
    // Warn if cross-currency pricing is used but conversion price is not set
    if (currency === 'ETH' && priceDenomination === 'BTC' && btcPriceToday <= 0) {
        if (!confirm('BTC price is not set in the dashboard. ETH/BTC prices cannot be converted to USD without a BTC price. Do you want to continue?')) {
            return;
        }
    }
    if (currency === 'BTC' && priceDenomination === 'ETH' && ethPriceToday <= 0) {
        if (!confirm('ETH price is not set in the dashboard. BTC/ETH prices cannot be converted to USD without an ETH price. Do you want to continue?')) {
            return;
        }
    }
    
    if (isNaN(cryptoPrice) || cryptoPrice < 0) {
        let priceLabel = '';
        if (priceDenomination === 'USD') {
            priceLabel = `${currency}/USD`;
        } else if (priceDenomination === 'BTC') {
            priceLabel = `${currency}/BTC`;
        } else if (priceDenomination === 'ETH') {
            priceLabel = `${currency}/ETH`;
        }
        alert(`Please enter a valid ${priceLabel} price (zero is allowed)`);
        document.getElementById('saleCryptoPrice').focus();
        return;
    }
    
    // Calculate USD value using price denomination
    const priceInUSD = calculatePriceInUSD(cryptoPrice, currency, priceDenomination);
    const usdValue = cryptoAmount * priceInUSD;
    
    // Create sale transaction
    const transactionData = {
        type: 'SELL',
        assetType: assetType,
        assetDescription: assetDescription,
        currency: currency,
        priceDenomination: priceDenomination,
        date: date,
        cryptoAmount: cryptoAmount,
        cryptoPrice: cryptoPrice,
        usdValue: usdValue
    };
    
    if (editingSaleId !== null) {
        // Update existing transaction
        const index = transactions.findIndex(t => t.id === editingSaleId);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], ...transactionData };
            saveTransactions();
            renderTransactions();
            renderAssetSummary();
            populateSaleAssetDropdown(); // Update sale dropdown
            resetRecordSaleForm();
        }
    } else {
        // Create new transaction
        const newTransaction = {
            id: Date.now().toString(),
            ...transactionData,
            createdAt: new Date().toISOString()
        };
        transactions.push(newTransaction);
        saveTransactions();
        renderTransactions();
        renderAssetSummary();
        populateSaleAssetDropdown(); // Update sale dropdown
        resetRecordSaleForm();
    }
    
    // Clear purchase editing state
    editingAssetPurchaseId = null;
    
    updateDashboard();
}

/**
 * Edit a transaction (BUY or SELL)
 */
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    if (transaction.type === 'BUY') {
        // Edit as purchase
        editingAssetPurchaseId = id;
        editingSaleId = null;
        document.getElementById('assetType').value = transaction.assetType;
        document.getElementById('assetDescription').value = transaction.assetDescription;
        document.getElementById('assetDate').value = transaction.date;
        
        // Handle both old format (btcAmount/btcPrice) and new format (cryptoAmount/cryptoPrice/currency)
        const currency = transaction.currency || 'BTC';
        const cryptoAmount = transaction.cryptoAmount || transaction.btcAmount || 0;
        const cryptoPrice = transaction.cryptoPrice || transaction.btcPrice || 0;
        const priceDenomination = transaction.priceDenomination || 'USD';
        
        document.getElementById('assetCurrency').value = currency;
        document.getElementById('assetCryptoAmount').value = cryptoAmount;
        document.getElementById('assetCryptoPrice').value = cryptoPrice;
        if (document.getElementById('assetPriceDenomination')) {
            document.getElementById('assetPriceDenomination').value = priceDenomination;
        }
        updateCurrencyLabels('purchase');
        
        calculateAssetUSD();
        
        document.getElementById('addAssetFormTitle').textContent = 'Edit Asset Purchase';
        document.getElementById('addAssetSubmitBtn').textContent = 'Update Purchase';
        document.getElementById('addAssetCancelBtn').style.display = 'inline-block';
        
        document.querySelector('.add-asset-section').scrollIntoView({ behavior: 'smooth' });
    } else if (transaction.type === 'SELL') {
        // Edit as sale
        editingSaleId = id;
        editingAssetPurchaseId = null;
        
        // Populate dropdown first
        populateSaleAssetDropdown();
        
        // Try to set the dropdown to the asset being edited
        const assetKey = `${transaction.assetType}|${transaction.assetDescription}`;
        const dropdown = document.getElementById('saleAssetSelect');
        if (dropdown) {
            // Check if this asset exists in the dropdown
            const optionExists = Array.from(dropdown.options).some(opt => opt.value === assetKey);
            if (optionExists) {
                dropdown.value = assetKey;
            } else {
                dropdown.value = ''; // Clear if asset not found (shouldn't happen, but safe)
            }
        }
        
        // Handle both old format (btcAmount/btcPrice) and new format (cryptoAmount/cryptoPrice/currency)
        const currency = transaction.currency || 'BTC';
        const cryptoAmount = transaction.cryptoAmount || transaction.btcAmount || 0;
        const cryptoPrice = transaction.cryptoPrice || transaction.btcPrice || 0;
        const priceDenomination = transaction.priceDenomination || 'USD';
        
        document.getElementById('saleAssetType').value = transaction.assetType;
        document.getElementById('saleAssetDescription').value = transaction.assetDescription;
        document.getElementById('saleDate').value = transaction.date;
        document.getElementById('saleCurrency').value = currency;
        document.getElementById('saleCryptoAmount').value = cryptoAmount;
        document.getElementById('saleCryptoPrice').value = cryptoPrice;
        if (document.getElementById('salePriceDenomination')) {
            document.getElementById('salePriceDenomination').value = priceDenomination;
        }
        updateCurrencyLabels('sale');
        
        calculateSaleUSD();
        
        document.getElementById('recordSaleFormTitle').textContent = 'Edit Sale';
        document.getElementById('recordSaleSubmitBtn').textContent = 'Update Sale';
        document.getElementById('recordSaleCancelBtn').style.display = 'inline-block';
        
        document.querySelector('.record-sale-section').scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Delete a transaction
 */
function deleteTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    const transactionType = transaction?.type === 'SELL' ? 'sale' : 'purchase';
    
    if (!confirm(`Are you sure you want to delete this ${transactionType}?`)) {
        return;
    }
    
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    renderTransactions();
    renderAssetSummary();
    populateSaleAssetDropdown(); // Update sale dropdown
    updateDashboard();
}

/**
 * Reset Add Asset form to initial state
 */
function resetAddAssetForm() {
    editingAssetPurchaseId = null;
    editingSaleId = null; // Clear sale editing state
    document.getElementById('addAssetForm').reset();
    setAssetDefaultDate();
    updateCurrencyLabels('purchase'); // Update labels after reset
    calculateAssetUSD();
    document.getElementById('addAssetFormTitle').textContent = 'Add Asset Purchase';
    document.getElementById('addAssetSubmitBtn').textContent = 'Add Asset';
    document.getElementById('addAssetCancelBtn').style.display = 'none';
}

/**
 * Cancel asset editing
 */
function cancelAssetEdit() {
    resetAddAssetForm();
}

/**
 * Set default date to today for Add Asset form
 */
function setAssetDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('assetDate').value = today;
}


/**
 * Auto-fill BTC/USD price for sale based on selected date
 */
async function autoFillSaleCryptoPrice() {
    const dateInput = document.getElementById('saleDate');
    const priceInput = document.getElementById('saleCryptoPrice');
    const currencySelect = document.getElementById('saleCurrency');
    const selectedDate = dateInput.value;
    const currency = currencySelect?.value || 'BTC';
    
    if (!selectedDate) return;
    
    const today = new Date().toISOString().split('T')[0];
    const currencyLabel = currency === 'BTC' ? 'BTC' : 'ETH';
    
    // If date is today and we have a price set, use it
    if (selectedDate === today) {
        const currentPrice = currency === 'BTC' ? btcPriceToday : ethPriceToday;
        if (currentPrice > 0) {
            priceInput.value = currentPrice;
            calculateSaleUSD();
            return;
        }
    }
    
    // Check if date is in the future
    if (selectedDate > today) {
        priceInput.value = '';
        priceInput.placeholder = 'Future date - enter price manually';
        calculateSaleUSD();
        return;
    }
    
    // Show loading state
    const originalPlaceholder = priceInput.placeholder;
    priceInput.value = '';
    priceInput.placeholder = `Looking up ${currencyLabel} price...`;
    priceInput.disabled = true;
    
    try {
        // Fetch historical price from local data (use LOW for SELL)
        const cryptoPrice = await fetchHistoricalCryptoPrice(selectedDate, 'SELL', currency);
        
        if (cryptoPrice && cryptoPrice > 0) {
            priceInput.value = cryptoPrice.toFixed(2);
            priceInput.placeholder = originalPlaceholder;
            // Recalculate USD if crypto amount is already entered
            const cryptoAmount = parseFloat(document.getElementById('saleCryptoAmount').value) || 0;
            if (cryptoAmount > 0) {
                const usdValue = cryptoAmount * cryptoPrice;
                updateSaleUSDDisplay(usdValue, cryptoAmount, cryptoPrice);
            }
        } else {
            priceInput.placeholder = 'Price not available - enter manually';
            const cryptoAmount = parseFloat(document.getElementById('saleCryptoAmount').value) || 0;
            if (cryptoAmount > 0) {
                updateSaleUSDDisplay(0, cryptoAmount, 0);
            }
        }
    } catch (error) {
        console.error(`Error fetching ${currencyLabel} price:`, error);
        priceInput.placeholder = 'Error fetching price - enter manually';
    } finally {
        priceInput.disabled = false;
    }
}

/**
 * Calculate and display USD value for Record Sale form in real-time
 */
function calculateSaleUSD() {
    const cryptoAmount = parseFloat(document.getElementById('saleCryptoAmount').value) || 0;
    const cryptoPrice = parseFloat(document.getElementById('saleCryptoPrice').value) || 0;
    const date = document.getElementById('saleDate').value;
    const currency = document.getElementById('saleCurrency').value;
    const priceDenomination = document.getElementById('salePriceDenomination')?.value || 'USD';
    
    // If crypto amount is entered but price is missing and date is set, fetch price
    // Only auto-fetch if denomination is USD (BTC prices need manual entry)
    if (cryptoAmount > 0 && (!cryptoPrice || cryptoPrice === 0) && date && priceDenomination === 'USD') {
        const priceInput = document.getElementById('saleCryptoPrice');
        if (!priceInput.disabled) {
            autoFillSaleCryptoPrice().then(() => {
                const newCryptoPrice = parseFloat(document.getElementById('saleCryptoPrice').value) || 0;
                const finalPrice = calculatePriceInUSD(newCryptoPrice, currency, priceDenomination);
                const usdValue = cryptoAmount * finalPrice;
                updateSaleUSDDisplay(usdValue, cryptoAmount, cryptoPrice);
            });
            return;
        }
    }
    
    // Calculate USD value based on price denomination
    const priceInUSD = calculatePriceInUSD(cryptoPrice, currency, priceDenomination);
    const usdValue = cryptoAmount * priceInUSD;
    updateSaleUSDDisplay(usdValue, cryptoAmount, cryptoPrice);
}

/**
 * Update the USD value display for sale form
 */
function updateSaleUSDDisplay(usdValue, btcAmount, btcPrice) {
    const displayElement = document.getElementById('calculatedSaleUSDValue');
    if (btcAmount > 0 && btcPrice > 0) {
        displayElement.textContent = `$${formatNumber(usdValue)}`;
        displayElement.style.color = 'var(--accent)';
    } else {
        displayElement.textContent = '$0.00';
        displayElement.style.color = 'var(--text-secondary)';
    }
}

/**
 * Reset Record Sale form to initial state
 */
function resetRecordSaleForm() {
    editingSaleId = null;
    editingAssetPurchaseId = null; // Clear purchase editing state
    document.getElementById('recordSaleForm').reset();
    populateSaleAssetDropdown(); // Refresh dropdown
    setSaleDefaultDate();
    updateCurrencyLabels('sale'); // Update labels after reset
    calculateSaleUSD();
    document.getElementById('recordSaleFormTitle').textContent = 'Record Asset Sale';
    document.getElementById('recordSaleSubmitBtn').textContent = 'Record Sale';
    document.getElementById('recordSaleCancelBtn').style.display = 'none';
}

/**
 * Cancel sale editing
 */
function cancelSaleEdit() {
    resetRecordSaleForm();
}

/**
 * Set default date to today for Record Sale form
 */
function setSaleDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('saleDate').value = today;
}

/**
 * Populate the sale asset dropdown with purchased assets
 */
function populateSaleAssetDropdown() {
    const dropdown = document.getElementById('saleAssetSelect');
    if (!dropdown) return;
    
    // Get unique assets from BUY transactions
    const assetMap = new Map();
    
    transactions.forEach(transaction => {
        if (transaction.type === 'BUY') {
            const key = `${transaction.assetType}|${transaction.assetDescription}`;
            if (!assetMap.has(key)) {
                assetMap.set(key, {
                    type: transaction.assetType,
                    description: transaction.assetDescription
                });
            }
        }
    });
    
    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">-- Select an asset to sell --</option>';
    
    // Sort assets by description for easier finding
    const sortedAssets = Array.from(assetMap.values()).sort((a, b) => {
        if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
        }
        return a.description.localeCompare(b.description);
    });
    
    // Add options grouped by type
    let currentType = '';
    sortedAssets.forEach(asset => {
        if (asset.type !== currentType) {
            // Add an optgroup or separator
            const option = document.createElement('option');
            option.value = '';
            option.disabled = true;
            option.textContent = `--- ${asset.type} ---`;
            dropdown.appendChild(option);
            currentType = asset.type;
        }
        
        const option = document.createElement('option');
        option.value = `${asset.type}|${asset.description}`;
        option.textContent = `${asset.description} (${asset.type})`;
        dropdown.appendChild(option);
    });
}

/**
 * Populate sale asset fields when an asset is selected from dropdown
 */
function populateSaleAssetFields() {
    const dropdown = document.getElementById('saleAssetSelect');
    const selectedValue = dropdown.value;
    
    if (!selectedValue) {
        // Clear fields if "Select an asset" is chosen
        return;
    }
    
    // Parse the value (format: "Type|Description")
    const [assetType, assetDescription] = selectedValue.split('|');
    
    // Auto-fill the type and description fields
    document.getElementById('saleAssetType').value = assetType;
    document.getElementById('saleAssetDescription').value = assetDescription;
}

/**
 * Auto-fill BTC/USD price based on selected date
 * Looks up historical price from local data if date is in the past
 */
async function autoFillCryptoPrice() {
    const dateInput = document.getElementById('assetDate');
    const priceInput = document.getElementById('assetCryptoPrice');
    const currencySelect = document.getElementById('assetCurrency');
    const selectedDate = dateInput.value;
    const currency = currencySelect?.value || 'BTC';
    
    if (!selectedDate) return;
    
    const today = new Date().toISOString().split('T')[0];
    const currencyLabel = currency === 'BTC' ? 'BTC' : 'ETH';
    
    // If date is today and we have a price set, use it
    if (selectedDate === today) {
        const currentPrice = currency === 'BTC' ? btcPriceToday : ethPriceToday;
        if (currentPrice > 0) {
            priceInput.value = currentPrice;
            calculateAssetUSD();
            return;
        }
    }
    
    // Check if date is in the future
    if (selectedDate > today) {
        priceInput.value = '';
        priceInput.placeholder = 'Future date - enter price manually';
        calculateAssetUSD();
        return;
    }
    
    // Show loading state
    const originalPlaceholder = priceInput.placeholder;
    priceInput.value = '';
    priceInput.placeholder = `Looking up ${currencyLabel} price...`;
    priceInput.disabled = true;
    
    try {
        // Fetch historical price from local data (use HIGH for BUY)
        const cryptoPrice = await fetchHistoricalCryptoPrice(selectedDate, 'BUY', currency);
        
        if (cryptoPrice && cryptoPrice > 0) {
            priceInput.value = cryptoPrice.toFixed(2);
            priceInput.placeholder = originalPlaceholder;
            // Recalculate USD if crypto amount is already entered
            const cryptoAmount = parseFloat(document.getElementById('assetCryptoAmount').value) || 0;
            if (cryptoAmount > 0) {
                const usdValue = cryptoAmount * cryptoPrice;
                updateUSDDisplay(usdValue, cryptoAmount, cryptoPrice);
            }
        } else {
            priceInput.placeholder = 'Price not available - enter manually';
            const cryptoAmount = parseFloat(document.getElementById('assetCryptoAmount').value) || 0;
            if (cryptoAmount > 0) {
                updateUSDDisplay(0, cryptoAmount, 0);
            }
        }
    } catch (error) {
        console.error(`Error fetching ${currencyLabel} price:`, error);
        priceInput.placeholder = 'Error fetching price - enter manually';
    } finally {
        priceInput.disabled = false;
    }
}

/**
 * Fetch historical BTC price from local data
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} transactionType - 'BUY' uses HIGH price, 'SELL' uses LOW price
 * @returns {Promise<number>} BTC price in USD
 */
async function fetchHistoricalBTCPrice(date, transactionType = 'BUY') {
    // Initialize maps if not already done
    await initHistoricalBTCPriceMap();
    
    // Use HIGH price for BUY, LOW price for SELL
    const priceMap = transactionType === 'BUY' ? historicalBTCHighPriceMap : historicalBTCLowPriceMap;
    
    if (!priceMap) {
        return null;
    }
    
    // Lookup price in the appropriate map
    const price = priceMap.get(date);
    
    if (price && price > 0) {
        return price;
    }
    
    // Price not found in dataset
    return null;
}

/**
 * Fetch historical crypto price (BTC or ETH) from local data
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} transactionType - 'BUY' uses HIGH price, 'SELL' uses LOW price
 * @param {string} currency - 'BTC' or 'ETH'
 * @returns {Promise<number>} Crypto price in USD
 */
async function fetchHistoricalCryptoPrice(date, transactionType = 'BUY', currency = 'BTC') {
    if (currency === 'BTC') {
        return await fetchHistoricalBTCPrice(date, transactionType);
    } else if (currency === 'ETH') {
        // TODO: Add ETH price data loading when CSV is available
        // For now, return null - user will need to enter manually
        return null;
    }
    return null;
}

/**
 * Calculate and display USD value for Add Asset form in real-time
 * Also triggers price fetch if date is set but price isn't
 */
function calculateAssetUSD() {
    const cryptoAmount = parseFloat(document.getElementById('assetCryptoAmount').value) || 0;
    const cryptoPrice = parseFloat(document.getElementById('assetCryptoPrice').value) || 0;
    const date = document.getElementById('assetDate').value;
    const currency = document.getElementById('assetCurrency').value;
    const priceDenomination = document.getElementById('assetPriceDenomination')?.value || 'USD';
    
    // If crypto amount is entered but price is missing and date is set, fetch price
    // Only auto-fetch if denomination is USD (BTC prices need manual entry)
    if (cryptoAmount > 0 && (!cryptoPrice || cryptoPrice === 0) && date && priceDenomination === 'USD') {
        // Trigger price fetch if not already fetching
        const priceInput = document.getElementById('assetCryptoPrice');
        if (!priceInput.disabled) {
            autoFillCryptoPrice().then(() => {
                // Recalculate after price is fetched
                const newCryptoPrice = parseFloat(document.getElementById('assetCryptoPrice').value) || 0;
                const finalPrice = calculatePriceInUSD(newCryptoPrice, currency, priceDenomination);
                const usdValue = cryptoAmount * finalPrice;
                updateUSDDisplay(usdValue, cryptoAmount, cryptoPrice);
            });
            return;
        }
    }
    
    // Calculate USD value based on price denomination
    const priceInUSD = calculatePriceInUSD(cryptoPrice, currency, priceDenomination);
    const usdValue = cryptoAmount * priceInUSD;
    updateUSDDisplay(usdValue, cryptoAmount, cryptoPrice);
}

/**
 * Convert price to USD based on currency and denomination
 * @param {number} price - The price value
 * @param {string} currency - 'BTC' or 'ETH'
 * @param {string} denomination - 'USD' or 'BTC'
 * @returns {number} Price in USD
 */
function calculatePriceInUSD(price, currency, denomination) {
    if (denomination === 'USD') {
        // Price is already in USD
        return price;
    } else if (denomination === 'BTC' && currency === 'ETH') {
        // ETH/BTC price - convert to USD using current BTC price
        if (btcPriceToday > 0) {
            return price * btcPriceToday;
        } else {
            // BTC price not set, can't convert
            return 0;
        }
    } else if (denomination === 'ETH' && currency === 'BTC') {
        // BTC/ETH price - convert to USD using current ETH price
        if (ethPriceToday > 0) {
            return price * ethPriceToday;
        } else {
            // ETH price not set, can't convert
            return 0;
        }
    }
    return price; // Fallback
}

/**
 * Update the USD value display
 */
function updateUSDDisplay(usdValue, btcAmount, btcPrice) {
    const displayElement = document.getElementById('calculatedAssetUSDValue');
    if (btcAmount > 0 && btcPrice > 0) {
        displayElement.textContent = `$${formatNumber(usdValue)}`;
        displayElement.style.color = 'var(--accent)';
    } else {
        displayElement.textContent = '$0.00';
        displayElement.style.color = 'var(--text-secondary)';
    }
}

/**
 * Render asset summary showing total cost basis per asset
 */
function renderAssetSummary() {
    // Group transactions by asset (type + description)
    const assetGroups = {};
    
    transactions.forEach(transaction => {
        if (transaction.type === 'BUY') {
            const key = `${transaction.assetType}|${transaction.assetDescription}`;
            if (!assetGroups[key]) {
                assetGroups[key] = {
                    type: transaction.assetType,
                    description: transaction.assetDescription,
                    totalBTC: 0,
                    totalUSD: 0,
                    purchaseCount: 0
                };
            }
            assetGroups[key].totalBTC += transaction.btcAmount || 0;
            assetGroups[key].totalUSD += transaction.usdValue || 0;
            assetGroups[key].purchaseCount += 1;
        }
    });
    
    // Update or create asset summary section
    let summarySection = document.getElementById('assetSummarySection');
    if (!summarySection) {
        summarySection = document.createElement('section');
        summarySection.id = 'assetSummarySection';
        summarySection.className = 'asset-summary-section';
        summarySection.innerHTML = '<h2>Asset Summary (Total Cost Basis)</h2><div class="table-container"><table id="assetSummaryTable"><thead><tr><th>Type</th><th>Description</th><th>Purchases</th><th>Total BTC</th><th>Total Cost Basis (USD)</th></tr></thead><tbody id="assetSummaryTableBody"></tbody></table></div>';
        // Insert after Add Asset section
        const addAssetSection = document.querySelector('.add-asset-section');
        addAssetSection.insertAdjacentElement('afterend', summarySection);
    }
    
    const tbody = document.getElementById('assetSummaryTableBody');
    const assetKeys = Object.keys(assetGroups);
    
    if (assetKeys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No assets yet. Add your first asset above.</td></tr>';
        return;
    }
    
    // Sort by description
    assetKeys.sort((a, b) => assetGroups[a].description.localeCompare(assetGroups[b].description));
    
    tbody.innerHTML = assetKeys.map(key => {
        const asset = assetGroups[key];
        return `
            <tr>
                <td>${escapeHtml(asset.type)}</td>
                <td><strong>${escapeHtml(asset.description)}</strong></td>
                <td>${asset.purchaseCount}</td>
                <td>${formatBTC(asset.totalBTC)}</td>
                <td><strong>$${formatNumber(asset.totalUSD)}</strong></td>
            </tr>
        `;
    }).join('');
}

/**
 * Render transactions table
 */
function renderTransactions() {
    const tbody = document.getElementById('transactionsTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No transactions yet. Add your first asset purchase or sale above.</td></tr>';
        return;
    }
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    tbody.innerHTML = sortedTransactions.map(transaction => {
        const transactionType = transaction.type || 'BUY';
        const assetType = transaction.assetType || 'Unknown';
        const assetDescription = transaction.assetDescription || 'Unknown';
        const formattedDate = formatDate(transaction.date);
        const typeClass = transactionType === 'BUY' ? 'text-success' : 'text-danger';
        const typeLabel = transactionType === 'BUY' ? 'BUY' : 'SELL';
        
        // Handle both old format (btcAmount/btcPrice) and new format (cryptoAmount/cryptoPrice/currency)
        const currency = transaction.currency || 'BTC';
        const cryptoAmount = transaction.cryptoAmount || transaction.btcAmount || 0;
        const cryptoPrice = transaction.cryptoPrice || transaction.btcPrice || 0;
        const priceDenomination = transaction.priceDenomination || 'USD';
        
        // Format price display based on denomination
        let priceDisplay = '';
        if (priceDenomination === 'BTC' && currency === 'ETH') {
            priceDisplay = `${formatBTC(cryptoPrice)} BTC`;
        } else if (priceDenomination === 'ETH' && currency === 'BTC') {
            priceDisplay = `${formatBTC(cryptoPrice)} ETH`;
        } else {
            priceDisplay = `$${formatNumber(cryptoPrice)}`;
        }
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td><span class="${typeClass}"><strong>${typeLabel}</strong></span></td>
                <td><strong>${escapeHtml(currency)}</strong></td>
                <td>${escapeHtml(assetType)}</td>
                <td>${escapeHtml(assetDescription)}</td>
                <td>${formatBTC(cryptoAmount)}</td>
                <td>${priceDisplay}</td>
                <td>$${formatNumber(transaction.usdValue)}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editTransaction('${transaction.id}')" class="small secondary">Edit</button>
                        <button onclick="deleteTransaction('${transaction.id}')" class="small danger">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================================
// Dashboard Calculations
// ============================================================================

/**
 * Update BTC price and recalculate dashboard
 */
function updateBTCPrice() {
    const priceInput = document.getElementById('btcPriceToday');
    const price = parseFloat(priceInput.value);
    
    if (isNaN(price) || price <= 0) {
        alert('Please enter a valid BTC price');
        return;
    }
    
    btcPriceToday = price;
    localStorage.setItem(STORAGE_KEYS.BTC_PRICE, price.toString());
    updateBTCPriceDisplay();
    updateDashboard();
    
    // Auto-fill price in Add Asset form if date is today and currency is BTC
    const assetDate = document.getElementById('assetDate').value;
    const assetCurrency = document.getElementById('assetCurrency')?.value;
    if (assetDate && assetCurrency === 'BTC') {
        const today = new Date().toISOString().split('T')[0];
        if (assetDate === today) {
            document.getElementById('assetCryptoPrice').value = price;
            calculateAssetUSD();
        }
    }
}

/**
 * Update BTC price display
 */
function updateBTCPriceDisplay() {
    const display = document.getElementById('currentBTCPrice');
    if (btcPriceToday > 0) {
        display.textContent = `$${formatNumber(btcPriceToday)}`;
    } else {
        display.textContent = 'Not set';
    }
}

/**
 * Update ETH price and recalculate dashboard
 */
function updateETHPrice() {
    const priceInput = document.getElementById('ethPriceToday');
    const price = parseFloat(priceInput.value);
    
    if (isNaN(price) || price <= 0) {
        alert('Please enter a valid ETH price');
        return;
    }
    
    ethPriceToday = price;
    localStorage.setItem(STORAGE_KEYS.ETH_PRICE, price.toString());
    updateETHPriceDisplay();
    updateDashboard();
    
    // Auto-fill price in Add Asset form if date is today and currency is ETH
    const assetDate = document.getElementById('assetDate').value;
    const assetCurrency = document.getElementById('assetCurrency').value;
    if (assetDate && assetCurrency === 'ETH') {
        const today = new Date().toISOString().split('T')[0];
        if (assetDate === today) {
            document.getElementById('assetCryptoPrice').value = price;
            calculateAssetUSD();
        }
    }
}

/**
 * Update ETH price display
 */
function updateETHPriceDisplay() {
    const display = document.getElementById('currentETHPrice');
    if (ethPriceToday > 0) {
        display.textContent = `$${formatNumber(ethPriceToday)}`;
    } else {
        display.textContent = 'Not set';
    }
}

/**
 * Update currency labels dynamically based on selected currency
 */
function updateCurrencyLabels(formType) {
    const isPurchase = formType === 'purchase';
    const currencySelect = isPurchase ? document.getElementById('assetCurrency') : document.getElementById('saleCurrency');
    const currency = currencySelect.value;
    const currencyLabel = currency === 'BTC' ? 'BTC' : 'ETH';
    
    // Get price denomination selector (always visible now)
    const denominationGroup = isPurchase ? 
        document.getElementById('assetPriceDenominationGroup') : 
        document.getElementById('salePriceDenominationGroup');
    const denominationSelect = isPurchase ? 
        document.getElementById('assetPriceDenomination') : 
        document.getElementById('salePriceDenomination');
    
    // Get denomination option elements
    const ethOption = isPurchase ? 
        document.getElementById('assetPriceDenomETH') : 
        document.getElementById('salePriceDenomETH');
    const btcOption = isPurchase ? 
        document.getElementById('assetPriceDenomBTC') : 
        document.getElementById('salePriceDenomBTC');
    const denomNote = isPurchase ?
        document.getElementById('assetPriceDenomNote') :
        document.getElementById('salePriceDenomNote');
    
    // Always show denomination selector
    denominationGroup.style.display = 'block';
    
    // Show/hide options based on currency
    if (currency === 'BTC') {
        // BTC selected - show ETH option, hide BTC option
        ethOption.style.display = 'block';
        btcOption.style.display = 'none';
        // If BTC option is selected, reset to USD
        if (denominationSelect.value === 'BTC') {
            denominationSelect.value = 'USD';
        }
        denomNote.textContent = 'Choose whether price is in USD or ETH';
    } else {
        // ETH selected - show BTC option, hide ETH option
        ethOption.style.display = 'none';
        btcOption.style.display = 'block';
        // If ETH option is selected, reset to USD
        if (denominationSelect.value === 'ETH') {
            denominationSelect.value = 'USD';
        }
        denomNote.textContent = 'Choose whether price is in USD or BTC';
    }
    
    // Ensure denomination is set correctly - default to USD if not set or invalid
    let denomination = denominationSelect.value || 'USD';
    // If denomination doesn't match available options for this currency, reset to USD
    if (currency === 'BTC' && denomination === 'BTC') {
        denomination = 'USD';
        denominationSelect.value = 'USD';
    }
    if (currency === 'ETH' && denomination === 'ETH') {
        denomination = 'USD';
        denominationSelect.value = 'USD';
    }
    
    if (isPurchase) {
        const priceLabel = document.getElementById('assetCryptoPriceLabel');
        const priceNote = document.getElementById('assetPriceNote');
        const calcNote = document.getElementById('assetCalculationNote');
        const priceInput = document.getElementById('assetCryptoPrice');
        
        if (currency === 'BTC') {
            if (denomination === 'ETH') {
                priceLabel.textContent = `BTC/ETH Price (on purchase date) *`;
                const ethWarning = ethPriceToday > 0 ? '' : ' ⚠️ ETH price not set in dashboard - conversion will be $0';
                priceNote.textContent = `Enter price in ETH. Will be converted to USD using current ETH price.${ethWarning}`;
                calcNote.textContent = `Automatically calculated: BTC Amount × BTC/ETH Price × ETH/USD Price`;
                priceInput.placeholder = 'e.g., 15.5';
            } else {
                // USD denomination
                priceLabel.textContent = `BTC/USD Price (on purchase date) *`;
                priceNote.textContent = 'Price will automatically fetch from the internet based on the date you select';
                calcNote.textContent = `Automatically calculated: BTC Amount × BTC/USD Price`;
                priceInput.placeholder = 'e.g., 45000.00';
            }
        } else { // ETH currency
            if (denomination === 'BTC') {
                priceLabel.textContent = `ETH/BTC Price (on purchase date) *`;
                const btcWarning = btcPriceToday > 0 ? '' : ' ⚠️ BTC price not set in dashboard - conversion will be $0';
                priceNote.textContent = `Enter price in BTC. Will be converted to USD using current BTC price.${btcWarning}`;
                calcNote.textContent = `Automatically calculated: ETH Amount × ETH/BTC Price × BTC/USD Price`;
                priceInput.placeholder = 'e.g., 0.05';
            } else {
                // USD denomination
                priceLabel.textContent = `ETH/USD Price (on purchase date) *`;
                priceNote.textContent = 'Price will automatically fetch from the internet based on the date you select';
                calcNote.textContent = `Automatically calculated: ETH Amount × ETH/USD Price`;
                priceInput.placeholder = 'e.g., 3000.00';
            }
        }
    } else {
        const priceLabel = document.getElementById('saleCryptoPriceLabel');
        const priceNote = document.getElementById('salePriceNote');
        const calcNote = document.getElementById('saleCalculationNote');
        const priceInput = document.getElementById('saleCryptoPrice');
        
        if (currency === 'BTC') {
            if (denomination === 'ETH') {
                priceLabel.textContent = `BTC/ETH Price (on sale date) *`;
                const ethWarning = ethPriceToday > 0 ? '' : ' ⚠️ ETH price not set in dashboard - conversion will be $0';
                priceNote.textContent = `Enter price in ETH. Will be converted to USD using current ETH price.${ethWarning}`;
                calcNote.textContent = `Automatically calculated: BTC Amount × BTC/ETH Price × ETH/USD Price`;
                priceInput.placeholder = 'e.g., 15.5';
            } else {
                // USD denomination
                priceLabel.textContent = `BTC/USD Price (on sale date) *`;
                priceNote.textContent = 'Price will automatically fetch from the internet based on the date you select';
                calcNote.textContent = `Automatically calculated: BTC Amount × BTC/USD Price`;
                priceInput.placeholder = 'e.g., 45000.00';
            }
        } else { // ETH currency
            if (denomination === 'BTC') {
                priceLabel.textContent = `ETH/BTC Price (on sale date) *`;
                const btcWarning = btcPriceToday > 0 ? '' : ' ⚠️ BTC price not set in dashboard - conversion will be $0';
                priceNote.textContent = `Enter price in BTC. Will be converted to USD using current BTC price.${btcWarning}`;
                calcNote.textContent = `Automatically calculated: ETH Amount × ETH/BTC Price × BTC/USD Price`;
                priceInput.placeholder = 'e.g., 0.05';
            } else {
                // USD denomination
                priceLabel.textContent = `ETH/USD Price (on sale date) *`;
                priceNote.textContent = 'Price will automatically fetch from the internet based on the date you select';
                calcNote.textContent = `Automatically calculated: ETH Amount × ETH/USD Price`;
                priceInput.placeholder = 'e.g., 3000.00';
            }
        }
    }
}

/**
 * Calculate and update all dashboard metrics
 */
function updateDashboard() {
    // Calculate total cost basis (USD) from all BUY transactions
    const totalCostBasis = transactions
        .filter(t => t.type === 'BUY')
        .reduce((sum, t) => sum + (t.usdValue || 0), 0);
    
    // Calculate total proceeds (USD) from SELL transactions
    const totalProceeds = transactions
        .filter(t => t.type === 'SELL')
        .reduce((sum, t) => sum + (t.usdValue || 0), 0);
    
    // Calculate current portfolio value (USD)
    // Sum of all asset values converted to USD using current BTC price
    let portfolioValueBTC = 0;
    assets.forEach(asset => {
        portfolioValueBTC += (asset.valueBTC || 0);
    });
    const portfolioValue = portfolioValueBTC * (btcPriceToday || 0);
    
    // Calculate realized P/L
    // Simplified v1 approach: For realized P/L, we compare proceeds to a proportional cost basis
    // Without lot tracking, we estimate cost basis of sold assets proportionally
    // Note: This is a simplified calculation. For accurate tax reporting, implement FIFO/LIFO lot tracking
    let realizedPL = 0;
    if (totalCostBasis > 0 && totalProceeds > 0) {
        // Proportional cost basis: assume sold assets had proportional cost basis
        const totalBuyValue = transactions
            .filter(t => t.type === 'BUY')
            .reduce((sum, t) => sum + (t.usdValue || 0), 0);
        
        if (totalBuyValue > 0) {
            // Calculate proportional cost basis, but cap it at totalCostBasis
            // (can't have cost basis higher than what was actually paid)
            const proportionalCostBasis = Math.min(
                totalCostBasis * (totalProceeds / totalBuyValue),
                totalCostBasis
            );
            realizedPL = totalProceeds - proportionalCostBasis;
        } else {
            // No buy value recorded, assume full proceeds as gain
            realizedPL = totalProceeds;
        }
    } else if (totalProceeds > 0) {
        // If no cost basis recorded, realized P/L = proceeds (full gain)
        realizedPL = totalProceeds;
    } else {
        // No sales yet
        realizedPL = 0;
    }
    
    // Calculate unrealized P/L
    // Simplified approach: current portfolio value - remaining cost basis
    // Remaining cost basis = total cost basis - cost basis of sold assets (estimated proportionally)
    let remainingCostBasis = totalCostBasis;
    if (totalCostBasis > 0 && totalProceeds > 0) {
        const totalBuyValue = transactions
            .filter(t => t.type === 'BUY')
            .reduce((sum, t) => sum + (t.usdValue || 0), 0);
        if (totalBuyValue > 0) {
            // Calculate sold cost basis proportionally, capped at totalCostBasis
            const soldCostBasis = Math.min(
                totalCostBasis * (totalProceeds / totalBuyValue),
                totalCostBasis
            );
            remainingCostBasis = Math.max(0, totalCostBasis - soldCostBasis);
        }
    }
    const unrealizedPL = portfolioValue - remainingCostBasis;
    
    // Update dashboard displays
    document.getElementById('totalCostBasis').textContent = `$${formatNumber(totalCostBasis)}`;
    document.getElementById('totalProceeds').textContent = `$${formatNumber(totalProceeds)}`;
    document.getElementById('portfolioValue').textContent = `$${formatNumber(portfolioValue)}`;
    
    // Color code P/L values
    const realizedPLElement = document.getElementById('realizedPL');
    const unrealizedPLElement = document.getElementById('unrealizedPL');
    
    realizedPLElement.textContent = `$${formatNumber(realizedPL)}`;
    realizedPLElement.className = realizedPL >= 0 ? 'value text-success' : 'value text-danger';
    
    unrealizedPLElement.textContent = `$${formatNumber(unrealizedPL)}`;
    unrealizedPLElement.className = unrealizedPL >= 0 ? 'value text-success' : 'value text-danger';
    
    // Calculate Net Gain/Loss (Year): Total Proceeds - Total Cost Basis
    const netGainLoss = totalProceeds - totalCostBasis;
    const netGainLossElement = document.getElementById('netGainLoss');
    netGainLossElement.textContent = `$${formatNumber(netGainLoss)}`;
    netGainLossElement.className = netGainLoss >= 0 ? 'value text-success' : 'value text-danger';
    
    updateBTCPriceDisplay();
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Export all data to CSV format
 */
function exportToCSV() {
    if (assets.length === 0 && transactions.length === 0) {
        alert('No data to export');
        return;
    }
    
    let csvContent = '';
    
    // Export Assets
    csvContent += '=== ASSETS ===\n';
    csvContent += 'Type,Name/Ticker,Identifier,Quantity,Value (BTC),Created At\n';
    assets.forEach(asset => {
        csvContent += `"${asset.type}","${asset.name}","${asset.identifier || ''}",${asset.quantity},${asset.valueBTC},"${asset.createdAt}"\n`;
    });
    
    csvContent += '\n=== TRANSACTIONS ===\n';
    csvContent += 'Date,Type,Asset Type,Asset Description,BTC Amount,BTC/USD Price,USD Value,Notes\n';
    
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );
    
    sortedTransactions.forEach(transaction => {
        // Get asset details - prefer stored values, fallback to asset lookup
        const asset = assets.find(a => a.id === transaction.assetId);
        const assetType = transaction.assetType || (asset ? asset.type : 'Unknown');
        const assetDescription = transaction.assetDescription || (asset ? asset.name : 'Unknown');
        
        csvContent += `"${transaction.date}","${transaction.type}","${assetType}","${assetDescription}",${transaction.btcAmount},${transaction.btcPrice},${transaction.usdValue},"${(transaction.notes || '').replace(/"/g, '""')}"\n`;
    });
    
    csvContent += '\n=== SUMMARY ===\n';
    
    // Calculate summary metrics
    const totalCostBasis = transactions
        .filter(t => t.type === 'BUY')
        .reduce((sum, t) => sum + (t.usdValue || 0), 0);
    
    const totalProceeds = transactions
        .filter(t => t.type === 'SELL')
        .reduce((sum, t) => sum + (t.usdValue || 0), 0);
    
    let portfolioValueBTC = 0;
    assets.forEach(asset => {
        portfolioValueBTC += (asset.valueBTC || 0);
    });
    const portfolioValue = portfolioValueBTC * (btcPriceToday || 0);
    
    // Calculate realized and unrealized P/L (simplified approach, matching dashboard)
    let realizedPL = 0;
    if (totalCostBasis > 0 && totalProceeds > 0) {
        const totalBuyValue = transactions
            .filter(t => t.type === 'BUY')
            .reduce((sum, t) => sum + (t.usdValue || 0), 0);
        if (totalBuyValue > 0) {
            const proportionalCostBasis = Math.min(
                totalCostBasis * (totalProceeds / totalBuyValue),
                totalCostBasis
            );
            realizedPL = totalProceeds - proportionalCostBasis;
        } else {
            realizedPL = totalProceeds;
        }
    } else if (totalProceeds > 0) {
        realizedPL = totalProceeds;
    }
    
    let remainingCostBasis = totalCostBasis;
    if (totalCostBasis > 0 && totalProceeds > 0) {
        const totalBuyValue = transactions
            .filter(t => t.type === 'BUY')
            .reduce((sum, t) => sum + (t.usdValue || 0), 0);
        if (totalBuyValue > 0) {
            const soldCostBasis = Math.min(
                totalCostBasis * (totalProceeds / totalBuyValue),
                totalCostBasis
            );
            remainingCostBasis = Math.max(0, totalCostBasis - soldCostBasis);
        }
    }
    const unrealizedPL = portfolioValue - remainingCostBasis;
    
    csvContent += `Total Cost Basis (USD),${totalCostBasis}\n`;
    csvContent += `Total Proceeds (USD),${totalProceeds}\n`;
    csvContent += `Net Gain/Loss (Year) (USD),${totalProceeds - totalCostBasis}\n`;
    csvContent += `Current Portfolio Value (USD),${portfolioValue}\n`;
    csvContent += `Realized P/L (USD),${realizedPL}\n`;
    csvContent += `Unrealized P/L (USD),${unrealizedPL}\n`;
    csvContent += `BTC Price Used (USD),${btcPriceToday}\n`;
    csvContent += `Export Date,"${new Date().toISOString()}"\n`;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ordinals_tax_tracker_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format number with commas and 2 decimal places
 */
function formatNumber(num) {
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

/**
 * Format BTC amount with 8 decimal places
 */
function formatBTC(btc) {
    if (isNaN(btc)) return '0.00000000';
    return btc.toFixed(8);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
