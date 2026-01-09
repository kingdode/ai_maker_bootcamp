/**
 * Extension Connector Component
 * Helps users connect the dashboard to the Chrome extension
 */

'use client';

import { useState, useEffect } from 'react';

export default function ExtensionConnector() {
  const [extensionId, setExtensionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Try to detect if extension is available
    const checkConnection = () => {
      const chromeRuntime = (window as any).chrome?.runtime;
      if (chromeRuntime) {
        // Try to send a test message
        try {
          chromeRuntime.sendMessage(
            { action: 'getOffers' },
            (response: any) => {
              if (!chromeRuntime.lastError && response) {
                setIsConnected(true);
              }
            }
          );
        } catch (e) {
          // Extension not connected
        }
      }
    };

    checkConnection();
  }, []);

  const handleConnect = () => {
    if (!extensionId.trim()) {
      alert('Please enter your extension ID. You can find it in chrome://extensions');
      return;
    }

    // Store extension ID in localStorage
    localStorage.setItem('dealstackr_extension_id', extensionId);
    
    // Reload to try connecting
    window.location.reload();
  };

  if (isConnected) {
    return null; // Don't show connector if already connected
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-semibold text-yellow-800 mb-2">
        Connect to Chrome Extension
      </h3>
      <p className="text-sm text-yellow-700 mb-3">
        To view your scanned offers, connect to the Dealstackr Chrome extension.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={extensionId}
          onChange={(e) => setExtensionId(e.target.value)}
          placeholder="Extension ID (from chrome://extensions)"
          className="flex-1 px-3 py-2 border border-yellow-300 rounded-md text-sm"
        />
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700"
        >
          Connect
        </button>
      </div>
      <p className="text-xs text-yellow-600 mt-2">
        Find your extension ID: Open chrome://extensions, enable "Developer mode", and copy the ID under the extension name.
      </p>
    </div>
  );
}

