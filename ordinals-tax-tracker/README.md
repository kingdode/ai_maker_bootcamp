# Bitcoin Ordinals Tax Tracker

A simple frontend-only web application for manually tracking Bitcoin Ordinals, Runes, and BRC-20 tokens for tax purposes. All data is stored locally in your browser using localStorage.

## Features

- **Asset Tracking**: Track Ordinals, Runes, BRC-20 tokens, and other assets
  - Asset type, name/ticker, identifier (inscription ID, rune ID, etc.)
  - Quantity and current value in BTC

- **Transaction Tracking**: Record BUY and SELL transactions
  - BTC amount paid or received
  - BTC/USD price at transaction date
  - Automatic USD value calculation
  - Date and notes fields

- **Dashboard Summary**: Real-time calculations
  - Total cost basis (USD)
  - Total proceeds (USD)
  - Current portfolio value (USD)
  - Realized and unrealized P/L

- **Data Management**: Full CRUD operations
  - Add, edit, and delete assets
  - Add, edit, and delete transactions
  - All data persists in browser localStorage

- **CSV Export**: Export all data for CPA or CoinLedger import
  - Includes assets, transactions, and summary metrics
  - Formatted for easy import into tax software

## Running Locally

### Prerequisites

- Python 3 (comes pre-installed on macOS and most Linux distributions)

### Steps

1. **Navigate to the project directory**:
   ```bash
   cd ordinals-tax-tracker
   ```

2. **Start a local HTTP server**:
   ```bash
   python3 -m http.server 8000
   ```

3. **Open your browser**:
   - Navigate to `http://localhost:8000`
   - The application will load and be ready to use

### Alternative: Using Node.js

If you have Node.js installed, you can also use:

```bash
npx http-server -p 8000
```

Or using PHP:

```bash
php -S localhost:8000
```

## Usage

### Setting Up

1. **Set BTC Price**: Enter the current BTC/USD price in the dashboard and click "Update". This is used to calculate your current portfolio value and unrealized P/L.

2. **Add Assets**: Use the "Add New Asset" form to track your holdings:
   - Select asset type (Ordinal, Rune, BRC-20, Other)
   - Enter name/ticker
   - Optionally add an identifier (inscription ID, rune ID, etc.)
   - Enter quantity and current value in BTC

3. **Record Transactions**: Use the "Add New Transaction" form:
   - Select transaction type (BUY or SELL)
   - Choose the asset
   - Enter date, BTC amount, and BTC/USD price at that time
   - Add optional notes
   - USD value is automatically calculated

### Managing Data

- **Edit**: Click the "Edit" button on any asset or transaction row
- **Delete**: Click the "Delete" button (you'll be asked to confirm)
- **Export**: Click "Export All Data to CSV" to download a CSV file with all your data

## Data Storage

All data is stored locally in your browser's localStorage. This means:
- ✅ No server required
- ✅ Data stays on your device
- ✅ Works offline
- ⚠️ Data is browser-specific (won't sync across browsers)
- ⚠️ Clearing browser data will delete your records

**Backup Recommendation**: Regularly export your data to CSV as a backup.

## CSV Export Format

The exported CSV includes three sections:

1. **ASSETS**: All tracked assets with their details
2. **TRANSACTIONS**: All transactions sorted by date
3. **SUMMARY**: Calculated metrics (cost basis, proceeds, P/L, etc.)

The CSV is formatted to be easily imported into tax software like CoinLedger or shared with your CPA.

## Future Enhancements

The codebase is structured to easily add:
- FIFO/LIFO tax lot tracking
- API integrations for automatic price fetching
- Multiple portfolio support
- Advanced reporting and charts
- Data import functionality

## Technical Details

- **No frameworks**: Pure HTML, CSS, and JavaScript
- **No build step**: Edit files directly and refresh browser
- **localStorage**: All data persisted client-side
- **Responsive**: Works on desktop and mobile devices
- **Dark mode**: Optimized for dark theme viewing

## Browser Compatibility

Works in all modern browsers that support:
- ES6 JavaScript features
- localStorage API
- CSS Grid and Flexbox

Tested on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

This is a personal tax tracking tool. Use at your own discretion. Always consult with a tax professional for tax-related decisions.
