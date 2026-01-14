'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FeaturedDeal, Offer, CrowdsourcedReport } from '@/lib/types';

export default function AdminPage() {
  const [deals, setDeals] = useState<FeaturedDeal[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [crowdsourcedData, setCrowdsourcedData] = useState<CrowdsourcedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState<FeaturedDeal | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'featured' | 'offers' | 'userreports'>('featured');
  
  // Promotion modal state
  const [promotingOffer, setPromotingOffer] = useState<Offer | null>(null);
  const [promotionForm, setPromotionForm] = useState<{
    title: string;
    description: string;
    totalValue: string;
    cardOffer: string;
    cashback: string;
    promoCode: string;
    validUntil: string;
    priority: number;
    aiSummary: FeaturedDeal['aiSummary'] | null;
  }>({
    title: '',
    description: '',
    totalValue: '',
    cardOffer: '',
    cashback: '',
    promoCode: '',
    validUntil: '',
    priority: 1,
    aiSummary: null
  });
  const [generatingAI, setGeneratingAI] = useState(false);

  const emptyDeal: Omit<FeaturedDeal, 'id' | 'createdAt' | 'updatedAt'> = {
    title: '',
    description: '',
    merchant: '',
    totalValue: '',
    components: { cardOffer: '', cashback: '', promoCode: '' },
    issuer: 'Chase',
    validUntil: '',
    active: true,
    priority: 1
  };

  const [formData, setFormData] = useState(emptyDeal);

  useEffect(() => {
    fetchDeals();
    fetchOffers();
    fetchCrowdsourcedData();
  }, []);

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/featured?all=true');
      const data = await res.json();
      setDeals(data);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/offers');
      const data = await res.json();
      setOffers(data);
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    }
  };

  const fetchCrowdsourcedData = async () => {
    try {
      const res = await fetch('/api/crowdsourced');
      const data = await res.json();
      if (data.success && data.reports) {
        setCrowdsourcedData(data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch crowdsourced data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingDeal) {
        await fetch(`/api/featured/${editingDeal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('/api/featured', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      
      await fetchDeals();
      resetForm();
    } catch (error) {
      console.error('Failed to save deal:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    
    try {
      await fetch(`/api/featured/${id}`, { method: 'DELETE' });
      await fetchDeals();
    } catch (error) {
      console.error('Failed to delete deal:', error);
    }
  };

  const handleEdit = (deal: FeaturedDeal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      description: deal.description,
      merchant: deal.merchant,
      totalValue: deal.totalValue,
      components: { ...deal.components },
      issuer: deal.issuer,
      validUntil: deal.validUntil || '',
      active: deal.active,
      priority: deal.priority
    });
    setIsCreating(true);
  };

  const handleToggleActive = async (deal: FeaturedDeal) => {
    try {
      await fetch(`/api/featured/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          active: !deal.active,
          featuredPublishedAt: !deal.active ? new Date().toISOString() : deal.featuredPublishedAt
        })
      });
      await fetchDeals();
    } catch (error) {
      console.error('Failed to toggle deal:', error);
    }
  };

  const resetForm = () => {
    setEditingDeal(null);
    setIsCreating(false);
    setFormData(emptyDeal);
  };

  // Promotion modal functions
  const openPromotionModal = (offer: Offer) => {
    setPromotingOffer(offer);
    setPromotionForm({
      title: `${offer.merchant} Deal`,
      description: `${offer.offer_value} at ${offer.merchant}`,
      totalValue: offer.offer_value,
      cardOffer: offer.offer_value,
      cashback: offer.crowdsourced?.cashbackRate ? `${offer.crowdsourced.cashbackRate}% via ${offer.crowdsourced.portal || 'cashback portal'}` : '',
      promoCode: '',
      validUntil: offer.expires_at ? offer.expires_at.split('T')[0] : '',
      priority: 1,
      aiSummary: null
    });
  };

  const closePromotionModal = () => {
    setPromotingOffer(null);
    setPromotionForm({
      title: '',
      description: '',
      totalValue: '',
      cardOffer: '',
      cashback: '',
      promoCode: '',
      validUntil: '',
      priority: 1,
      aiSummary: null
    });
  };

  const generateAISummary = async () => {
    if (!promotingOffer) return;
    
    setGeneratingAI(true);
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer: promotingOffer,
          additionalContext: {
            rakutenRate: promotingOffer.crowdsourced?.cashbackRate,
            hasSignupOffer: false,
            promoCode: promotionForm.promoCode || undefined
          }
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setPromotionForm(prev => ({
          ...prev,
          aiSummary: data.summary,
          title: data.summary.headline,
          description: data.summary.intro
        }));
      }
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      alert('Failed to generate AI summary');
    } finally {
      setGeneratingAI(false);
    }
  };

  const publishPromotion = async () => {
    if (!promotingOffer) return;
    
    try {
      const newDeal = {
        title: promotionForm.title,
        description: promotionForm.description,
        merchant: promotingOffer.merchant,
        totalValue: promotionForm.totalValue,
        components: {
          cardOffer: promotionForm.cardOffer,
          cashback: promotionForm.cashback,
          promoCode: promotionForm.promoCode
        },
        issuer: promotingOffer.issuer === 'Unknown' ? 'Both' : (promotingOffer.issuer === 'Amex' || promotingOffer.issuer === 'Chase') ? promotingOffer.issuer : 'Both',
        validUntil: promotionForm.validUntil || undefined,
        active: true,
        priority: promotionForm.priority,
        sourceOfferId: promotingOffer.id,
        aiSummary: promotionForm.aiSummary || undefined,
        featuredPublishedAt: new Date().toISOString(),
        dealScore: promotingOffer.deal_score?.finalScore
      };
      
      await fetch('/api/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeal)
      });
      
      await fetchDeals();
      closePromotionModal();
      setActiveTab('featured');
    } catch (error) {
      console.error('Failed to publish promotion:', error);
      alert('Failed to publish promotion');
    }
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 80) return { label: 'Elite', class: 'bg-amber-500/20 text-amber-400' };
    if (score >= 60) return { label: 'Strong', class: 'bg-emerald-500/20 text-emerald-400' };
    if (score >= 40) return { label: 'Decent', class: 'bg-blue-500/20 text-blue-400' };
    return { label: 'Low', class: 'bg-gray-500/20 text-gray-400' };
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-[#2a2a3a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  DealStackr
                </span>
              </Link>
              <span className="px-3 py-1 text-xs font-semibold bg-amber-500/20 text-amber-400 rounded-full">
                ADMIN
              </span>
            </div>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              ← Back to Site
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('featured')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'featured'
                ? 'bg-indigo-500 text-white'
                : 'bg-[#12121a] text-gray-400 hover:text-white'
            }`}
          >
            ⭐ Top Deals ({deals.filter(d => d.active).length})
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'offers'
                ? 'bg-indigo-500 text-white'
                : 'bg-[#12121a] text-gray-400 hover:text-white'
            }`}
          >
            📋 All Offers ({offers.length})
          </button>
          <button
            onClick={() => setActiveTab('userreports')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'userreports'
                ? 'bg-indigo-500 text-white'
                : 'bg-[#12121a] text-gray-400 hover:text-white'
            }`}
          >
            👥 User Reports ({crowdsourcedData.length})
          </button>
        </div>

        {/* Featured Deals Tab */}
        {activeTab === 'featured' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-white">Manage Top Deals</h1>
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  + Add New Deal
                </button>
              )}
            </div>

            {/* Create/Edit Form */}
            {isCreating && (
              <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-6">
                  {editingDeal ? 'Edit Deal' : 'Create New Featured Deal'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Nike Triple Stack"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Merchant</label>
                      <input
                        type="text"
                        value={formData.merchant}
                        onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Nike"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Total Value</label>
                      <input
                        type="text"
                        value={formData.totalValue}
                        onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Up to 23% back"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Issuer</label>
                      <select
                        value={formData.issuer}
                        onChange={(e) => setFormData({ ...formData, issuer: e.target.value as 'Chase' | 'Amex' | 'Both' })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="Chase">Chase</option>
                        <option value="Amex">Amex</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        rows={2}
                        placeholder="Combine Chase offer with Rakuten cashback..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Card Offer</label>
                      <input
                        type="text"
                        value={formData.components.cardOffer || ''}
                        onChange={(e) => setFormData({ ...formData, components: { ...formData.components, cardOffer: e.target.value } })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="10% back via Chase"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Cashback Portal</label>
                      <input
                        type="text"
                        value={formData.components.cashback || ''}
                        onChange={(e) => setFormData({ ...formData, components: { ...formData.components, cashback: e.target.value } })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="8% Rakuten cashback"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Promo Code</label>
                      <input
                        type="text"
                        value={formData.components.promoCode || ''}
                        onChange={(e) => setFormData({ ...formData, components: { ...formData.components, promoCode: e.target.value } })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="5% with code SAVE5"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Valid Until</label>
                      <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Priority (lower = higher)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-600 bg-[#0a0a0f] text-indigo-500 focus:ring-indigo-500"
                      />
                      <label htmlFor="active" className="text-sm text-gray-400">Active (show on homepage)</label>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                    >
                      {editingDeal ? 'Save Changes' : 'Create Deal'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Deals List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {deals.length === 0 ? (
                  <div className="text-center py-12 bg-[#12121a] rounded-2xl border border-[#2a2a3a]">
                    <p className="text-gray-400">No featured deals yet. Create one or promote from the Offers tab.</p>
                  </div>
                ) : (
                  deals.map((deal) => (
                    <div
                      key={deal.id}
                      className={`bg-[#12121a] rounded-xl border p-6 transition-all ${
                        deal.active ? 'border-[#2a2a3a]' : 'border-red-500/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{deal.title}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              deal.issuer === 'Chase' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : deal.issuer === 'Amex'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {deal.issuer}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              deal.active 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {deal.active ? 'Active' : 'Inactive'}
                            </span>
                            {deal.aiSummary && (
                              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                                AI Generated
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
                              Priority: {deal.priority}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{deal.merchant} — {deal.totalValue}</p>
                          <p className="text-gray-500 text-sm">{deal.description}</p>
                          {deal.aiSummary && (
                            <p className="text-xs text-purple-400 mt-2">
                              ✨ AI summary generated {new Date(deal.aiSummary.generatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Link
                            href={`/deals/${deal.id}`}
                            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                            title="View Page"
                          >
                            👁️
                          </Link>
                          <button
                            onClick={() => handleToggleActive(deal)}
                            className={`p-2 rounded-lg transition-colors ${
                              deal.active 
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={deal.active ? 'Unpublish' : 'Publish'}
                          >
                            {deal.active ? '⏸️' : '▶️'}
                          </button>
                          <button
                            onClick={() => handleEdit(deal)}
                            className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(deal.id)}
                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Offers Tab - Promote to Top Deals */}
        {activeTab === 'offers' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">Promote to Top Deals</h1>
                <p className="text-gray-400 mt-1">Select an offer to promote with AI-generated editorial content</p>
              </div>
            </div>

            {(() => {
              // Sort offers: user-reported first, then by deal score
              const sortedOffers = [...offers].sort((a, b) => {
                const aHasReports = a.crowdsourced && (a.crowdsourced.reportCount || a.crowdsourced.cashbackRate || a.crowdsourced.promoRate);
                const bHasReports = b.crowdsourced && (b.crowdsourced.reportCount || b.crowdsourced.cashbackRate || b.crowdsourced.promoRate);
                
                // User-reported offers come first
                if (aHasReports && !bHasReports) return -1;
                if (!aHasReports && bHasReports) return 1;
                
                // Then sort by deal score
                const aScore = a.deal_score?.finalScore || 0;
                const bScore = b.deal_score?.finalScore || 0;
                return bScore - aScore;
              });

              const offersWithReports = sortedOffers.filter(o => 
                o.crowdsourced && (o.crowdsourced.reportCount || o.crowdsourced.cashbackRate || o.crowdsourced.promoRate)
              ).length;

              return offers.length === 0 ? (
                <div className="text-center py-12 bg-[#12121a] rounded-2xl border border-[#2a2a3a]">
                  <p className="text-gray-400">No offers available. Sync offers from the Chrome extension first.</p>
                </div>
              ) : (
                <>
                  {offersWithReports > 0 && (
                    <div className="mb-4 px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3">
                      <span className="text-2xl">👥</span>
                      <div>
                        <span className="text-purple-400 font-medium">{offersWithReports} offers</span>
                        <span className="text-gray-400"> have user-reported Rakuten/cashback data (shown first)</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#2a2a3a]">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Score</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Merchant</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Offer</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">User Reports</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Card</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2a3a]">
                        {sortedOffers.slice(0, 50).map((offer) => {
                          const scoreBadge = getScoreBadge(offer.deal_score?.finalScore);
                          const isPromoted = deals.some(d => d.sourceOfferId === offer.id);
                          const hasUserReports = offer.crowdsourced && (offer.crowdsourced.reportCount || offer.crowdsourced.cashbackRate || offer.crowdsourced.promoRate);
                          
                          return (
                            <tr key={offer.id} className={`hover:bg-[#1a1a24] ${hasUserReports ? 'bg-purple-500/5' : ''}`}>
                              <td className="px-6 py-4">
                                {scoreBadge && (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${scoreBadge.class}`}>
                                    {offer.deal_score?.finalScore} {scoreBadge.label}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white font-medium">{offer.merchant}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-emerald-400">{offer.offer_value}</span>
                              </td>
                              <td className="px-6 py-4">
                                {hasUserReports ? (
                                  <div className="flex flex-col gap-1">
                                    {offer.crowdsourced?.cashbackRate && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                                        💰 {offer.crowdsourced.cashbackRate}% {offer.crowdsourced.portal || ''}
                                      </span>
                                    )}
                                    {offer.crowdsourced?.promoRate && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                                        🏷️ {offer.crowdsourced.promoRate}% off
                                      </span>
                                    )}
                                    {offer.crowdsourced?.reportCount && !offer.crowdsourced?.cashbackRate && !offer.crowdsourced?.promoRate && (
                                      <span className="text-xs text-purple-400">
                                        👥 {offer.crowdsourced.reportCount} reports
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-600 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs ${
                                  offer.issuer === 'Chase' ? 'text-blue-400' : 'text-cyan-400'
                                }`}>
                                  {offer.card_name}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {isPromoted ? (
                                  <span className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                                    ✓ Promoted
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openPromotionModal(offer)}
                                    className="px-3 py-1 text-xs bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
                                  >
                                    ⭐ Promote
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* User Reports Tab - Crowdsourced Rakuten/Cashback Data */}
        {activeTab === 'userreports' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">User-Reported Deals</h1>
                <p className="text-gray-400 mt-1">Community-sourced Rakuten cashback rates, promo codes, and deals</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400">{crowdsourcedData.length}</div>
                  <div className="text-xs text-gray-500">Merchants with reports</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-400">
                    {crowdsourcedData.reduce((sum, r) => sum + (r.totalReports || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-500">Total reports</div>
                </div>
              </div>
            </div>

            {crowdsourcedData.length === 0 ? (
              <div className="text-center py-12 bg-[#12121a] rounded-2xl border border-[#2a2a3a]">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-white mb-2">No User Reports Yet</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  User reports will appear here when users log Rakuten cashback rates 
                  or promo codes using the DealStackr Chrome extension on merchant sites.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {crowdsourcedData.map((report) => {
                  const hasCashback = report.aggregated?.cashback?.count > 0;
                  const hasPromo = report.aggregated?.promo?.count > 0;
                  
                  return (
                    <div key={report.domain} className="bg-[#12121a] rounded-xl border border-[#2a2a3a] overflow-hidden">
                      {/* Header */}
                      <div className="px-6 py-4 border-b border-[#2a2a3a] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
                            🏪
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {report.merchant || report.domain}
                            </h3>
                            <p className="text-sm text-gray-500">{report.domain}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center px-4 py-2 bg-[#0a0a0f] rounded-lg">
                            <div className="text-xl font-bold text-emerald-400">{report.totalReports}</div>
                            <div className="text-xs text-gray-500">Reports</div>
                          </div>
                          {report.lastReportAt && (
                            <div className="text-xs text-gray-500">
                              Last: {new Date(report.lastReportAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Aggregated Data */}
                      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cashback Section */}
                        {hasCashback && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-lg">💰</span>
                              <h4 className="font-semibold text-emerald-400">Cashback Portal</h4>
                              <span className="ml-auto px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                                {report.aggregated.cashback.count} reports
                              </span>
                            </div>
                            <div className="space-y-2">
                              {report.aggregated.cashback.avgRate && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-400">Average Rate:</span>
                                  <span className="text-lg font-bold text-emerald-400">
                                    {report.aggregated.cashback.avgRate.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                              {report.aggregated.cashback.lastPortal && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-400">Portal:</span>
                                  <span className="text-sm font-medium text-white capitalize">
                                    {report.aggregated.cashback.lastPortal}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Promo Section */}
                        {hasPromo && (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-lg">🏷️</span>
                              <h4 className="font-semibold text-amber-400">Promo Codes</h4>
                              <span className="ml-auto px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                                {report.aggregated.promo.count} reports
                              </span>
                            </div>
                            <div className="space-y-2">
                              {report.aggregated.promo.avgRate && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-400">Average Discount:</span>
                                  <span className="text-lg font-bold text-amber-400">
                                    {report.aggregated.promo.avgRate.toFixed(0)}%
                                  </span>
                                </div>
                              )}
                              {report.aggregated.promo.lastOffer && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-400">Last Offer:</span>
                                  <span className="text-sm font-medium text-white">
                                    ${report.aggregated.promo.lastOffer}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {!hasCashback && !hasPromo && (
                          <div className="col-span-2 text-center py-4 text-gray-500">
                            No detailed report data available
                          </div>
                        )}
                      </div>

                      {/* Recent Reports */}
                      {report.reports && report.reports.length > 0 && (
                        <div className="px-6 py-4 border-t border-[#2a2a3a]">
                          <h5 className="text-sm font-semibold text-gray-400 mb-3">Recent Reports</h5>
                          <div className="flex flex-wrap gap-2">
                            {report.reports.slice(0, 5).map((r, idx) => (
                              <div 
                                key={idx}
                                className={`px-3 py-1.5 rounded-lg text-xs ${
                                  r.type === 'cashback' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : r.type === 'promo'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                }`}
                              >
                                {r.type === 'cashback' && (
                                  <>💰 {r.rateDisplay || (r.rate ? `${r.rate}%` : (r.fixedAmount ? `$${r.fixedAmount}` : ''))} via {r.portal || 'unknown'}</>
                                )}
                                {r.type === 'promo' && (
                                  <>🏷️ {r.rateDisplay || (r.rate ? `${r.rate}%` : (r.fixedAmount ? `$${r.fixedAmount} off` : 'Promo'))}</>
                                )}
                                {r.type === 'nothing' && <>❌ No deals</>}
                                <span className="ml-2 opacity-60">
                                  {new Date(r.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            ))}
                            {report.reports.length > 5 && (
                              <span className="px-3 py-1.5 text-xs text-gray-500">
                                +{report.reports.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Promotion Modal */}
        {promotingOffer && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#2a2a3a]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Promote to Top Deals</h2>
                  <button
                    onClick={closePromotionModal}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  {promotingOffer.merchant} — {promotingOffer.offer_value}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* User Reports Section - Show if offer has crowdsourced data */}
                {promotingOffer.crowdsourced && (promotingOffer.crowdsourced.cashbackRate || promotingOffer.crowdsourced.promoRate || promotingOffer.crowdsourced.reportCount) && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">👥</span>
                      <h3 className="font-semibold text-emerald-400">User-Reported Deal Data</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {promotingOffer.crowdsourced.cashbackRate && (
                        <div className="px-3 py-2 bg-emerald-500/20 rounded-lg">
                          <div className="text-xs text-emerald-300">Cashback Rate</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {promotingOffer.crowdsourced.cashbackRate}% via {promotingOffer.crowdsourced.portal || 'portal'}
                          </div>
                        </div>
                      )}
                      {promotingOffer.crowdsourced.promoRate && (
                        <div className="px-3 py-2 bg-amber-500/20 rounded-lg">
                          <div className="text-xs text-amber-300">Promo Discount</div>
                          <div className="text-lg font-bold text-amber-400">
                            {promotingOffer.crowdsourced.promoRate}% off
                          </div>
                        </div>
                      )}
                      {promotingOffer.crowdsourced.reportCount && (
                        <div className="px-3 py-2 bg-purple-500/20 rounded-lg">
                          <div className="text-xs text-purple-300">Reports</div>
                          <div className="text-lg font-bold text-purple-400">
                            {promotingOffer.crowdsourced.reportCount}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      ✓ This data is pre-filled in the Cashback Portal field below
                    </p>
                  </div>
                )}

                {/* AI Generation Section */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-purple-400">✨ AI Summary Generator</h3>
                    <button
                      onClick={generateAISummary}
                      disabled={generatingAI}
                      className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                    >
                      {generatingAI ? 'Generating...' : promotionForm.aiSummary ? 'Regenerate' : 'Generate AI Summary'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Generate editorial content based on the deal data. You can edit the result before publishing.
                  </p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Headline / Title</label>
                    <input
                      type="text"
                      value={promotionForm.title}
                      onChange={(e) => setPromotionForm({ ...promotionForm, title: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Description / Intro</label>
                    <textarea
                      value={promotionForm.description}
                      onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {promotionForm.aiSummary && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Value Explanation</label>
                        <textarea
                          value={promotionForm.aiSummary.valueExplanation}
                          onChange={(e) => setPromotionForm({
                            ...promotionForm,
                            aiSummary: { ...promotionForm.aiSummary!, valueExplanation: e.target.value }
                          })}
                          rows={3}
                          className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none text-sm"
                        />
                      </div>

                      {promotionForm.aiSummary.stackingNotes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Stacking Notes</label>
                          <textarea
                            value={promotionForm.aiSummary.stackingNotes}
                            onChange={(e) => setPromotionForm({
                              ...promotionForm,
                              aiSummary: { ...promotionForm.aiSummary!, stackingNotes: e.target.value }
                            })}
                            rows={2}
                            className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none text-sm"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Total Value</label>
                      <input
                        type="text"
                        value={promotionForm.totalValue}
                        onChange={(e) => setPromotionForm({ ...promotionForm, totalValue: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
                      <input
                        type="number"
                        min="1"
                        value={promotionForm.priority}
                        onChange={(e) => setPromotionForm({ ...promotionForm, priority: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Cashback Portal (optional)</label>
                      <input
                        type="text"
                        value={promotionForm.cashback}
                        onChange={(e) => setPromotionForm({ ...promotionForm, cashback: e.target.value })}
                        placeholder="e.g., 8% via Rakuten"
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Promo Code (optional)</label>
                      <input
                        type="text"
                        value={promotionForm.promoCode}
                        onChange={(e) => setPromotionForm({ ...promotionForm, promoCode: e.target.value })}
                        placeholder="e.g., SAVE10"
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#2a2a3a] flex justify-end gap-4">
                <button
                  onClick={closePromotionModal}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={publishPromotion}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  🚀 Publish to Top Deals
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
