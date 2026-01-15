import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/supabase/auth-check';

interface ArticleRequest {
  merchant: string;
  offerValue: string;
  issuer: string;
  cardName?: string;
  minSpend?: number;
  maxRedemption?: number;
  expiresAt?: string;
  cashback?: string;
  promoCode?: string;
  dealScore?: number;
  stackType?: string;
}

export async function POST(request: NextRequest) {
  // Require admin authentication
  const auth = await checkAdminAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const body: ArticleRequest = await request.json();
    const { merchant, offerValue, issuer, cardName, minSpend, maxRedemption, expiresAt, cashback, promoCode, dealScore, stackType } = body;

    // Get OpenAI API key from environment variable ONLY (secure)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    // Build the prompt for OpenAI
    const prompt = buildArticlePrompt({
      merchant,
      offerValue,
      issuer,
      cardName,
      minSpend,
      maxRedemption,
      expiresAt,
      cashback,
      promoCode,
      dealScore,
      stackType
    });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial content writer specializing in credit card deals and savings opportunities. Write engaging, consumer-friendly articles that highlight the value of credit card offers. Be concise, accurate, and avoid overly salesy language.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: `OpenAI API error: ${errorData.error?.message || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const articleContent = data.choices[0]?.message?.content || '';

    // Parse the article into structured format
    const parsedArticle = parseArticleContent(articleContent);

    // Fetch product images for the merchant
    let merchantImages: Array<{ url: string; alt: string; source?: string }> = [];
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const imageResponse = await fetch(`${baseUrl}/api/openai/fetch-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant })
      });
      
      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        merchantImages = imageData.images || [];
      }
    } catch (imageError) {
      console.error('Error fetching images:', imageError);
    }

    return NextResponse.json({
      success: true,
      article: parsedArticle,
      merchantImages,
      rawContent: articleContent
    });

  } catch (error) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      { error: 'Failed to generate article. Please check the server logs.' },
      { status: 500 }
    );
  }
}

function buildArticlePrompt(data: ArticleRequest): string {
  const {
    merchant,
    offerValue,
    issuer,
    cardName,
    minSpend,
    maxRedemption,
    expiresAt,
    cashback,
    promoCode,
    dealScore,
    stackType
  } = data;

  let prompt = `Write a compelling, editorial-style article promoting this credit card offer:

MERCHANT: ${merchant}
OFFER: ${offerValue}
CARD: ${issuer}${cardName ? ` ${cardName}` : ''}`;

  if (minSpend) {
    prompt += `\nMINIMUM SPEND: $${minSpend}`;
  }

  if (maxRedemption) {
    prompt += `\nMAXIMUM REDEMPTION: $${maxRedemption}`;
  }

  if (expiresAt) {
    prompt += `\nEXPIRES: ${expiresAt}`;
  }

  if (cashback) {
    prompt += `\nSTACKABLE WITH: ${cashback}`;
  }

  if (promoCode) {
    prompt += `\nPROMO CODE: ${promoCode}`;
  }

  if (dealScore) {
    prompt += `\nDEALSTACKR SCORE: ${dealScore}/100`;
  }

  if (stackType) {
    prompt += `\nSTACK TYPE: ${stackType}`;
  }

  prompt += `\n\nWrite a CONCISE editorial summary with the following structure:

1. HEADLINE: Catchy headline (max 60 characters)

2. INTRO: 1-2 sentences introducing the deal

3. VENDOR BACKGROUND: 2-3 sentences about what ${merchant} sells and who shops there

4. VALUE EXPLANATION: 2-3 sentences explaining the savings (include the math)

5. DEAL MERITS: 2-3 sentences on why this deal is special

6. HOW TO REDEEM: 3-4 brief bullet points on how to use this offer

7. STACKING NOTES: ${cashback || promoCode ? '1-2 sentences on combining with cashback/promos' : 'Skip if not applicable'}

8. EXPIRATION NOTE: ${expiresAt ? '1 sentence about the deadline' : 'Skip if not applicable'}

IMPORTANT: Keep it SHORT and punchy. Total length should be ~200-300 words max.
Tone: Friendly, helpful, not salesy.

Format: Return as JSON with keys: headline, intro, vendorBackground, valueExplanation, dealMerits, howToRedeem, stackingNotes (optional), expirationNote (optional)`;

  return prompt;
}

function parseArticleContent(content: string): {
  headline: string;
  intro: string;
  vendorBackground?: string;
  valueExplanation: string;
  dealMerits?: string;
  howToRedeem?: string;
  stackingNotes?: string;
  expirationNote?: string;
} {
  // Try to parse as JSON first
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        headline: parsed.headline || 'Great Deal Available',
        intro: parsed.intro || '',
        vendorBackground: parsed.vendorBackground,
        valueExplanation: parsed.valueExplanation || '',
        dealMerits: parsed.dealMerits,
        howToRedeem: parsed.howToRedeem,
        stackingNotes: parsed.stackingNotes,
        expirationNote: parsed.expirationNote
      };
    }
  } catch {
    // Fall through to text parsing
  }

  // Fallback: Parse from structured text
  const headlineMatch = content.match(/HEADLINE[:\-]?\s*(.+?)(?:\n|$)/i);
  const introMatch = content.match(/INTRO[:\-]?\s*(.+?)(?:\n\n|VENDOR|VALUE|$)/is);
  const vendorMatch = content.match(/VENDOR\s+BACKGROUND[:\-]?\s*(.+?)(?:\n\n|VALUE|DEAL\s+MERITS|$)/is);
  const valueMatch = content.match(/VALUE\s+EXPLANATION[:\-]?\s*(.+?)(?:\n\n|DEAL\s+MERITS|HOW\s+TO|STACKING|$)/is);
  const meritsMatch = content.match(/DEAL\s+MERITS[:\-]?\s*(.+?)(?:\n\n|HOW\s+TO|STACKING|EXPIRATION|$)/is);
  const redeemMatch = content.match(/HOW\s+TO\s+REDEEM[:\-]?\s*(.+?)(?:\n\n|STACKING|EXPIRATION|$)/is);
  const stackingMatch = content.match(/STACKING\s+NOTES?[:\-]?\s*(.+?)(?:\n\n|EXPIRATION|$)/is);
  const expirationMatch = content.match(/EXPIRATION\s+NOTE?[:\-]?\s*(.+?)$/is);

  return {
    headline: headlineMatch?.[1]?.trim() || 'Great Deal Available',
    intro: introMatch?.[1]?.trim() || '',
    vendorBackground: vendorMatch?.[1]?.trim(),
    valueExplanation: valueMatch?.[1]?.trim() || '',
    dealMerits: meritsMatch?.[1]?.trim(),
    howToRedeem: redeemMatch?.[1]?.trim(),
    stackingNotes: stackingMatch?.[1]?.trim(),
    expirationNote: expirationMatch?.[1]?.trim()
  };
}
