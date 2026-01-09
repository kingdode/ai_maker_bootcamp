/**
 * Main Dashboard Page
 * Fetches offers from Chrome extension and displays them in a table
 */

'use client';

import { useEffect, useState } from 'react';
import { Offer } from '../types/offer';
import { getOffers } from '../integration/extensionIntegration';
import SummaryBar from '../components/SummaryBar';
import OffersTable from '../components/OffersTable';
import EmptyState from '../components/EmptyState';
import ExtensionConnector from '../components/ExtensionConnector';

export default function Home() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    async function loadOffers() {
      try {
        setLoading(true);
        setError(null);
        
        // Try to load from extension
        const data = await getOffers();
        
        // Check if we're using mock data by comparing to known mock offers
        const mockOffers = await import('../mockData/mockOffers').then(m => m.mockOffers);
        const isMock = data.length === mockOffers.length && 
                      data.every((offer, idx) => offer.merchant === mockOffers[idx]?.merchant);
        setIsUsingMockData(isMock);
        
        if (data.length === 0) {
          setError('No offers found. Please scan some offers using the Dealstackr Chrome extension first.');
        } else {
          setOffers(data);
          if (isMock) {
            console.warn('[Dealstackr Dashboard] Using MOCK DATA - Extension not connected');
            console.warn('[Dealstackr Dashboard] To connect:');
            console.warn('1. Make sure the Dealstackr Chrome extension is installed');
            console.warn('2. Reload the extension in chrome://extensions');
            console.warn('3. Scan some offers in the extension');
            console.warn('4. Refresh this dashboard page');
          }
        }
      } catch (err) {
        console.error('Error loading offers:', err);
        setError('Failed to load offers. Make sure the Dealstackr Chrome extension is installed and has scanned some offers.');
      } finally {
        setLoading(false);
      }
    }

    loadOffers();
    
    // Set up listener for storage changes (real-time updates)
    const chromeStorage = typeof window !== 'undefined' ? (window as any).chrome?.storage : null;
    if (chromeStorage && chromeStorage.onChanged) {
      const listener = () => {
        loadOffers();
      };
      chromeStorage.onChanged.addListener(listener);
      
      return () => {
        chromeStorage.onChanged.removeListener(listener);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Dealstackr</h1>
          <p className="mt-1 text-sm text-gray-600">
            Consolidated Chase & Amex offers from your cards
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <ExtensionConnector />
        {isUsingMockData && !loading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Currently displaying mock data. To view your actual offers:
            </p>
            <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
              <li>Make sure the Dealstackr Chrome extension is installed and enabled</li>
              <li>Scan some offers using the extension</li>
              <li>Refresh this page</li>
              <li>Check the browser console (F12) for connection details</li>
            </ul>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading offers...</span>
          </div>
        ) : error ? (
          <div className="mb-6">
            <EmptyState type="error" message={error} />
          </div>
        ) : offers.length === 0 ? (
          <EmptyState type="no-data" />
        ) : (
          <>
            <SummaryBar offers={offers} />
            <div className="mt-6">
              <OffersTable offers={offers} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

