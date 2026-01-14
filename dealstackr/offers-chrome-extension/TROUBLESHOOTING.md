# Dealstackr Troubleshooting Guide

## Quick Debugging Steps

### 1. Reload Extension
- Go to `chrome://extensions/`
- Find "DealStackr"
- Click the reload icon (circular arrow)
- This ensures all code changes are loaded

### 2. Check Browser Console
- **For Popup**: Right-click extension icon → "Inspect popup"
- **For Dashboard**: Open dashboard → Press F12 → Check Console tab
- Look for `[DealStackr]` or `[Dealstackr Dashboard]` messages

### 3. Verify Files Exist
Make sure these files are in the extension directory:
- `popup.html`
- `popup.js`
- `popup.css`
- `dashboard.html`
- `dashboard.js`
- `dashboard.css`
- `manifest.json`
- `contentScript.js`
- `background.js`

## Common Issues

### "Scan Offers" Button Not Working

**Symptoms**: Clicking "Scan Offers" does nothing or shows error

**Debug Steps**:
1. Open popup console (right-click extension icon → Inspect popup)
2. Click "Scan Offers"
3. Check console for errors

**Common Causes**:
- Not on Chase or Amex page → Navigate to offers page first
- Content script not loaded → Refresh the Chase/Amex page
- Page not supported → Check URL matches `*.chase.com` or `*.americanexpress.com`

**Fix**:
```javascript
// Check console for these messages:
[DealStackr] Scan button clicked
[DealStackr] Page check result: {supported: true/false}
[DealStackr] Starting scan...
[DealStackr] Scan complete, found X offers
```

### "Open Dashboard" Button Not Working

**Symptoms**: Clicking "Open Dashboard" does nothing

**Debug Steps**:
1. Open popup console
2. Click "Open Dashboard"
3. Check for error messages

**Common Causes**:
- `dashboard.html` file missing → Verify file exists
- `tabs` permission missing → Check manifest.json has `"tabs"` permission
- Extension not reloaded → Reload extension in chrome://extensions

**Fix**:
```javascript
// Check console for:
[DealStackr] Opening dashboard...
[DealStackr] Dashboard URL: chrome-extension://[id]/dashboard.html
[DealStackr] Dashboard opened successfully
```

### Dashboard Shows "No Offers Found"

**Symptoms**: Dashboard opens but shows empty state

**Debug Steps**:
1. Open dashboard console (F12)
2. Check for storage read errors
3. Verify data exists in storage

**Check Storage**:
1. Open dashboard console
2. Run: `chrome.storage.local.get(['dealCohorts', 'allDeals'], console.log)`
3. Verify data exists

**Common Causes**:
- No offers scanned yet → Scan some offers first
- Storage key mismatch → Check data format
- Extension not saving → Check popup console for save errors

### Dashboard Not Updating After Scan

**Symptoms**: Scan works but dashboard doesn't show new offers

**Debug Steps**:
1. Check dashboard console for storage change listener
2. Verify `chrome.storage.onChanged` is working
3. Manually refresh dashboard

**Fix**:
- Dashboard should auto-refresh when storage changes
- If not, manually refresh the dashboard tab
- Check console for: `[Dealstackr Dashboard] Storage changed`

## Manual Testing

### Test Scan Functionality
1. Navigate to a Chase or Amex offers page
2. Open extension popup
3. Click "Scan Offers"
4. Check popup console for success messages
5. Verify offers appear in popup table

### Test Dashboard
1. Scan some offers first
2. Click "Open Dashboard" in popup
3. Verify dashboard opens in new tab
4. Check dashboard console for load messages
5. Verify offers appear in dashboard table

### Test Storage
```javascript
// In popup or dashboard console:
chrome.storage.local.get(['dealCohorts', 'allDeals'], (items) => {
  console.log('Storage contents:', items);
  console.log('Cohorts:', Object.keys(items.dealCohorts || {}));
  console.log('Total deals:', items.allDeals?.length || 0);
});
```

## Error Messages Reference

### "Content script not loaded"
- **Cause**: Page refreshed after extension was installed
- **Fix**: Refresh the Chase/Amex page

### "No response from content script"
- **Cause**: Not on supported page or content script error
- **Fix**: Navigate to Chase/Amex offers page and refresh

### "Failed to open dashboard"
- **Cause**: Missing file or permission issue
- **Fix**: Verify `dashboard.html` exists and manifest has `"tabs"` permission

### "No offers found"
- **Cause**: No data in storage
- **Fix**: Scan some offers first using the popup

## Verification Checklist

- [ ] Extension reloaded in chrome://extensions
- [ ] On Chase or Amex offers page
- [ ] Page refreshed after extension install
- [ ] Popup console shows no errors
- [ ] Dashboard console shows no errors
- [ ] Storage contains data (check manually)
- [ ] All files present in extension directory

