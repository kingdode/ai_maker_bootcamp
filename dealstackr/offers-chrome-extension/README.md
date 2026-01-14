# Card Offers Scanner - Chrome Extension

A personal utility Chrome extension that allows you to manually scan visible credit card offers from Chase and American Express and display them in a clean, readable dashboard.

## Features

- **Read-only scanning**: Only extracts visible offers - no automation, no clicks required
- **Dual issuer support**: Works with both Chase and American Express Offers pages
- **Clean dashboard**: Sortable, filterable list view of all detected offers
- **Privacy-focused**: All processing happens locally in your browser - no backend, no analytics
- **Minimal permissions**: Only requires access to Chase and Amex domains

## Installation

### Load the Extension in Chrome

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or go to Menu → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `offers-chrome-extension` folder
   - The extension should now appear in your extensions list

4. **Pin the Extension (Optional)**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Card Offers Scanner" and click the pin icon

## Usage

1. **Navigate to Offers Page**
   - Log into your Chase or American Express account
   - Navigate to the Offers/Rewards page
   - Make sure offers are visible on the page

2. **Open Extension**
   - Click the extension icon in your Chrome toolbar
   - The popup will open

3. **Scan Offers**
   - Click the "Scan Offers" button
   - The extension will parse all visible offers on the current page
   - Results will appear in a table below

4. **Filter and Sort**
   - Use the filters to narrow down by issuer (Chase/Amex) or channel (Online/In-Store)
   - Use the sort dropdown to organize by merchant name, offer value, or issuer

## Supported Pages

The extension only works on:
- `*.chase.com` (Chase Offers pages)
- `*.americanexpress.com` (Amex Offers pages)

If you're not on a supported page, you'll see a message prompting you to navigate to an Offers page.

## Data Extracted

For each visible offer, the extension extracts:
- **Merchant Name**: The name of the merchant/brand
- **Offer Value**: The discount or cashback amount (e.g., "10%", "$20 back")
- **Offer Type**: Percentage or flat rate
- **Channel**: Online, In-Store, or Unknown
- **Issuer**: Chase or Amex

**Note**: The extension does NOT extract expiration dates, offer IDs, or terms & conditions. It only reads what is visible on the page without requiring any clicks.

## File Structure

```
offers-chrome-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── contentScript.js       # Script that runs on Chase/Amex pages
├── popup.html             # Popup UI structure
├── popup.js               # Popup logic and interactions
├── popup.css              # Popup styling
└── README.md              # This file
```

## Maintenance Notes

### Selectors May Need Updates

The extension uses CSS selectors to find offer cards on Chase and Amex pages. These selectors may need maintenance if the websites update their HTML structure.

**Current Selector Strategies:**

**Chase:**
- Primary: `[data-testid*="offer"]`, `[class*="offer-card"]`, `[class*="OfferCard"]`
- Fallback: Looks for elements containing percentage signs or "back" text

**Amex:**
- Primary: `[data-testid*="offer"]`, `[class*="offer-card"]`, `[class*="OfferCard"]`
- Fallback: Similar to Chase - looks for offer-like content

**If Offers Stop Being Detected:**

1. Open Chrome DevTools on a Chase or Amex Offers page
2. Inspect an offer card element
3. Note the class names, data attributes, or HTML structure
4. Update the selectors in `contentScript.js`:
   - `extractChaseOffers()` function for Chase
   - `extractAmexOffers()` function for Amex

**Common Selector Patterns to Try:**
- `[data-testid="offer-card"]`
- `[class*="Offer"]`
- `article[class*="offer"]`
- `div[role="article"]`

### Testing Selectors

To test if selectors are working:
1. Open Chrome DevTools Console on an Offers page
2. Run: `document.querySelectorAll('your-selector-here')`
3. Check if it returns offer elements

## Privacy & Security

- **No data collection**: All processing happens locally in your browser
- **No external calls**: No API calls, no backend, no analytics
- **No automation**: The extension never clicks, scrolls, or navigates automatically
- **Minimal permissions**: Only requests access to Chase and Amex domains

## Troubleshooting

**"Navigate to Chase or Amex Offers and click 'Scan Offers'"**
- Make sure you're on a Chase or Amex Offers page
- The URL should contain "offer" or "reward" in the path

**"No visible offers detected"**
- Scroll to make sure offers are visible on the page
- The extension only scans what's currently visible (no scrolling)
- Try refreshing the page and scanning again
- The selectors may need updating (see Maintenance Notes)

**Extension icon is grayed out**
- Make sure you're on a Chase or Amex domain
- Check that the extension is enabled in `chrome://extensions/`

**Offers not displaying correctly**
- Check the browser console for errors (F12 → Console)
- Verify you're on a supported Offers page
- Try refreshing the page and scanning again

## Limitations

- **Visible content only**: The extension only scans offers that are currently visible on the page. You may need to scroll and scan multiple times if offers are paginated.
- **No expiration dates**: Expiration dates are not extracted (by design)
- **Selector dependency**: If Chase or Amex update their HTML structure, selectors may need maintenance
- **No automation**: This is a manual tool - you must click "Scan Offers" each time

## Development

### Making Changes

1. Edit the relevant files (`contentScript.js`, `popup.js`, etc.)
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Debugging

- **Content Script**: Use Chrome DevTools on the Chase/Amex page
- **Popup**: Right-click the extension icon → "Inspect popup"

## License

This is a personal utility tool. Use at your own discretion.

## Support

This extension is provided as-is. For issues related to:
- **Website changes**: Update selectors in `contentScript.js` (see Maintenance Notes)
- **Extension bugs**: Check browser console for errors
- **Feature requests**: Modify the code as needed for your personal use

