import Header from '@/components/Header';
import FeaturedDeals from '@/components/FeaturedDeals';
import OffersGrid from '@/components/OffersGrid';
import StatsBar from '@/components/StatsBar';
import { getFeaturedDeals, getOffers, getStats, getLastSyncInfo } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default function Home() {
  const featuredDeals = getFeaturedDeals();
  const offers = getOffers();
  const stats = getStats();
  const syncInfo = getLastSyncInfo();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Background pattern */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_100%,rgba(139,92,246,0.1),transparent)]" />
      </div>

      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section with Promoted Deals */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="gradient-text">💰 DealStackr</span>
            </h1>
            <p className="text-sm text-gray-400">
              Stack your credit card offers with cashback portals • Community-powered savings
            </p>
          </div>

          {/* Promoted Deals - Hero Section */}
          {featuredDeals.length > 0 ? (
            <div className="mb-8 overflow-visible">
              <FeaturedDeals deals={featuredDeals} />
            </div>
          ) : (
            offers.length > 0 && (
              <div className="text-center py-8 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-sm text-indigo-400">
                  <span>⭐</span>
                  <span>No promoted deals yet • Admin can feature top stacks</span>
                </div>
              </div>
            )
          )}

          {/* Empty State - No Offers */}
          {offers.length === 0 && (
            <div className="text-center py-12 mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-500/10 mb-6">
                <span className="text-4xl">📭</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">No Offers Yet</h2>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                Install the DealStackr Chrome extension, scan your Chase and Amex offers, 
                then click <strong>&quot;Sync to Website&quot;</strong> to see them here.
              </p>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 max-w-lg mx-auto">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">How to sync your offers:</h3>
                <ol className="text-left text-sm text-gray-400 space-y-3">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
                    <span>Open your Chase or Amex account in Chrome</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
                    <span>Navigate to the Offers page and let DealStackr scan</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
                    <span>Open the DealStackr dashboard (click extension icon)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">4</span>
                    <span>Click <strong className="text-indigo-400">&quot;🌐 Sync to Website&quot;</strong> button</span>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* All Scanned Offers Section */}
        {offers.length > 0 && (
          <div>
            {/* Section Header with Stats */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span>All Scanned Offers</span>
                  <span className="px-3 py-1 text-sm font-semibold bg-gray-500/20 text-gray-400 rounded-full">
                    {offers.length}
                  </span>
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Your synced credit card offers sorted by DealStackr Score
                </p>
              </div>
              
              {/* Sync Info */}
              {syncInfo.lastSync && (
                <div className="text-sm text-gray-500 text-right">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Last synced</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {new Date(syncInfo.lastSync).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Stats Bar */}
            <div className="mb-6">
              <StatsBar stats={stats} />
            </div>

            {/* Offers Grid */}
            <OffersGrid offers={offers} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>DealStackr &copy; {new Date().getFullYear()} — Crowdsourced savings for smart shoppers</p>
        </div>
      </footer>
    </div>
  );
}
