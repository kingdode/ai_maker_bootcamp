'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  calculateDealStack, 
  formatDealStackResult, 
  calculateMinimumCart,
  POINT_VALUES,
  DealStackInput,
  DealStackResult 
} from '@/lib/dealCalculator';

export default function CalculatorPage() {
  // Form state
  const [cartValue, setCartValue] = useState<number>(0);
  
  // Promo code
  const [hasPromo, setHasPromo] = useState(false);
  const [promoType, setPromoType] = useState<'percent' | 'fixed'>('percent');
  const [promoValue, setPromoValue] = useState<number>(0);
  const [promoCode, setPromoCode] = useState('');
  
  // Email signup
  const [hasEmail, setHasEmail] = useState(false);
  const [emailType, setEmailType] = useState<'percent' | 'fixed'>('percent');
  const [emailValue, setEmailValue] = useState<number>(0);
  
  // Card offer
  const [hasCard, setHasCard] = useState(false);
  const [cardType, setCardType] = useState<'cashback' | 'points'>('cashback');
  const [cardCashback, setCardCashback] = useState<number>(0);
  const [cardMinSpend, setCardMinSpend] = useState<number>(0);
  const [cardMaxRedemption, setCardMaxRedemption] = useState<number>(0);
  const [cardPoints, setCardPoints] = useState<number>(0);
  const [cardProgram, setCardProgram] = useState<keyof typeof POINT_VALUES>('amex_mr');
  const [cardName, setCardName] = useState('');
  
  // Portal cashback
  const [hasPortal, setHasPortal] = useState(false);
  const [portalType, setPortalType] = useState<'percent' | 'fixed'>('percent');
  const [portalValue, setPortalValue] = useState<number>(0);
  const [portalName, setPortalName] = useState('Rakuten');
  
  // Result
  const [result, setResult] = useState<DealStackResult | null>(null);
  
  // Recalculate on any change
  useEffect(() => {
    if (cartValue <= 0) {
      setResult(null);
      return;
    }
    
    const input: DealStackInput = {
      cartValue,
      
      // Promo
      promoCodePercent: hasPromo && promoType === 'percent' ? promoValue : undefined,
      promoCodeFixed: hasPromo && promoType === 'fixed' ? promoValue : undefined,
      promoCodeName: hasPromo ? promoCode || undefined : undefined,
      
      // Email
      emailSignupPercent: hasEmail && emailType === 'percent' ? emailValue : undefined,
      emailSignupFixed: hasEmail && emailType === 'fixed' ? emailValue : undefined,
      
      // Card
      cardCashbackFixed: hasCard && cardType === 'cashback' ? cardCashback : undefined,
      cardMinSpend: hasCard ? cardMinSpend : undefined,
      cardMaxRedemption: hasCard && cardMaxRedemption > 0 ? cardMaxRedemption : undefined,
      cardPointsAmount: hasCard && cardType === 'points' ? cardPoints : undefined,
      cardPointsProgram: hasCard && cardType === 'points' ? cardProgram : undefined,
      cardName: hasCard ? cardName || undefined : undefined,
      
      // Portal
      portalCashbackPercent: hasPortal && portalType === 'percent' ? portalValue : undefined,
      portalCashbackFixed: hasPortal && portalType === 'fixed' ? portalValue : undefined,
      portalName: hasPortal ? portalName : undefined,
    };
    
    const calc = calculateDealStack(input);
    setResult(calc);
  }, [
    cartValue, hasPromo, promoType, promoValue, promoCode,
    hasEmail, emailType, emailValue,
    hasCard, cardType, cardCashback, cardMinSpend, cardMaxRedemption, cardPoints, cardProgram, cardName,
    hasPortal, portalType, portalValue, portalName
  ]);
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0d0d14]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            DealStackr
          </Link>
          <h1 className="text-lg font-medium text-gray-300">Stack Calculator</h1>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Input Form */}
          <div className="space-y-6">
            
            {/* Cart Value */}
            <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🛒</span> Cart Value
              </h2>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                <input
                  type="number"
                  value={cartValue || ''}
                  onChange={(e) => setCartValue(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-3 pl-8 pr-4 text-xl font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            
            {/* Promo Code */}
            <div className={`bg-[#12121a] border rounded-xl p-6 transition-all ${hasPromo ? 'border-amber-500/50' : 'border-gray-800'}`}>
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">🏷️</span> Promo Code
                </h2>
                <input
                  type="checkbox"
                  checked={hasPromo}
                  onChange={(e) => setHasPromo(e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-indigo-500"
                />
              </label>
              {hasPromo && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Code name (optional)"
                    className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 px-4 focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPromoType('percent')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${promoType === 'percent' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'}`}
                    >
                      % Off
                    </button>
                    <button
                      onClick={() => setPromoType('fixed')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${promoType === 'fixed' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'}`}
                    >
                      $ Off
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {promoType === 'percent' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      value={promoValue || ''}
                      onChange={(e) => setPromoValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Email Signup */}
            <div className={`bg-[#12121a] border rounded-xl p-6 transition-all ${hasEmail ? 'border-purple-500/50' : 'border-gray-800'}`}>
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">📧</span> Email Signup
                </h2>
                <input
                  type="checkbox"
                  checked={hasEmail}
                  onChange={(e) => setHasEmail(e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-indigo-500"
                />
              </label>
              {hasEmail && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEmailType('percent')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${emailType === 'percent' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      % Off
                    </button>
                    <button
                      onClick={() => setEmailType('fixed')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${emailType === 'fixed' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      $ Off
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {emailType === 'percent' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      value={emailValue || ''}
                      onChange={(e) => setEmailValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Card Offer */}
            <div className={`bg-[#12121a] border rounded-xl p-6 transition-all ${hasCard ? 'border-blue-500/50' : 'border-gray-800'}`}>
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">💳</span> Card Offer
                </h2>
                <input
                  type="checkbox"
                  checked={hasCard}
                  onChange={(e) => setHasCard(e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-indigo-500"
                />
              </label>
              {hasCard && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Card name (e.g., Amex Platinum)"
                    className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 px-4 focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCardType('cashback')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${cardType === 'cashback' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      $ Cashback
                    </button>
                    <button
                      onClick={() => setCardType('points')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${cardType === 'points' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      Points
                    </button>
                  </div>
                  
                  {cardType === 'cashback' ? (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={cardCashback || ''}
                        onChange={(e) => setCardCashback(parseFloat(e.target.value) || 0)}
                        placeholder="Amount back"
                        className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="number"
                        value={cardPoints || ''}
                        onChange={(e) => setCardPoints(parseFloat(e.target.value) || 0)}
                        placeholder="Points amount"
                        className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 px-4 focus:border-indigo-500 focus:outline-none"
                      />
                      <select
                        value={cardProgram}
                        onChange={(e) => setCardProgram(e.target.value as keyof typeof POINT_VALUES)}
                        className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 px-4 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="amex_mr">Amex MR (2.0¢/pt)</option>
                        <option value="chase_ur">Chase UR (2.0¢/pt)</option>
                        <option value="citi_typ">Citi TY (1.8¢/pt)</option>
                        <option value="capital_one">Capital One (1.7¢/pt)</option>
                        <option value="generic">Other (1.0¢/pt)</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Min Spend</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={cardMinSpend || ''}
                          onChange={(e) => setCardMinSpend(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Max Redemption</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={cardMaxRedemption || ''}
                          onChange={(e) => setCardMaxRedemption(parseFloat(e.target.value) || 0)}
                          placeholder="No limit"
                          className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Portal Cashback */}
            <div className={`bg-[#12121a] border rounded-xl p-6 transition-all ${hasPortal ? 'border-red-500/50' : 'border-gray-800'}`}>
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">💰</span> Cashback Portal
                </h2>
                <input
                  type="checkbox"
                  checked={hasPortal}
                  onChange={(e) => setHasPortal(e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-indigo-500"
                />
              </label>
              {hasPortal && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {['Rakuten', 'Honey', 'TopCashback', 'Other'].map((name) => (
                      <button
                        key={name}
                        onClick={() => setPortalName(name)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${portalName === name ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPortalType('percent')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${portalType === 'percent' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      % Back
                    </button>
                    <button
                      onClick={() => setPortalType('fixed')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${portalType === 'fixed' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      $ Back
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {portalType === 'percent' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      value={portalValue || ''}
                      onChange={(e) => setPortalValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            
          </div>
          
          {/* Results */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-bold">Stack Results</h2>
              </div>
              
              {result ? (
                <div className="p-6 space-y-6">
                  
                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      {result.warnings.map((warning, i) => (
                        <p key={i} className="text-amber-400 text-sm">{warning}</p>
                      ))}
                      {result.minimumCartToQualify > result.originalCart && (
                        <p className="text-amber-300 text-sm mt-2 font-medium">
                          💡 Increase cart to ${result.minimumCartToQualify.toFixed(2)} to qualify
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-400">
                      <span>🛒 Cart Value</span>
                      <span className="text-white font-medium">${result.originalCart.toFixed(2)}</span>
                    </div>
                    
                    {result.breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-400">{item.icon} {item.label}</span>
                          {item.note && <span className="text-gray-600 text-sm ml-2">({item.note})</span>}
                        </div>
                        <span className={item.value >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                          {item.value >= 0 ? '+' : ''}{item.value < 0 ? '-' : ''}${Math.abs(item.value).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <hr className="border-gray-700" />
                  
                  {/* Net Spend */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Net Spend (charged to card)</span>
                    <span className="text-white font-medium">${result.netSpend.toFixed(2)}</span>
                  </div>
                  
                  {/* Totals */}
                  <div className="bg-[#0a0a0f] rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">💸 Total Savings</span>
                      <span className="text-green-400 font-bold text-lg">${result.totalSavings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">✨ Final Cost</span>
                      <span className="text-white font-bold text-xl">${result.finalEffectiveCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🔥 Effective Discount</span>
                      <span className="text-indigo-400 font-bold text-lg">{Math.round(result.effectiveDiscountPercent)}% off</span>
                    </div>
                  </div>
                  
                  {/* Stack Type Badge */}
                  <div className="flex justify-center">
                    <span className={`px-4 py-2 rounded-full font-bold text-sm ${
                      result.stackLayers >= 4 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black' :
                      result.stackLayers >= 3 ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                      result.stackLayers >= 2 ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      📊 {result.stackType}
                    </span>
                  </div>
                  
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <p className="text-4xl mb-3">🧮</p>
                  <p>Enter a cart value to see your stack</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
