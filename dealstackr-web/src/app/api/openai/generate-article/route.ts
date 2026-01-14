import { NextRequest, NextResponse } from 'next/server';

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
  try {
    const body: ArticleRequest = await request.json();
    const { merchant, offerValue, issuer, cardName, minSpend, maxRedemption, expiresAt, cashback, promoCode, dealScore, stackType } = body;

    // Get OpenAI API key from request headers or environment
    const apiKey = request.headers.get('x-openai-api-key') || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not provided. Please configure it in admin settings.' },
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
        model: 'gpt-4o-mini', // Using cheaper model, can upgrade to gpt-4 if needed
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
        max_tokens: 3000 // Increased for longer, more detailed articles
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
      const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/openai/fetch-images`, {
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
      // Continue without images if fetch fails
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
      { error: 'Failed to generate article. Please check your API key and try again.' },
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

  prompt += `\n\nPlease write a comprehensive, editorial-style article with the following structure:

1. HEADLINE: A compelling, attention-grabbing headline (max 80 characters)

2. INTRO: A 2-3 sentence introduction that hooks the reader and introduces the deal

3. VENDOR BACKGROUND: A full paragraph (4-6 sentences) explaining what ${merchant} is, what products/services they offer, their target audience, and why people shop there. Make it informative and engaging.

4. VALUE EXPLANATION: A substantial paragraph (5-7 sentences) explaining the mathematics and value of this specific offer. Include:
   - The exact savings amount
   - Percentage saved
   - Comparison to typical prices
   - Real-world purchase examples
   - Why this is a strong value proposition

5. DEAL MERITS: A paragraph (4-5 sentences) highlighting what makes this particular deal stand out:
   - Why now is a good time to buy
   - What makes this offer better than usual
   - Who would benefit most from this deal
   - Any unique aspects of the offer

6. HOW TO REDEEM: Clear, step-by-step instructions (4-6 steps) on exactly how to activate and use this offer:
   - How to add the offer to your card
   - Where to shop (online/in-store)
   - What to buy
   - How to ensure the credit posts
   - Timeline for receiving the credit

7. STACKING NOTES: ${cashback || promoCode ? 'A detailed paragraph explaining how to stack this offer with cashback portals and promo codes for maximum savings, including specific examples and calculations.' : 'If applicable, mention potential stacking opportunities.'}

8. EXPIRATION NOTE: ${expiresAt ? 'Create urgency around the expiration date and remind readers to act quickly.' : 'If applicable, mention any time-sensitive aspects.'}

Tone: Professional, consumer-friendly, editorial (like Wirecutter or The Points Guy). Focus on real value and practical advice. Use specific examples and numbers. Be enthusiastic but not salesy.

Length: Aim for 800-1000 words total.

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
  } catch (e) {
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
