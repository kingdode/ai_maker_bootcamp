import { NextRequest, NextResponse } from 'next/server';
import { Offer, FeaturedDeal } from '@/lib/types';

/**
 * AI Summary Generation API
 * 
 * Generates editorial-style content for deals based on structured data.
 * In production, this would call an LLM API (OpenAI, Anthropic, etc.)
 * For demo purposes, we use intelligent template-based generation.
 */

interface GenerateSummaryRequest {
  offer: Offer;
  additionalContext?: {
    rakutenRate?: number;
    hasSignupOffer?: boolean;
    promoCode?: string;
  };
}

interface AISummary {
  headline: string;
  intro: string;
  valueExplanation: string;
  stackingNotes?: string;
  expirationNote?: string;
  generatedAt: string;
}

// Helper to extract dollar amount from offer value string
function extractDollarAmount(offerValue: string): number | null {
  const match = offerValue.match(/\$(\d+(?:\.\d{2})?)/);
  return match ? parseFloat(match[1]) : null;
}

// Helper to extract percentage from offer value string
function extractPercentage(offerValue: string): number | null {
  const match = offerValue.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

// Helper to extract minimum spend
function extractMinSpend(offerValue: string): number | null {
  const patterns = [
    /on\s+\$(\d+)/i,
    /\$(\d+)\+?\s*spend/i,
    /minimum\s+\$(\d+)/i
  ];
  for (const pattern of patterns) {
    const match = offerValue.match(pattern);
    if (match) return parseFloat(match[1]);
  }
  return null;
}

// Generate editorial headline
function generateHeadline(offer: Offer, context?: GenerateSummaryRequest['additionalContext']): string {
  const dollarBack = extractDollarAmount(offer.offer_value);
  const percentBack = extractPercentage(offer.offer_value);
  const score = offer.deal_score?.finalScore ?? 0;
  const issuerName = capitalizeIssuer(offer.issuer);
  
  // High-value deals get exciting headlines
  if (score >= 80 || (dollarBack && dollarBack >= 50)) {
    const headlines = [
      `${offer.merchant}: Don't Miss This Exceptional ${issuerName} Offer`,
      `Score Big at ${offer.merchant} with This ${issuerName} Deal`,
      `Top-Tier Savings Alert: ${offer.merchant} + ${issuerName}`,
    ];
    return headlines[Math.floor(Math.random() * headlines.length)];
  }
  
  // Stack opportunities
  if (context?.rakutenRate) {
    return `Stack Your Way to ${percentBack || dollarBack}%+ Back at ${offer.merchant}`;
  }
  
  // Standard headlines
  if (dollarBack) {
    return `Get $${dollarBack} Back at ${offer.merchant} with ${issuerName}`;
  }
  if (percentBack) {
    return `${percentBack}% Cash Back at ${offer.merchant} via ${issuerName}`;
  }
  
  return `${offer.merchant}: ${issuerName} Offer Worth Checking Out`;
}

// Capitalize issuer name properly
function capitalizeIssuer(issuer: string): string {
  if (issuer.toLowerCase() === 'amex') return 'Amex';
  if (issuer.toLowerCase() === 'chase') return 'Chase';
  return issuer;
}

// Generate intro paragraph
function generateIntro(offer: Offer, context?: GenerateSummaryRequest['additionalContext']): string {
  const dollarBack = extractDollarAmount(offer.offer_value);
  const percentBack = extractPercentage(offer.offer_value);
  const minSpend = extractMinSpend(offer.offer_value);
  const score = offer.deal_score?.finalScore ?? 0;
  const issuerName = capitalizeIssuer(offer.issuer);
  
  let intro = `${issuerName} cardholders have a solid opportunity to save at ${offer.merchant}. `;
  
  if (dollarBack && minSpend) {
    intro += `This offer gives you $${dollarBack} back when you spend $${minSpend} or more`;
    if (percentBack) {
      intro += ` — that's effectively ${percentBack}% savings`;
    }
    intro += '. ';
  } else if (percentBack) {
    intro += `You can earn ${percentBack}% cash back on your purchase. `;
  } else if (dollarBack) {
    intro += `The deal nets you $${dollarBack} back on qualifying purchases. `;
  }
  
  if (score >= 70) {
    intro += `With a DealStackr Score of ${score}, this ranks among our higher-value offers.`;
  } else if (score >= 50) {
    intro += `Our analysis gives this a DealStackr Score of ${score}, making it a decent value.`;
  }
  
  return intro;
}

// Generate value explanation
function generateValueExplanation(offer: Offer, context?: GenerateSummaryRequest['additionalContext']): string {
  const dollarBack = extractDollarAmount(offer.offer_value);
  const percentBack = extractPercentage(offer.offer_value);
  const minSpend = extractMinSpend(offer.offer_value);
  const score = offer.deal_score?.finalScore ?? 0;
  
  let explanation = '**Why this deal stands out:** ';
  
  if (score >= 80) {
    explanation += 'This is an elite-tier offer that delivers real, tangible savings. ';
  } else if (score >= 60) {
    explanation += 'This is a strong value proposition for regular shoppers at this merchant. ';
  } else {
    explanation += 'While not the highest-value offer, it still provides meaningful savings. ';
  }
  
  if (dollarBack && dollarBack >= 50) {
    explanation += `Getting $${dollarBack} back is significant — that's real money back in your pocket. `;
  }
  
  if (minSpend) {
    if (minSpend <= 100) {
      explanation += `The $${minSpend} minimum spend is very achievable for most purchases. `;
    } else if (minSpend <= 250) {
      explanation += `The $${minSpend} threshold is reasonable if you're planning a moderate purchase. `;
    } else {
      explanation += `Note the $${minSpend} minimum — best suited for larger planned purchases. `;
    }
  }
  
  if (percentBack && percentBack >= 15) {
    explanation += `A ${percentBack}% return rate significantly outperforms typical credit card rewards.`;
  }
  
  return explanation;
}

// Generate stacking notes
function generateStackingNotes(offer: Offer, context?: GenerateSummaryRequest['additionalContext']): string | undefined {
  if (!context?.rakutenRate && !context?.hasSignupOffer && !context?.promoCode) {
    if (offer.stackable) {
      return '**Stacking potential:** This offer may be stackable with cashback portals. Check Rakuten, TopCashback, or similar portals for additional savings before shopping.';
    }
    return undefined;
  }
  
  let notes = '**Maximize your savings:** ';
  const stackComponents: string[] = [];
  
  stackComponents.push(`${offer.issuer} card offer (${offer.offer_value})`);
  
  if (context.rakutenRate) {
    stackComponents.push(`Rakuten cashback (${context.rakutenRate}%)`);
  }
  
  if (context.hasSignupOffer) {
    stackComponents.push('Email signup discount (typically 10-15% off)');
  }
  
  if (context.promoCode) {
    stackComponents.push(`Promo code: ${context.promoCode}`);
  }
  
  notes += `Stack these for maximum value:\n`;
  stackComponents.forEach((comp, i) => {
    notes += `${i + 1}. ${comp}\n`;
  });
  
  return notes;
}

// Generate expiration note
function generateExpirationNote(offer: Offer): string | undefined {
  if (!offer.expires_at) return undefined;
  
  const expiryDate = new Date(offer.expires_at);
  const now = new Date();
  const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) {
    return '⚠️ **Note:** This offer has expired. Check your card app for current offers.';
  }
  
  if (daysLeft <= 3) {
    return `⏰ **Act fast:** This offer expires in just ${daysLeft} day${daysLeft !== 1 ? 's' : ''}! Add it to your card now if you plan to shop at ${offer.merchant} soon.`;
  }
  
  if (daysLeft <= 7) {
    return `📅 **Expiring soon:** You have ${daysLeft} days left to use this offer. Don't forget to activate it before shopping.`;
  }
  
  if (daysLeft <= 30) {
    return `📆 **Timeline:** This offer is valid until ${expiryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Plenty of time, but mark your calendar.`;
  }
  
  return undefined;
}

// Main generation function
function generateAISummary(offer: Offer, context?: GenerateSummaryRequest['additionalContext']): AISummary {
  return {
    headline: generateHeadline(offer, context),
    intro: generateIntro(offer, context),
    valueExplanation: generateValueExplanation(offer, context),
    stackingNotes: generateStackingNotes(offer, context),
    expirationNote: generateExpirationNote(offer),
    generatedAt: new Date().toISOString()
  };
}

// API Route Handler
export async function POST(request: NextRequest) {
  try {
    const body: GenerateSummaryRequest = await request.json();
    
    if (!body.offer) {
      return NextResponse.json(
        { error: 'Offer data is required' },
        { status: 400 }
      );
    }
    
    const summary = generateAISummary(body.offer, body.additionalContext);
    
    return NextResponse.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
