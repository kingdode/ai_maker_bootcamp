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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Stack Your Credit Card Offers</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Discover the best deal stacks from Chase and Amex offers combined with cashback portals. 
            Community-powered insights to maximize your savings.
          </p>
        </div>

        {/* Stats Bar */}
        <StatsBar stats={stats} />

        {/* Empty State */}
        {offers.length === 0 && (
          <div className="text-center py-16 mb-12">
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

        {/* Sync Info */}
        {syncInfo.lastSync && (
          <div className="text-center text-sm text-gray-500 mb-8">
            Last synced: {new Date(syncInfo.lastSync).toLocaleString()} • {syncInfo.offerCount} offers
          </div>
        )}

        {/* Featured Deals */}
        <FeaturedDeals deals={featuredDeals} />

        {/* All Offers Grid */}
        {offers.length > 0 && <OffersGrid offers={offers} />}
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
