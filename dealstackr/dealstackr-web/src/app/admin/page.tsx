'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FeaturedDeal, Offer, CrowdsourcedReport } from '@/lib/types';
import { calculateStackedDeal, parseCardOffer, getStackType, DealComponents, DealCalculation } from '@/lib/dealCalculator';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = !!session;
  const authLoading = status === 'loading';

  const [deals, setDeals] = useState<FeaturedDeal[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [crowdsourcedData, setCrowdsourcedData] = useState<CrowdsourcedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState<FeaturedDeal | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'featured' | 'offers' | 'userreports' | 'settings'>('featured');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };
  
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
    minSpend: number | null;
    maxRedemption: number | null;
    aiSummary: FeaturedDeal['aiSummary'] | null;
    merchantImages: Array<{ url: string; alt: string; source?: string }>;
    articleContent: string;
  }>({
    title: '',
    description: '',
    totalValue: '',
    cardOffer: '',
    cashback: '',
    promoCode: '',
    validUntil: '',
    priority: 1,
    minSpend: null,
    maxRedemption: null,
    aiSummary: null,
    merchantImages: [],
    articleContent: ''
  });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [articleContent, setArticleContent] = useState<string>('');
  const [generatingArticle, setGeneratingArticle] = useState(false);
  
  // User report promotion modal state
  const [promotingReport, setPromotingReport] = useState<CrowdsourcedReport | null>(null);
  const [matchingCardOffers, setMatchingCardOffers] = useState<Offer[]>([]);
  const [selectedCardOffer, setSelectedCardOffer] = useState<Offer | null>(null);
  const [reportPromotionForm, setReportPromotionForm] = useState({
    title: '',
    description: '',
    totalValue: '',
    // Card offer fields
    cardOffer: '',
    cardOfferBack: 0,
    cardOfferMinSpend: 0,
    // Cashback fields
    cashback: '',
    cashbackPercent: 0,
    cashbackFixed: 0,
    portalName: '',
    // Promo/signup fields
    promoCode: '',
    signupPercent: 0,
    signupFixed: 0,
    // Other
    validUntil: '',
    priority: 1,
    // For calculation
    targetSpend: 0
  });
  const [dealCalculation, setDealCalculation] = useState<DealCalculation | null>(null);

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
    // Load OpenAI API key from localStorage
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setOpenaiApiKey(savedKey);
    }
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
    
    // Parse min spend and max redemption from offer value
    const minSpendMatch = offer.offer_value.match(/(?:on|with)\s*\$(\d+(?:,\d{3})*(?:\.\d+)?)\+?\s*spend/i);
    const minSpend = minSpendMatch ? parseFloat(minSpendMatch[1].replace(/,/g, '')) : null;
    
    // Try to extract max redemption (common patterns: "up to $X", "max $X", "$X max")
    const maxRedemptionMatch = offer.offer_value.match(/(?:up\s+to|max(?:imum)?|maximum)\s*\$(\d+(?:,\d{3})*(?:\.\d+)?)/i);
    const maxRedemption = maxRedemptionMatch ? parseFloat(maxRedemptionMatch[1].replace(/,/g, '')) : null;
    
    // Build cashback string from crowdsourced data
    let cashbackText = '';
    if (offer.crowdsourced?.cashbackType === 'fixed' && offer.crowdsourced?.cashbackFixed) {
      cashbackText = `$${offer.crowdsourced.cashbackFixed} back via ${offer.crowdsourced.portal || 'cashback portal'}`;
    } else if (offer.crowdsourced?.cashbackRate) {
      cashbackText = `${offer.crowdsourced.cashbackRate}% via ${offer.crowdsourced.portal || 'cashback portal'}`;
    }
    
    // Build promo string from crowdsourced data
    let promoText = '';
    if (offer.crowdsourced?.promoRate) {
      promoText = `${offer.crowdsourced.promoRate}% off`;
      if (offer.crowdsourced.promoText) {
        promoText += ` + ${offer.crowdsourced.promoText}`;
      }
    } else if (offer.crowdsourced?.promoText) {
      promoText = offer.crowdsourced.promoText;
    }
    
    // Determine stack type for title
    const hasCard = !!offer.offer_value;
    const hasCashback = !!cashbackText;
    const hasPromo = !!promoText;
    const stackCount = [hasCard, hasCashback, hasPromo].filter(Boolean).length;
    const stackLabel = stackCount >= 3 ? '🔥 Triple Stack' : stackCount === 2 ? '🔥 Double Stack' : 'Deal';
    
    setPromotionForm({
      title: `${stackLabel}: ${offer.merchant}`,
      description: `${offer.offer_value} at ${offer.merchant}${cashbackText ? ` + ${cashbackText}` : ''}${promoText ? ` + ${promoText}` : ''}`,
      totalValue: offer.offer_value,
      cardOffer: offer.offer_value,
      cashback: cashbackText,
      promoCode: promoText,
      validUntil: offer.expires_at ? offer.expires_at.split('T')[0] : '',
      priority: 1,
      minSpend: minSpend,
      maxRedemption: maxRedemption,
      aiSummary: null,
      merchantImages: [],
      articleContent: ''
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
      minSpend: null,
      maxRedemption: null,
      aiSummary: null,
      merchantImages: [],
      articleContent: ''
    });
    setArticleContent('');
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

  const generateArticle = async () => {
    if (!promotingOffer) return;
    
    if (!openaiApiKey) {
      alert('Please configure your OpenAI API key in Settings first.');
      closePromotionModal();
      setActiveTab('settings');
      return;
    }
    
    setGeneratingArticle(true);
    try {
      const res = await fetch('/api/openai/generate-article', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-openai-api-key': openaiApiKey
        },
        body: JSON.stringify({
          merchant: promotingOffer.merchant,
          offerValue: promotionForm.cardOffer || promotingOffer.offer_value,
          issuer: promotingOffer.issuer,
          cardName: promotingOffer.card_name,
          minSpend: promotionForm.minSpend || undefined,
          maxRedemption: promotionForm.maxRedemption || undefined,
          expiresAt: promotionForm.validUntil || promotingOffer.expires_at || undefined,
          cashback: promotionForm.cashback || undefined,
          promoCode: promotionForm.promoCode || undefined,
          dealScore: promotingOffer.deal_score?.finalScore || undefined,
          stackType: promotionForm.cashback && promotionForm.promoCode ? 'Triple Stack' : 
                     (promotionForm.cashback || promotionForm.promoCode) ? 'Double Stack' : undefined
        })
      });
      
      const data = await res.json();
      if (data.success && data.article) {
        setPromotionForm(prev => ({
          ...prev,
          aiSummary: data.article,
          merchantImages: data.merchantImages || [],
          title: data.article.headline,
          description: data.article.intro,
          articleContent: data.rawContent || ''
        }));
        setArticleContent(data.rawContent || '');
      } else {
        throw new Error(data.error || 'Failed to generate article');
      }
    } catch (error: any) {
      console.error('Failed to generate article:', error);
      alert(`Failed to generate article: ${error.message || 'Please check your API key and try again.'}`);
    } finally {
      setGeneratingArticle(false);
    }
  };

  const saveApiKey = () => {
    if (openaiApiKey) {
      localStorage.setItem('openai_api_key', openaiApiKey);
      alert('API key saved successfully!');
    }
  };

  const publishPromotion = async () => {
    if (!promotingOffer) return;
    
    try {
      // Calculate stack type based on components
      const hasCard = !!promotionForm.cardOffer;
      const hasCashback = !!promotionForm.cashback;
      const hasPromo = !!promotionForm.promoCode;
      const stackCount = [hasCard, hasCashback, hasPromo].filter(Boolean).length;
      const stackType = stackCount >= 3 ? 'Triple Stack' : stackCount === 2 ? 'Double Stack' : stackCount === 1 ? 'Stack' : 'Deal';
      
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
        minSpend: promotionForm.minSpend || undefined,
        maxRedemption: promotionForm.maxRedemption || undefined,
        active: true,
        priority: promotionForm.priority,
        sourceOfferId: promotingOffer.id,
        aiSummary: promotionForm.aiSummary || undefined,
        merchantImages: promotionForm.merchantImages && promotionForm.merchantImages.length > 0 ? promotionForm.merchantImages : undefined,
        featuredPublishedAt: new Date().toISOString(),
        dealScore: promotingOffer.deal_score?.finalScore,
        stackType: stackType as 'Triple Stack' | 'Double Stack' | 'Stack' | 'Deal'
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

  // Delete a user report
  const deleteUserReport = async (domain: string) => {
    if (!confirm(`Are you sure you want to delete all reports for ${domain}?`)) return;
    
    try {
      const res = await fetch(`/api/crowdsourced?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Failed to delete');
      
      await fetchCrowdsourcedData();
    } catch (error) {
      console.error('Failed to delete user report:', error);
      alert('Failed to delete user report');
    }
  };

  // Open promotion modal for user report
  const openReportPromotionModal = (report: CrowdsourcedReport) => {
    const merchantName = report.merchant || report.domain.replace(/\.(com|net|org)$/, '');
    const cashbackRate = report.aggregated?.cashback?.avgRate || 0;
    const cashbackFixed = report.aggregated?.cashback?.avgFixedAmount || 0;
    const promoRate = report.aggregated?.promo?.avgRate || 0;
    const promoText = report.aggregated?.promo?.lastOffer || '';
    const portal = report.aggregated?.cashback?.lastPortal || '';
    
    // Find matching card offers for this merchant
    const normalizedMerchant = merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedOffers = offers.filter(offer => {
      const offerMerchant = offer.merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
      return offerMerchant.includes(normalizedMerchant) || normalizedMerchant.includes(offerMerchant);
    });
    setMatchingCardOffers(matchedOffers);
    
    // Pre-select the best card offer if available
    const bestOffer = matchedOffers.length > 0 
      ? matchedOffers.reduce((best, offer) => 
          (offer.deal_score?.finalScore || 0) > (best.deal_score?.finalScore || 0) ? offer : best
        )
      : null;
    setSelectedCardOffer(bestOffer);
    
    // Parse the best card offer if available
    let cardOfferBack = 0;
    let cardOfferMinSpend = 0;
    let cardOfferText = '';
    if (bestOffer) {
      const parsed = parseCardOffer(bestOffer.offer_value);
      cardOfferBack = parsed.back || 0;
      cardOfferMinSpend = parsed.minSpend || 0;
      cardOfferText = bestOffer.offer_value;
    }
    
    // Build cashback text
    let cashbackText = '';
    if (cashbackRate && portal) {
      cashbackText = `${cashbackRate.toFixed(1)}% via ${portal}`;
    } else if (cashbackFixed && portal) {
      cashbackText = `$${cashbackFixed.toFixed(0)} via ${portal}`;
    } else if (cashbackRate) {
      cashbackText = `${cashbackRate.toFixed(1)}% cashback`;
    } else if (cashbackFixed) {
      cashbackText = `$${cashbackFixed.toFixed(0)} cashback`;
    }
    
    // Build promo text
    let promoCodeText = '';
    if (promoRate) {
      promoCodeText = `${promoRate.toFixed(0)}% off with signup`;
    }
    if (promoText && promoText !== promoCodeText) {
      promoCodeText = promoCodeText ? `${promoCodeText}, ${promoText}` : promoText;
    }
    
    // Determine stack type
    const hasCashback = !!(cashbackRate || cashbackFixed);
    const hasPromo = !!(promoRate || promoText);
    const hasCard = !!bestOffer;
    
    let stackType = 'Deal';
    if (hasCard && hasCashback && hasPromo) {
      stackType = 'Triple Stack';
    } else if ((hasCard && hasCashback) || (hasCard && hasPromo) || (hasCashback && hasPromo)) {
      stackType = 'Double Stack';
    } else if (hasCard || hasCashback || hasPromo) {
      stackType = 'Stack';
    }
    
    // Calculate initial target spend based on card offer min spend or default
    const targetSpend = cardOfferMinSpend > 0 ? cardOfferMinSpend : 150;
    
    // Build description
    let description = '';
    if (stackType === 'Triple Stack') {
      description = `🔥🔥🔥 Triple Stack! Combine ${cardOfferText}, ${cashbackText}, and ${promoCodeText} at ${merchantName} for maximum savings!`;
    } else if (stackType === 'Double Stack') {
      description = `🔥🔥 Double Stack! ${hasCard ? cardOfferText : ''} ${hasCashback ? cashbackText : ''} ${hasPromo ? promoCodeText : ''} at ${merchantName}.`;
    } else {
      description = `Stack opportunity at ${merchantName}. ${hasCard ? cardOfferText : hasPromo ? promoCodeText : cashbackText}`;
    }
    
    setPromotingReport(report);
    setReportPromotionForm({
      title: `${merchantName} ${stackType}`,
      description: description,
      totalValue: '', // Will be calculated
      cardOffer: cardOfferText,
      cardOfferBack: cardOfferBack,
      cardOfferMinSpend: cardOfferMinSpend,
      cashback: cashbackText,
      cashbackPercent: cashbackRate,
      cashbackFixed: cashbackFixed,
      portalName: portal,
      promoCode: promoCodeText,
      signupPercent: promoRate,
      signupFixed: 0,
      validUntil: bestOffer?.expires_at?.split('T')[0] || '',
      priority: stackType === 'Triple Stack' ? 1 : stackType === 'Double Stack' ? 2 : 3,
      targetSpend: targetSpend
    });
    
    // Calculate the deal
    recalculateDeal({
      originalPrice: targetSpend,
      signupDiscountPercent: promoRate || undefined,
      cardOfferBack: cardOfferBack || undefined,
      cardOfferMinSpend: cardOfferMinSpend || undefined,
      cashbackPercent: cashbackRate || undefined,
      cashbackFixed: cashbackFixed || undefined,
      portalName: portal || undefined
    });
  };
  
  // Recalculate deal when components change
  const recalculateDeal = (components: DealComponents) => {
    if (components.originalPrice <= 0) {
      setDealCalculation(null);
      return;
    }
    
    const calc = calculateStackedDeal(components);
    setDealCalculation(calc);
    
    // Update total value display
    setReportPromotionForm(prev => ({
      ...prev,
      totalValue: `${Math.round(calc.effectiveDiscountPercent)}% off ($${calc.totalSavings.toFixed(2)} savings)`
    }));
  };

  // Close report promotion modal
  const closeReportPromotionModal = () => {
    setPromotingReport(null);
    setMatchingCardOffers([]);
    setSelectedCardOffer(null);
    setDealCalculation(null);
    setReportPromotionForm({
      title: '',
      description: '',
      totalValue: '',
      cardOffer: '',
      cardOfferBack: 0,
      cardOfferMinSpend: 0,
      cashback: '',
      cashbackPercent: 0,
      cashbackFixed: 0,
      portalName: '',
      promoCode: '',
      signupPercent: 0,
      signupFixed: 0,
      validUntil: '',
      priority: 1,
      targetSpend: 0
    });
  };

  // Publish user report as featured deal
  const publishReportPromotion = async () => {
    if (!promotingReport) return;
    
    try {
      const merchantName = promotingReport.merchant || promotingReport.domain.replace(/\.(com|net|org)$/, '');
      
      // Determine stack type for better labeling
      const hasCardOffer = !!reportPromotionForm.cardOffer;
      const hasCashback = !!reportPromotionForm.cashback;
      const hasPromo = !!reportPromotionForm.promoCode;
      
      let stackType = 'Deal';
      let stackEmoji = '💰';
      if (hasCardOffer && hasCashback && hasPromo) {
        stackType = 'Triple Stack';
        stackEmoji = '🔥🔥🔥';
      } else if ((hasCardOffer && hasCashback) || (hasCardOffer && hasPromo) || (hasCashback && hasPromo)) {
        stackType = 'Double Stack';
        stackEmoji = '🔥🔥';
      } else if (hasCardOffer || hasCashback || hasPromo) {
        stackType = 'Stack';
        stackEmoji = '🔥';
      }
      
      // Build comprehensive stacking notes
      let stackingNotes = '';
      const stackParts: string[] = [];
      if (hasCardOffer) stackParts.push(`💳 Card Offer: ${reportPromotionForm.cardOffer}`);
      if (hasCashback) stackParts.push(`💰 Cashback: ${reportPromotionForm.cashback}`);
      if (hasPromo) stackParts.push(`🏷️ Promo: ${reportPromotionForm.promoCode}`);
      
      if (stackParts.length > 1) {
        stackingNotes = `**${stackEmoji} ${stackType} Opportunity!**\n\nCombine these savings:\n${stackParts.map(p => `• ${p}`).join('\n')}\n\nUse all together for maximum value!`;
      } else if (stackParts.length === 1) {
        stackingNotes = `**Stack Potential:** ${stackParts[0]}. Look for additional card offers or cashback portals to stack!`;
      }
      
      const newDeal = {
        title: reportPromotionForm.title,
        description: reportPromotionForm.description,
        merchant: merchantName,
        totalValue: reportPromotionForm.totalValue,
        components: {
          cardOffer: reportPromotionForm.cardOffer,
          cashback: reportPromotionForm.cashback,
          promoCode: reportPromotionForm.promoCode
        },
        issuer: 'Both' as const,
        validUntil: reportPromotionForm.validUntil || undefined,
        active: true,
        priority: reportPromotionForm.priority,
        featuredPublishedAt: new Date().toISOString(),
        stackType: stackType, // Add stack type for public display
        // Mark as user-sourced with enhanced stacking info
        aiSummary: {
          headline: `${stackEmoji} ${reportPromotionForm.title}`,
          intro: reportPromotionForm.description,
          valueExplanation: `This ${stackType.toLowerCase()} was sourced from ${promotingReport.totalReports} community reports. Users have verified these savings at ${merchantName}.`,
          stackingNotes: stackingNotes,
          generatedAt: new Date().toISOString()
        }
      };
      
      await fetch('/api/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeal)
      });
      
      await fetchDeals();
      closeReportPromotionModal();
      setActiveTab('featured');
    } catch (error) {
      console.error('Failed to publish report promotion:', error);
      alert('Failed to publish report as featured deal');
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />
        </div>
        
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Redirecting to login...</h1>
          <p className="text-gray-400">Please wait while we authenticate you.</p>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-4">
              {session?.user && (
                <div className="flex items-center gap-2">
                  {session.user.image && (
                    <img 
                      src={session.user.image} 
                      alt={session.user.name || 'User'} 
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-400 hidden md:inline">
                    {session.user.email}
                  </span>
                </div>
              )}
              <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                ← Back to Site
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                🚪 Logout
              </button>
            </div>
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
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-indigo-500 text-white'
                : 'bg-[#12121a] text-gray-400 hover:text-white'
            }`}
          >
            ⚙️ Settings
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
              // Helper function to match merchant name to crowdsourced domain data
              const findCrowdsourcedForMerchant = (merchantName: string) => {
                const normalized = merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const report of crowdsourcedData) {
                  const domainBase = report.domain.replace(/\.(com|net|org|co\.uk|io)$/, '').replace(/^www\./, '').replace(/[^a-z0-9]/g, '');
                  if (normalized.includes(domainBase) || domainBase.includes(normalized)) {
                    return report;
                  }
                  // Also check merchant field if available
                  if (report.merchant) {
                    const merchantNorm = report.merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normalized.includes(merchantNorm) || merchantNorm.includes(normalized)) {
                      return report;
                    }
                  }
                }
                return null;
              };

              // Enhance offers with matched crowdsourced data
              const enhancedOffers = offers.map(offer => {
                // First check if offer already has crowdsourced data
                if (offer.crowdsourced && (offer.crowdsourced.reportCount || offer.crowdsourced.cashbackRate || offer.crowdsourced.promoRate)) {
                  return offer;
                }
                // Otherwise, try to match from crowdsourcedData
                const matched = findCrowdsourcedForMerchant(offer.merchant);
                if (matched) {
                  // Determine cashback type from reports (check if any report has fixedAmount)
                  const hasFixedCashback = matched.reports?.some(r => r.type === 'cashback' && r.fixedAmount);
                  
                  // Extract promo text from last promo report
                  const lastPromoReport = matched.reports?.filter(r => r.type === 'promo').sort((a, b) => 
                    new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
                  )[0];
                  
                  return {
                    ...offer,
                    crowdsourced: {
                      cashbackRate: matched.aggregated?.cashback?.avgRate,
                      cashbackFixed: matched.aggregated?.cashback?.avgFixedAmount,
                      cashbackType: hasFixedCashback ? 'fixed' as const : 'percent' as const,
                      promoRate: matched.aggregated?.promo?.avgRate,
                      promoText: lastPromoReport?.rateDisplay || matched.aggregated?.promo?.lastOffer,
                      portal: matched.aggregated?.cashback?.lastPortal,
                      reportCount: matched.totalReports,
                      lastReportAt: matched.lastReportAt,
                    }
                  };
                }
                return offer;
              });

              // Sort offers: user-reported first, then by deal score
              const sortedOffers = [...enhancedOffers].sort((a, b) => {
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
                                    {/* Cashback - either percent or fixed amount */}
                                    {offer.crowdsourced?.cashbackType === 'fixed' && offer.crowdsourced?.cashbackFixed ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                                        💰 ${offer.crowdsourced.cashbackFixed} back via {offer.crowdsourced.portal || 'cashback'}
                                      </span>
                                    ) : offer.crowdsourced?.cashbackRate ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                                        💰 {offer.crowdsourced.cashbackRate}% via {offer.crowdsourced.portal || 'cashback'}
                                      </span>
                                    ) : null}
                                    
                                    {/* Promo - either percent discount or text */}
                                    {offer.crowdsourced?.promoRate ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                                        🏷️ {offer.crowdsourced.promoRate}% off{offer.crowdsourced.promoText ? ` + ${offer.crowdsourced.promoText}` : ''}
                                      </span>
                                    ) : offer.crowdsourced?.promoText ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                                        🏷️ {offer.crowdsourced.promoText}
                                      </span>
                                    ) : null}
                                    
                                    {offer.crowdsourced?.reportCount && !offer.crowdsourced?.cashbackRate && !offer.crowdsourced?.cashbackFixed && !offer.crowdsourced?.promoRate && !offer.crowdsourced?.promoText && (
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
                          <div className="flex gap-2 ml-2">
                            <button
                              onClick={() => openReportPromotionModal(report)}
                              className="px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-1"
                            >
                              ⭐ Promote
                            </button>
                            <button
                              onClick={() => deleteUserReport(report.domain)}
                              className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1"
                            >
                              🗑️ Delete
                            </button>
                          </div>
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

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 mt-1">Configure API keys and preferences</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* OpenAI API Key Configuration */}
              <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🔑</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">OpenAI API Configuration</h2>
                    <p className="text-sm text-gray-400">Required for AI article generation</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="flex-1 px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={saveApiKey}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {openaiApiKey && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-sm text-emerald-400">
                        API key configured ({openaiApiKey.substring(0, 7)}...{openaiApiKey.substring(openaiApiKey.length - 4)})
                      </span>
                    </div>
                  )}

                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-gray-300 mb-2">
                      <strong>How to get your API key:</strong>
                    </p>
                    <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">platform.openai.com/api-keys</a></li>
                      <li>Sign in or create an account</li>
                      <li>Click "Create new secret key"</li>
                      <li>Copy the key and paste it above</li>
                    </ol>
                    <p className="text-xs text-gray-500 mt-3">
                      Your API key is stored locally in your browser and never sent to our servers except when generating articles.
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Settings Section */}
              <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-6">
                <h2 className="text-xl font-bold text-white mb-4">About</h2>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>DealStackr Admin Dashboard</p>
                  <p>Manage featured deals, promote offers, and configure AI article generation.</p>
                </div>
              </div>
            </div>
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
                {/* OpenAI API Key Status */}
                {!openaiApiKey && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">⚠️</span>
                      <h3 className="font-semibold text-amber-400">OpenAI API Key Required</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      To generate AI articles, please configure your OpenAI API key in{' '}
                      <button
                        onClick={() => {
                          closePromotionModal();
                          setActiveTab('settings');
                        }}
                        className="text-blue-400 hover:underline"
                      >
                        Settings
                      </button>
                      .
                    </p>
                  </div>
                )}
                {openaiApiKey && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✓</span>
                        <div>
                          <p className="text-sm font-medium text-emerald-400">OpenAI API Key Configured</p>
                          <p className="text-xs text-gray-400">
                            {openaiApiKey.substring(0, 7)}...{openaiApiKey.substring(openaiApiKey.length - 4)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          closePromotionModal();
                          setActiveTab('settings');
                        }}
                        className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                      >
                        Change Key
                      </button>
                    </div>
                  </div>
                )}

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
                    <h3 className="font-semibold text-purple-400">✨ AI Article Generator</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={generateAISummary}
                        disabled={generatingAI}
                        className="px-4 py-2 bg-purple-500/50 text-purple-300 text-sm rounded-lg hover:bg-purple-500/70 disabled:opacity-50 transition-colors"
                      >
                        {generatingAI ? 'Generating...' : 'Quick Summary'}
                      </button>
                      <button
                        onClick={generateArticle}
                        disabled={generatingArticle || !openaiApiKey}
                        className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                      >
                        {generatingArticle ? 'Generating...' : 'Generate Full Article'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Generate editorial content using OpenAI. Full article includes headline, intro, value explanation, stacking notes, and expiration urgency.
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
                      {promotionForm.aiSummary.expirationNote && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Expiration Note</label>
                          <textarea
                            value={promotionForm.aiSummary.expirationNote}
                            onChange={(e) => setPromotionForm({
                              ...promotionForm,
                              aiSummary: { ...promotionForm.aiSummary!, expirationNote: e.target.value }
                            })}
                            rows={2}
                            className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none text-sm"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Full Article Content Display */}
                  {promotionForm.articleContent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Full Article Content (Raw)</label>
                      <textarea
                        value={promotionForm.articleContent}
                        onChange={(e) => setPromotionForm({ ...promotionForm, articleContent: e.target.value })}
                        rows={8}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none text-sm font-mono"
                        placeholder="Full article content will appear here..."
                      />
                    </div>
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
                      <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Spend ($)</label>
                      <input
                        type="number"
                        value={promotionForm.minSpend || ''}
                        onChange={(e) => setPromotionForm({ ...promotionForm, minSpend: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="e.g., 150"
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Maximum Redemption ($)</label>
                      <input
                        type="number"
                        value={promotionForm.maxRedemption || ''}
                        onChange={(e) => setPromotionForm({ ...promotionForm, maxRedemption: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="e.g., 50"
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

        {/* User Report Promotion Modal */}
        {promotingReport && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#2a2a3a]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">🔥 Stack Deal Calculator</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Build and calculate the full stacked deal value
                    </p>
                  </div>
                  <button
                    onClick={closeReportPromotionModal}
                    className="text-gray-400 hover:text-white transition-colors text-2xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* User Report Summary */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
                    👥 User Report Data
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Merchant</p>
                      <p className="text-white font-medium">{promotingReport.merchant || promotingReport.domain}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reports</p>
                      <p className="text-white font-medium">{promotingReport.totalReports}</p>
                    </div>
                    {promotingReport.aggregated?.cashback?.avgRate ? (
                      <div>
                        <p className="text-xs text-gray-500">💰 Cashback</p>
                        <p className="text-emerald-400 font-medium">
                          {promotingReport.aggregated.cashback.avgRate.toFixed(1)}% via {promotingReport.aggregated.cashback.lastPortal}
                        </p>
                      </div>
                    ) : null}
                    {promotingReport.aggregated?.promo?.avgRate || promotingReport.aggregated?.promo?.lastOffer ? (
                      <div>
                        <p className="text-xs text-gray-500">📧 Signup</p>
                        <p className="text-amber-400 font-medium">
                          {promotingReport.aggregated.promo?.avgRate 
                            ? `${promotingReport.aggregated.promo.avgRate.toFixed(0)}% off` 
                            : promotingReport.aggregated.promo?.lastOffer}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Matching Card Offers */}
                {matchingCardOffers.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                      💳 Matching Card Offers ({matchingCardOffers.length})
                    </h3>
                    <div className="space-y-2">
                      {matchingCardOffers.map((offer, idx) => (
                        <label 
                          key={offer.id || idx}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            selectedCardOffer?.id === offer.id 
                              ? 'bg-blue-500/20 border border-blue-500/50' 
                              : 'bg-[#0a0a0f] border border-[#2a2a3a] hover:border-blue-500/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="cardOffer"
                            checked={selectedCardOffer?.id === offer.id}
                            onChange={() => {
                              setSelectedCardOffer(offer);
                              const parsed = parseCardOffer(offer.offer_value);
                              setReportPromotionForm(prev => ({
                                ...prev,
                                cardOffer: offer.offer_value,
                                cardOfferBack: parsed.back || 0,
                                cardOfferMinSpend: parsed.minSpend || 0,
                                targetSpend: parsed.minSpend || prev.targetSpend
                              }));
                              recalculateDeal({
                                originalPrice: parsed.minSpend || reportPromotionForm.targetSpend,
                                signupDiscountPercent: reportPromotionForm.signupPercent || undefined,
                                cardOfferBack: parsed.back || undefined,
                                cardOfferMinSpend: parsed.minSpend || undefined,
                                cashbackPercent: reportPromotionForm.cashbackPercent || undefined,
                                cashbackFixed: reportPromotionForm.cashbackFixed || undefined,
                                portalName: reportPromotionForm.portalName || undefined
                              });
                            }}
                            className="accent-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-white font-medium">{offer.offer_value}</p>
                            <p className="text-xs text-gray-500">{offer.issuer} • {offer.card_name} • Expires {offer.expires_at ? new Date(offer.expires_at).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          {offer.deal_score && (
                            <span className={`px-2 py-1 text-xs rounded-lg ${
                              offer.deal_score.finalScore >= 80 ? 'bg-amber-500/20 text-amber-400' :
                              offer.deal_score.finalScore >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {offer.deal_score.finalScore}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deal Calculator Inputs */}
                <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                    🧮 Deal Calculator
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Target Spend ($)</label>
                      <input
                        type="number"
                        value={reportPromotionForm.targetSpend}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setReportPromotionForm(prev => ({ ...prev, targetSpend: val }));
                          recalculateDeal({
                            originalPrice: val,
                            signupDiscountPercent: reportPromotionForm.signupPercent || undefined,
                            cardOfferBack: reportPromotionForm.cardOfferBack || undefined,
                            cardOfferMinSpend: reportPromotionForm.cardOfferMinSpend || undefined,
                            cashbackPercent: reportPromotionForm.cashbackPercent || undefined,
                            cashbackFixed: reportPromotionForm.cashbackFixed || undefined,
                            portalName: reportPromotionForm.portalName || undefined
                          });
                        }}
                        className="w-full px-3 py-2 bg-[#12121a] border border-[#2a2a3a] rounded-lg text-white text-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Signup Discount (%)</label>
                      <input
                        type="number"
                        value={reportPromotionForm.signupPercent || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setReportPromotionForm(prev => ({ ...prev, signupPercent: val }));
                          recalculateDeal({
                            originalPrice: reportPromotionForm.targetSpend,
                            signupDiscountPercent: val || undefined,
                            cardOfferBack: reportPromotionForm.cardOfferBack || undefined,
                            cardOfferMinSpend: reportPromotionForm.cardOfferMinSpend || undefined,
                            cashbackPercent: reportPromotionForm.cashbackPercent || undefined,
                            cashbackFixed: reportPromotionForm.cashbackFixed || undefined,
                            portalName: reportPromotionForm.portalName || undefined
                          });
                        }}
                        placeholder="e.g., 20"
                        className="w-full px-3 py-2 bg-[#12121a] border border-[#2a2a3a] rounded-lg text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Card Offer Back ($)</label>
                      <input
                        type="number"
                        value={reportPromotionForm.cardOfferBack || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setReportPromotionForm(prev => ({ ...prev, cardOfferBack: val }));
                          recalculateDeal({
                            originalPrice: reportPromotionForm.targetSpend,
                            signupDiscountPercent: reportPromotionForm.signupPercent || undefined,
                            cardOfferBack: val || undefined,
                            cardOfferMinSpend: reportPromotionForm.cardOfferMinSpend || undefined,
                            cashbackPercent: reportPromotionForm.cashbackPercent || undefined,
                            cashbackFixed: reportPromotionForm.cashbackFixed || undefined,
                            portalName: reportPromotionForm.portalName || undefined
                          });
                        }}
                        placeholder="50"
                        className="w-full px-3 py-2 bg-[#12121a] border border-[#2a2a3a] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Spend ($)</label>
                      <input
                        type="number"
                        value={reportPromotionForm.cardOfferMinSpend || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setReportPromotionForm(prev => ({ ...prev, cardOfferMinSpend: val }));
                        }}
                        placeholder="150"
                        className="w-full px-3 py-2 bg-[#12121a] border border-[#2a2a3a] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cashback (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={reportPromotionForm.cashbackPercent || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setReportPromotionForm(prev => ({ ...prev, cashbackPercent: val }));
                          recalculateDeal({
                            originalPrice: reportPromotionForm.targetSpend,
                            signupDiscountPercent: reportPromotionForm.signupPercent || undefined,
                            cardOfferBack: reportPromotionForm.cardOfferBack || undefined,
                            cardOfferMinSpend: reportPromotionForm.cardOfferMinSpend || undefined,
                            cashbackPercent: val || undefined,
                            cashbackFixed: reportPromotionForm.cashbackFixed || undefined,
                            portalName: reportPromotionForm.portalName || undefined
                          });
                        }}
                        placeholder="2"
                        className="w-full px-3 py-2 bg-[#12121a] border border-[#2a2a3a] rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Deal Calculation Result */}
                {dealCalculation && (
                  <div className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 border border-emerald-500/30 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                      ✨ Calculated Deal Value
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      {dealCalculation.breakdown.map((line, idx) => (
                        <p key={idx} className="text-sm text-gray-300">{line}</p>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-emerald-500/20">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total Savings</p>
                        <p className="text-2xl font-bold text-emerald-400">${dealCalculation.totalSavings.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Final Cost</p>
                        <p className="text-2xl font-bold text-white">${dealCalculation.finalCost.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Effective Discount</p>
                        <p className="text-2xl font-bold text-amber-400">{Math.round(dealCalculation.effectiveDiscountPercent)}% off</p>
                      </div>
                    </div>
                    
                    <p className="text-center text-sm text-emerald-300 mt-4">
                      💰 {dealCalculation.summary}
                    </p>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4 border-t border-[#2a2a3a] pt-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    📝 Featured Deal Details
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Title *</label>
                    <input
                      type="text"
                      value={reportPromotionForm.title}
                      onChange={(e) => setReportPromotionForm({ ...reportPromotionForm, title: e.target.value })}
                      placeholder="e.g., Mizzen+Main Triple Stack"
                      className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                    <textarea
                      value={reportPromotionForm.description}
                      onChange={(e) => setReportPromotionForm({ ...reportPromotionForm, description: e.target.value })}
                      placeholder="Describe the deal stack..."
                      rows={2}
                      className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Card Offer (optional)</label>
                      <input
                        type="text"
                        value={reportPromotionForm.cardOffer}
                        onChange={(e) => setReportPromotionForm({ ...reportPromotionForm, cardOffer: e.target.value })}
                        placeholder="e.g., $50 back on $250"
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Cashback Portal</label>
                      <input
                        type="text"
                        value={reportPromotionForm.cashback}
                        onChange={(e) => setReportPromotionForm({ ...reportPromotionForm, cashback: e.target.value })}
                        placeholder="e.g., 2% via Rakuten"
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Promo Code (optional)</label>
                      <input
                        type="text"
                        value={reportPromotionForm.promoCode}
                        onChange={(e) => setReportPromotionForm({ ...reportPromotionForm, promoCode: e.target.value })}
                        placeholder="e.g., WELCOME15"
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Valid Until (optional)</label>
                      <input
                        type="date"
                        value={reportPromotionForm.validUntil}
                        onChange={(e) => setReportPromotionForm({ ...reportPromotionForm, validUntil: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Priority (1 = highest)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={reportPromotionForm.priority}
                      onChange={(e) => setReportPromotionForm({ ...reportPromotionForm, priority: parseInt(e.target.value) || 1 })}
                      className="w-24 px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#2a2a3a] flex justify-end gap-4">
                <button
                  onClick={closeReportPromotionModal}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={publishReportPromotion}
                  disabled={!reportPromotionForm.title || !reportPromotionForm.totalValue}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
