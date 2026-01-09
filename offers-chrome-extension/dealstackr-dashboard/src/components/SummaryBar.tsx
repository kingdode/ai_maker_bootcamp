/**
 * Summary Bar Component
 * Displays total offers, issuer breakdown, and most recent scan date
 */

'use client';

import { Offer } from '../types/offer';

interface SummaryBarProps {
  offers: Offer[];
}

export default function SummaryBar({ offers }: SummaryBarProps) {
  const total = offers.length;
  const chaseCount = offers.filter(o => o.issuer === 'chase').length;
  const amexCount = offers.filter(o => o.issuer === 'amex').length;

  // Find most recent scan date
  const mostRecentScan = offers.length > 0
    ? offers.reduce((latest, offer) => {
        const offerDate = new Date(offer.last_scanned_at);
        const latestDate = new Date(latest.last_scanned_at);
        return offerDate > latestDate ? offer : latest;
      })
    : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
        <span className="font-semibold text-gray-900">
          {total} {total === 1 ? 'offer' : 'offers'}
        </span>
        <span className="text-gray-400">•</span>
        <span>
          <span className="font-medium text-blue-700">Chase:</span> {chaseCount}
        </span>
        <span className="text-gray-400">•</span>
        <span>
          <span className="font-medium text-blue-600">Amex:</span> {amexCount}
        </span>
        {mostRecentScan && (
          <>
            <span className="text-gray-400">•</span>
            <span>
              <span className="font-medium">Last scan:</span> {formatDate(mostRecentScan.last_scanned_at)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

