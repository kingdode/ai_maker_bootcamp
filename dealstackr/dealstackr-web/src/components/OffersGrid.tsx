'use client';

import { useState, useMemo, useEffect } from 'react';
import { Offer, CrowdsourcedReport } from '@/lib/types';
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
  const [crowdsourcedData, setCrowdsourcedData] = useState<CrowdsourcedReport[]>([]);

  // Fetch crowdsourced data
  useEffect(() => {
    fetch('/api/crowdsourced')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.reports) {
          setCrowdsourcedData(data.reports);
        }
      })
      .catch(err => console.error('Failed to fetch crowdsourced data:', err));
  }, []);

  // Helper to match merchant to crowdsourced data
  const findCrowdsourcedForMerchant = (merchantName: string): CrowdsourcedReport | null => {
    const normalized = merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const report of crowdsourcedData) {
      const domainBase = report.domain.replace(/\.(com|net|org|co\.uk|io)$/, '').replace(/^www\./, '').replace(/[^a-z0-9]/g, '');
      if (normalized.includes(domainBase) || domainBase.includes(normalized)) {
        return report;
      }
      if (report.merchant) {
        const merchantNorm = report.merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.includes(merchantNorm) || merchantNorm.includes(normalized)) {
          return report;
        }
      }
    }
    return null;
  };

  // Enhance offers with calculated scores and matched crowdsourced data
  const enhancedOffers = useMemo(() => {
    return offers.map(offer => {
      // Check if offer already has crowdsourced data
      const existingCrowdsourced = offer.crowdsourced && (offer.crowdsourced.reportCount || offer.crowdsourced.cashbackRate || offer.crowdsourced.promoRate);
      if (existingCrowdsourced) {
        // Recalculate score with stackable bonus
        const isStackable = !!(offer.crowdsourced?.cashbackRate || offer.crowdsourced?.promoRate);
        return {
          ...offer,
          deal_score: calculateDealScore(offer.offer_value, isStackable)
        };
      }
      // Try to match from crowdsourcedData
      const matched = findCrowdsourcedForMerchant(offer.merchant);
      const hasStack = matched && (matched.aggregated?.cashback?.avgRate || matched.aggregated?.promo?.avgRate);
      return {
        ...offer,
        // Recalculate score with stackable bonus if matched
        deal_score: calculateDealScore(offer.offer_value, !!hasStack),
        crowdsourced: matched ? {
          cashbackRate: matched.aggregated?.cashback?.avgRate || undefined,
          cashbackFixed: matched.aggregated?.cashback?.avgFixedAmount || undefined,
          promoRate: matched.aggregated?.promo?.avgRate || undefined,
          promoText: matched.aggregated?.promo?.lastOffer || undefined,
          portal: matched.aggregated?.cashback?.lastPortal || undefined,
          reportCount: matched.totalReports,
          lastReportAt: matched.lastReportAt,
        } : offer.crowdsourced
      };
    });
  }, [offers, crowdsourcedData]);

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
                        // Add dealstackr=report parameter to trigger extension widget
                        const merchantUrlWithTrigger = merchantUrl 
                          ? `${merchantUrl}${merchantUrl.includes('?') ? '&' : '?'}dealstackr=report`
                          : null;
                        return (
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                              offer.issuer === 'Chase' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-cyan-500/20 text-cyan-400'
                            }`}>
                              {offer.merchant.charAt(0)}
                            </div>
                            {merchantUrlWithTrigger ? (
                              <a 
                                href={merchantUrlWithTrigger}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                                title={`Visit ${offer.merchant} - Log deals you find!`}
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
                      <div>
                        <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium">
                          {offer.offer_value}
                        </span>
                        {/* Show points breakdown if available */}
                        {offer.points && (
                          <div className="mt-2 text-xs">
                            <div className="flex items-center gap-1 text-amber-400">
                              <span>⭐</span>
                              <span>{offer.points.amount.toLocaleString()} {offer.points.program} pts</span>
                            </div>
                            <div className="text-gray-500 mt-0.5">
                              ≈ ${offer.points.estimatedValue.toFixed(2)} value 
                              <span className="text-gray-600 ml-1">
                                ({offer.points.valueCentsPerPoint}¢/pt)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
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
                    
                    {/* Stack Cell - Simple horizontal label bars */}
                    <td className="px-4 py-4">
                      {offer.crowdsourced ? (
                        <div className="flex flex-col gap-1">
                          {/* Rakuten Label - Percent or Fixed */}
                          {offer.crowdsourced.portal?.toLowerCase() === 'rakuten' && (offer.crowdsourced.cashbackRate || offer.crowdsourced.cashbackFixed) && (
                            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded bg-[#eb0029] text-white">
                              Rakuten {offer.crowdsourced.cashbackFixed 
                                ? `$${offer.crowdsourced.cashbackFixed}` 
                                : `${offer.crowdsourced.cashbackRate}%`}
                            </span>
                          )}
                          
                          {/* Honey Label - Percent or Fixed */}
                          {offer.crowdsourced.portal?.toLowerCase() === 'honey' && (offer.crowdsourced.cashbackRate || offer.crowdsourced.cashbackFixed) && (
                            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded bg-amber-500 text-white">
                              Honey {offer.crowdsourced.cashbackFixed 
                                ? `$${offer.crowdsourced.cashbackFixed}` 
                                : `${offer.crowdsourced.cashbackRate}%`}
                            </span>
                          )}
                          
                          {/* Other Cashback Portal Label */}
                          {(offer.crowdsourced.cashbackRate || offer.crowdsourced.cashbackFixed) && 
                           offer.crowdsourced.portal?.toLowerCase() !== 'rakuten' && 
                           offer.crowdsourced.portal?.toLowerCase() !== 'honey' && (
                            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-500 text-white">
                              {offer.crowdsourced.portal || 'Cashback'} {offer.crowdsourced.cashbackFixed 
                                ? `$${offer.crowdsourced.cashbackFixed}` 
                                : `${offer.crowdsourced.cashbackRate}%`}
                            </span>
                          )}
                          
                          {/* Email Signup Label - with promo details */}
                          {(offer.crowdsourced.promoRate || offer.crowdsourced.promoText) && (
                            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded bg-purple-500 text-white max-w-[140px] truncate" 
                                  title={offer.crowdsourced.promoText || ''}>
                              Email {offer.crowdsourced.promoRate 
                                ? `${offer.crowdsourced.promoRate}%${offer.crowdsourced.promoText ? '+' : ''}` 
                                : (offer.crowdsourced.promoText || 'Offer')}
                            </span>
                          )}
                        </div>
                      ) : offer.stackable ? (
                        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded bg-gray-600 text-white">
                          Stackable
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
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
