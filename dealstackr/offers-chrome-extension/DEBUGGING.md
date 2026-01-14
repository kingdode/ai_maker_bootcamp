# Debugging Guide

If scanning is not working, follow these steps to debug:

## Step 1: Check if Content Script is Loaded

1. Go to the Chase or Amex Offers page
2. Open Chrome DevTools (F12 or Right-click → Inspect)
3. Go to the **Console** tab
4. Type: `chrome.runtime.id` and press Enter
5. If you see an ID, the content script is loaded. If you get an error, the script isn't loaded.

## Step 2: Test Content Script Manually

In the Console tab, try running:

```javascript
// Check if issuer is detected
const hostname = window.location.hostname.toLowerCase();
console.log('Hostname:', hostname);
console.log('Is Chase?', hostname.includes('chase.com'));
console.log('Is Amex?', hostname.includes('americanexpress.com'));

// Try to find offer elements
const cards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"]');
console.log('Found cards:', cards.length);

// Check for offer-like content
const offerCards = Array.from(cards).filter(el => {
  const text = el.textContent || '';
  return (text.includes('%') || text.includes('back') || text.includes('cash back')) && 
         el.offsetHeight > 0 && el.offsetWidth > 0;
});
console.log('Found offer-like cards:', offerCards.length);
```

## Step 3: Check Extension Console

1. Right-click the extension icon in Chrome toolbar
2. Select "Inspect popup"
3. Check the Console tab for any errors
4. Try clicking "Scan Offers" and watch for error messages

## Step 4: Verify Page Structure

1. On the Offers page, inspect an offer card element
2. Note the HTML structure:
   - What are the class names?
   - What is the element structure?
   - Where is the merchant name located?
   - Where is the offer value located?

## Step 5: Update Selectors (if needed)

If offers aren't being detected, you may need to update the selectors in `contentScript.js`:

1. Open `contentScript.js`
2. Find the `extractChaseOffers()` function
3. Update the `offerSelectors` array with the actual class names/selectors from the page
4. Reload the extension in `chrome://extensions/`

## Common Issues

### "Content script not loaded"
- **Solution**: Refresh the Chase/Amex page after loading the extension

### "No visible offers detected"
- **Solution**: 
  - Make sure offers are actually visible on the page (scroll if needed)
  - The extension only scans what's currently visible
  - Try scrolling to load more offers, then scan again

### "Not on supported site"
- **Solution**: Make sure you're on `*.chase.com` or `*.americanexpress.com`

### Extension icon is grayed out
- **Solution**: 
  - Check `chrome://extensions/` to make sure extension is enabled
  - Make sure you're on a Chase or Amex domain

## Getting Help

If you're still having issues:
1. Check the browser console (F12) for errors
2. Check the popup console (right-click extension → Inspect popup)
3. Note what error messages you see
4. Check what selectors are actually on the page

