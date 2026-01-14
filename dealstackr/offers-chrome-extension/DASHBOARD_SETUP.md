# Dealstackr Dashboard Setup

## Overview

The Dealstackr dashboard is now fully integrated into the Chrome extension. There is **no standalone website** - all functionality lives inside the extension.

## File Structure

```
offers-chrome-extension/
├── manifest.json          # Extension manifest (includes dashboard)
├── popup.html             # Lightweight popup UI
├── popup.js               # Popup logic (scan + open dashboard)
├── popup.css              # Popup styles
├── dashboard.html         # Full dashboard page
├── dashboard.js           # Dashboard logic (reads from chrome.storage.local)
├── dashboard.css          # Dashboard styles
├── contentScript.js       # Scans offers from Chase/Amex pages
├── background.js          # Background service worker
└── README.md              # Main documentation
```

## How It Works

### 1. Popup (Lightweight)
- **Location**: Extension icon popup
- **Purpose**: Quick actions
- **Features**:
  - "Scan Offers" button - scans current page
  - "Open Dashboard" button - opens full dashboard in new tab

### 2. Dashboard (Full Screen)
- **Location**: Opens in new Chrome tab via `chrome.tabs.create()`
- **Purpose**: View all scanned offers
- **Data Source**: Reads directly from `chrome.storage.local`
- **Features**:
  - Summary bar (total, Chase, Amex, last scan)
  - Sortable table (Merchant, Offer, Issuer, Card, Channel, Last Scanned)
  - Filters (Issuer, Card, Channel)
  - Sorting (Merchant, Offer Value, Issuer, Card, Last Scanned)
  - Highlights merchants available on multiple cards
  - Real-time updates (listens to storage changes)

## Data Flow

1. **User scans offers** → Content script extracts offers → Stored in `chrome.storage.local`
2. **User clicks "Open Dashboard"** → Opens `dashboard.html` in new tab
3. **Dashboard loads** → Reads from `chrome.storage.local` → Displays all offers
4. **User scans more offers** → Storage updates → Dashboard auto-refreshes

## Storage Format

The extension stores offers in `chrome.storage.local`:

```javascript
{
  dealCohorts: {
    "2026-01-07": [
      {
        merchant_name: "Nike",
        offer_value: "10% back",
        offer_type: "percent",
        issuer: "amex",
        card_type: "Amex Gold",
        channel: "online",
        scanned_at: "2026-01-07T18:32:00Z",
        cohort_date: "2026-01-07"
      },
      // ... more offers
    ]
  },
  allDeals: [...], // Legacy format (backward compatibility)
  currentCohort: "2026-01-07"
}
```

The dashboard merges all cohorts into a single list for display.

## Loading and Testing

1. **Load Extension**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `offers-chrome-extension` directory

2. **Test Scanning**:
   - Navigate to a Chase or Amex offers page
   - Click the extension icon
   - Click "Scan Offers"
   - Verify offers are scanned and stored

3. **Test Dashboard**:
   - Click the extension icon
   - Click "Open Dashboard"
   - Verify dashboard opens in new tab
   - Verify all scanned offers are displayed
   - Test sorting and filtering

## Key Features

- ✅ **No external dependencies** - Everything runs in Chrome extension context
- ✅ **Direct storage access** - Dashboard reads from `chrome.storage.local`
- ✅ **Real-time updates** - Dashboard refreshes when storage changes
- ✅ **Full-screen dashboard** - Opens in new tab for better viewing
- ✅ **Spreadsheet-like UI** - Clean table layout optimized for scanning
- ✅ **Client-side only** - No server, no external APIs

## Troubleshooting

**Dashboard shows "No Offers Found"**:
- Make sure you've scanned some offers using the popup
- Check browser console (F12) for errors
- Verify data exists in `chrome.storage.local` (use Chrome DevTools)

**Dashboard doesn't open**:
- Check that `dashboard.html` exists in extension directory
- Verify `manifest.json` includes `"tabs"` permission
- Check browser console for errors

**Offers not displaying**:
- Verify offers are stored in `chrome.storage.local`
- Check data format matches expected structure
- Look for console errors in dashboard tab

