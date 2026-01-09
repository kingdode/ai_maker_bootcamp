/**
 * Background Service Worker for Dealstackr Extension
 * 
 * Handles internal messages from content scripts and popup
 * The dashboard reads directly from chrome.storage.local, so no message handling needed here
 */

// Listen for internal messages (from content scripts/popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle any background tasks if needed in the future
  return false;
});

