import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFeaturedDealById } from '@/lib/data';
import { getMerchantUrl } from '@/lib/merchantUrls';

interface DealPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealPage({ params }: DealPageProps) {
  const { id } = await params;
  const deal = getFeaturedDealById(id);

  if (!deal) {
    notFound();
  }

  const merchantUrl = getMerchantUrl(deal.merchant);

  // Format expiration date
  const formatExpiry = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: 'Expired', urgent: true, full: 'This offer has expired' };
    if (daysLeft <= 3) return { text: `${daysLeft}d left`, urgent: true, full: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` };
    if (daysLeft <= 7) return { text: `${daysLeft}d left`, urgent: false, full: `Expires in ${daysLeft} days` };
    return { 
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      urgent: false,
      full: `Valid until ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    };
  };

  const expiry = formatExpiry(deal.validUntil);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_100%,rgba(139,92,246,0.1),transparent)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-[#2a2a3a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                DealStackr
              </span>
            </Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              ← Back to Deals
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm">
          <ol className="flex items-center gap-2 text-gray-500">
            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link href="/" className="hover:text-white transition-colors">Top Deals</Link></li>
            <li>/</li>
            <li className="text-white">{deal.merchant}</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-3xl border border-indigo-500/30 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              {/* AI Headline or Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {deal.aiSummary?.headline || deal.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${
                  deal.issuer === 'Chase' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : deal.issuer === 'Amex'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {deal.issuer}
                </span>
                
                {deal.dealScore && (
                  <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${
                    deal.dealScore >= 80 ? 'bg-amber-500/20 text-amber-400' :
                    deal.dealScore >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                    deal.dealScore >= 40 ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    Score: {deal.dealScore}
                  </span>
                )}
                
                {expiry && (
                  <span className={`px-3 py-1 text-sm font-medium rounded-lg ${
                    expiry.urgent ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {expiry.urgent ? '⏰' : '📅'} {expiry.text}
                  </span>
                )}
              </div>
              
              <p className="text-lg text-gray-300">
                {deal.aiSummary?.intro || deal.description}
              </p>
            </div>
            
            {/* Value Box */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center min-w-[200px]">
              <p className="text-sm text-emerald-400 uppercase tracking-wider mb-2">Total Value</p>
              <p className="text-3xl font-bold text-emerald-400">{deal.totalValue}</p>
            </div>
          </div>
        </div>

        {/* Merchant Images */}
        {deal.merchantImages && deal.merchantImages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {deal.merchantImages.map((image, index) => (
              <div key={index} className="rounded-xl overflow-hidden border border-[#2a2a3a]">
                <img 
                  src={image.url} 
                  alt={image.alt} 
                  className="w-full h-48 object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                {image.source && (
                  <p className="text-xs text-gray-500 p-2 bg-[#12121a]">{image.source}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Vendor Background */}
            {deal.aiSummary?.vendorBackground && (
              <section className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
                <h2 className="text-xl font-bold text-white mb-4">About {deal.merchant}</h2>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {deal.aiSummary.vendorBackground.replace(/\*\*/g, '')}
                  </p>
                </div>
              </section>
            )}

            {/* Value Explanation */}
            {deal.aiSummary?.valueExplanation && (
              <section className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
                <h2 className="text-xl font-bold text-white mb-4">💰 The Value Breakdown</h2>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {deal.aiSummary.valueExplanation.replace(/\*\*/g, '')}
                  </p>
                </div>
              </section>
            )}

            {/* Deal Merits */}
            {deal.aiSummary?.dealMerits && (
              <section className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
                <h2 className="text-xl font-bold text-white mb-4">⭐ What Makes This Deal Special</h2>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {deal.aiSummary.dealMerits.replace(/\*\*/g, '')}
                  </p>
                </div>
              </section>
            )}

            {/* How to Redeem */}
            {deal.aiSummary?.howToRedeem && typeof deal.aiSummary.howToRedeem === 'string' && (
              <section className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
                <h2 className="text-xl font-bold text-white mb-4">📝 How to Redeem This Offer</h2>
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {deal.aiSummary.howToRedeem.split('\n').map((line, i) => (
                      <p key={i} className="mb-3">{line.replace(/\*\*/g, '')}</p>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Stacking Notes */}
            {deal.aiSummary?.stackingNotes && (
              <section className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
                <h2 className="text-xl font-bold text-white mb-4">🔗 How to Stack This Deal</h2>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {deal.aiSummary.stackingNotes.replace(/\*\*/g, '')}
                  </p>
                </div>
              </section>
            )}

            {/* Expiration Warning */}
            {deal.aiSummary?.expirationNote && (
              <section className={`rounded-2xl border p-6 ${
                expiry?.urgent 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-[#12121a] border-[#2a2a3a]'
              }`}>
                <p className="text-gray-300 whitespace-pre-line">
                  {deal.aiSummary.expirationNote.replace(/\*\*/g, '').replace(/⚠️|⏰|📅|📆/g, '')}
                </p>
              </section>
            )}

            {/* Raw Article Content (fallback if no structured AI summary) */}
            {deal.articleContent && typeof deal.articleContent === 'string' && !deal.aiSummary?.vendorBackground && (
              <section className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
                <h2 className="text-xl font-bold text-white mb-4">📝 Deal Details</h2>
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {deal.articleContent.split('\n').map((line, i) => (
                      <p key={i} className="mb-3">{line.replace(/\*\*/g, '')}</p>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Disclosure */}
            <section className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong>Disclosure:</strong> DealStackr is an independent resource and is not affiliated with {deal.issuer}, 
                {deal.merchant}, or any cashback portals mentioned. Offers are subject to change and may vary by card. 
                Always verify current offers in your card issuer&apos;s app before making a purchase. Some links may be affiliate links.
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Deal Components */}
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
              <h3 className="text-lg font-bold text-white mb-4">Deal Components</h3>
              <div className="space-y-3">
                {deal.components.cardOffer && (
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-xl">
                    <span className="text-xl">💳</span>
                    <div>
                      <p className="text-xs text-blue-400 uppercase tracking-wider">Card Offer</p>
                      <p className="text-white">{deal.components.cardOffer}</p>
                    </div>
                  </div>
                )}
                {deal.components.cashback && (
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-xl">
                    <span className="text-xl">💰</span>
                    <div>
                      <p className="text-xs text-green-400 uppercase tracking-wider">Cashback Portal</p>
                      <p className="text-white">{deal.components.cashback}</p>
                    </div>
                  </div>
                )}
                {deal.components.promoCode && (
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-xl">
                    <span className="text-xl">🏷️</span>
                    <div>
                      <p className="text-xs text-amber-400 uppercase tracking-wider">Promo Code</p>
                      <p className="text-white font-mono">{deal.components.promoCode}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            {merchantUrl && (
              <a
                href={merchantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-center font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-indigo-500/25"
              >
                Shop at {deal.merchant} →
              </a>
            )}

            {/* Quick Info */}
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Merchant</dt>
                  <dd className="text-white">{deal.merchant}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Card Required</dt>
                  <dd className="text-white">{deal.issuer}</dd>
                </div>
                {expiry && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Expires</dt>
                    <dd className={expiry.urgent ? 'text-amber-400' : 'text-white'}>{expiry.full}</dd>
                  </div>
                )}
                {deal.featuredPublishedAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Featured</dt>
                    <dd className="text-white">
                      {new Date(deal.featuredPublishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a3a] mt-16 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>DealStackr © {new Date().getFullYear()} — Crowdsourced savings for smart shoppers</p>
        </div>
      </footer>
    </div>
  );
}

// Generate static params if needed
export async function generateStaticParams() {
  return [];
}
