'use client';

import Link from 'next/link';
import { FeaturedDeal } from '@/lib/types';

interface FeaturedDealsProps {
  deals: FeaturedDeal[];
}

export default function FeaturedDeals({ deals }: FeaturedDealsProps) {
  if (deals.length === 0) {
    return null;
  }

  const formatExpiry = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: 'Expired', urgent: true };
    if (daysLeft <= 3) return { text: `${daysLeft}d left`, urgent: true };
    if (daysLeft <= 7) return { text: `${daysLeft}d left`, urgent: false };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false };
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 80) return { label: 'Elite', emoji: '🔥', class: 'bg-amber-500/20 text-amber-400' };
    if (score >= 60) return { label: 'Strong', emoji: '💪', class: 'bg-emerald-500/20 text-emerald-400' };
    if (score >= 40) return { label: 'Decent', emoji: '👍', class: 'bg-blue-500/20 text-blue-400' };
    return { label: 'Low', emoji: '📉', class: 'bg-gray-500/20 text-gray-400' };
  };

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Featured Deal Stacks</h2>
        <span className="px-3 py-1 text-xs font-semibold bg-amber-500/20 text-amber-400 rounded-full uppercase tracking-wider">
          Hot
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deals.map((deal, index) => {
          const expiry = formatExpiry(deal.validUntil);
          const scoreBadge = getScoreBadge(deal.dealScore);
          
          return (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className={`relative group card-glow rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer block ${
                index === 0 
                  ? 'bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-500/30 pulse-glow' 
                  : 'bg-[var(--card)] border-[var(--border)] hover:border-indigo-500/50'
              }`}
            >
              {index === 0 && (
                <div className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg z-10">
                  ⭐ TOP PICK
                </div>
              )}
              
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                      {deal.aiSummary?.headline || deal.title}
                    </h3>
                    <p className="text-sm text-gray-400">{deal.merchant}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                      deal.issuer === 'Chase' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : deal.issuer === 'Amex'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {deal.issuer}
                    </span>
                    {scoreBadge && (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${scoreBadge.class}`}>
                        {scoreBadge.emoji} {deal.dealScore}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Total Value */}
                <div className="mb-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Total Stack Value</p>
                  <p className="text-2xl font-bold text-emerald-400">{deal.totalValue}</p>
                </div>
                
                {/* Stack Components */}
                <div className="space-y-2 mb-4">
                  {deal.components.cardOffer && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 flex items-center justify-center bg-blue-500/20 rounded text-blue-400 text-xs">💳</span>
                      <span className="text-gray-300">{deal.components.cardOffer}</span>
                    </div>
                  )}
                  {deal.components.cashback && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 flex items-center justify-center bg-green-500/20 rounded text-green-400 text-xs">💰</span>
                      <span className="text-gray-300">{deal.components.cashback}</span>
                    </div>
                  )}
                  {deal.components.promoCode && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 flex items-center justify-center bg-amber-500/20 rounded text-amber-400 text-xs">🏷️</span>
                      <span className="text-gray-300">{deal.components.promoCode}</span>
                    </div>
                  )}
                </div>
                
                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {deal.aiSummary?.intro || deal.description}
                </p>
                
                {/* Footer with Expiration and Read More */}
                <div className="flex items-center justify-between">
                  {expiry && (
                    <div className={`flex items-center gap-2 text-xs ${expiry.urgent ? 'text-amber-400' : 'text-gray-500'}`}>
                      <span>{expiry.urgent ? '⏰' : '📅'}</span>
                      <span>{expiry.urgent ? `Expires ${expiry.text}` : `Valid until ${expiry.text}`}</span>
                    </div>
                  )}
                  <span className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Read more →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
