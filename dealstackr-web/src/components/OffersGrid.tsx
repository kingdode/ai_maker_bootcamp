'use client';

import { useState, useMemo } from 'react';
import { Offer } from '@/lib/types';
import ScoreBadge, { ScoreInfoTooltip } from './ScoreBadge';
import { calculateDealScore } from '@/lib/offerScoring';
import { getMerchantUrl } from '@/lib/merchantUrls';

interface OffersGridProps {
  offers: Offer[];
}

type SortOption = 'score' | 'merchant' | 'expires' | 'value';

export default function OffersGrid({ offers }: OffersGridProps) {
  const [filter, setFilter] = useState<'all' | 'Chase' | 'Amex'>('all');
  const [showStackable, setShowStackable] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('score');

  // Enhance offers with calculated scores if not present
  const enhancedOffers = useMemo(() => {
    return offers.map(offer => ({
      ...offer,
      deal_score: offer.deal_score ?? calculateDealScore(offer.offer_value)
    }));
  }, [offers]);

  // Filter and sort offers
  const processedOffers = useMemo(() => {
    let result = enhancedOffers.filter(offer => {
      if (filter !== 'all' && offer.issuer !== filter) return false;
      if (showStackable && !offer.stackable) return false;
      return true;
    });

    // Sort based on selected option
    switch (sortBy) {
      case 'score':
        result.sort((a, b) => (b.deal_score?.finalScore ?? 0) - (a.deal_score?.finalScore ?? 0));
        break;
      case 'merchant':
        result.sort((a, b) => a.merchant.localeCompare(b.merchant));
        break;
      case 'expires':
        result.sort((a, b) => {
          if (!a.expires_at && !b.expires_at) return 0;
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
        });
        break;
      case 'value':
        // Simple fallback to score since it factors in value
        result.sort((a, b) => (b.deal_score?.finalScore ?? 0) - (a.deal_score?.finalScore ?? 0));
        break;
    }

    return result;
  }, [enhancedOffers, filter, showStackable, sortBy]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: 'Expired', class: 'text-red-400 bg-red-400/10' };
    if (daysLeft <= 3) return { text: `${daysLeft}d left`, class: 'text-amber-400 bg-amber-400/10' };
    if (daysLeft <= 7) return { text: `${daysLeft}d left`, class: 'text-yellow-400 bg-yellow-400/10' };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), class: 'text-gray-400 bg-gray-400/10' };
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full" />
          <h2 className="text-2xl font-bold text-white">All Scanned Offers</h2>
          <span className="px-3 py-1 text-sm font-medium text-gray-400 bg-gray-800 rounded-full">
            {processedOffers.length} offers
          </span>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Issuer Filter */}
          <div className="flex bg-[var(--card)] rounded-lg p-1 border border-[var(--border)]">
            {(['all', 'Chase', 'Amex'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  filter === f
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-[var(--card)] text-white text-sm rounded-lg border border-[var(--border)] px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="score">Sort by Score</option>
              <option value="merchant">Sort by Merchant</option>
              <option value="expires">Sort by Expires</option>
            </select>
            <ScoreInfoTooltip />
          </div>
          
          {/* Stackable Toggle */}
          <button
            onClick={() => setShowStackable(!showStackable)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
              showStackable
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-[var(--card)] text-gray-400 border-[var(--border)] hover:text-white'
            }`}
          >
            🔗 Stackable
          </button>
        </div>
      </div>

      {processedOffers.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
          <p className="text-gray-400">No offers match your filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-[var(--card)]">
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-32">Score</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Merchant</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Offer</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Card</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Expires</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Stack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {processedOffers.map((offer) => {
                const expiry = formatDate(offer.expires_at);
                
                return (
                  <tr 
                    key={offer.id} 
                    className="bg-[var(--background)] hover:bg-[var(--card)] transition-colors"
                  >
                    {/* Score Cell */}
                    <td className="px-4 py-4">
                      <ScoreBadge score={offer.deal_score} size="sm" />
                    </td>
                    
                    {/* Merchant Cell */}
                    <td className="px-4 py-4">
                      {(() => {
                        const merchantUrl = getMerchantUrl(offer.merchant);
                        return (
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                              offer.issuer === 'Chase' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-cyan-500/20 text-cyan-400'
                            }`}>
                              {offer.merchant.charAt(0)}
                            </div>
                            {merchantUrl ? (
                              <a 
                                href={merchantUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                                title={`Visit ${offer.merchant}`}
                              >
                                {offer.merchant}
                                <span className="ml-1 text-xs opacity-60">↗</span>
                              </a>
                            ) : (
                              <span className="font-medium text-white">{offer.merchant}</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    
                    {/* Offer Cell */}
                    <td className="px-4 py-4">
                      <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium">
                        {offer.offer_value}
                      </span>
                    </td>
                    
                    {/* Card Cell */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-white text-sm">{offer.card_name}</p>
                        <p className={`text-xs ${offer.issuer === 'Chase' ? 'text-blue-400' : 'text-cyan-400'}`}>
                          {offer.issuer}
                        </p>
                      </div>
                    </td>
                    
                    {/* Expires Cell */}
                    <td className="px-4 py-4">
                      {expiry ? (
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${expiry.class}`}>
                          {expiry.text}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    
                    {/* Stack Cell */}
                    <td className="px-4 py-4">
                      {offer.stackable && offer.crowdsourced ? (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-lg">🔗</span>
                          <div className="text-xs">
                            <p className="text-emerald-400 font-medium">
                              +{offer.crowdsourced.cashbackRate}% {offer.crowdsourced.portal}
                            </p>
                            <p className="text-gray-500">
                              {offer.crowdsourced.reportCount} reports
                            </p>
                          </div>
                        </div>
                      ) : offer.stackable ? (
                        <span className="text-emerald-400">🔗</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
