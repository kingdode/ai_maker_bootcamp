import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/supabase/auth-check';
import { ArticleRequestSchema, validateInput, ValidationError } from '@/lib/validation';

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
    const body = await request.json();
    
    // Validate request body
    let validatedRequest: ArticleRequest;
    try {
      validatedRequest = validateInput(ArticleRequestSchema, body);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { merchant, offerValue, issuer, cardName, minSpend, maxRedemption, expiresAt, cashback, promoCode, dealScore, stackType } = validatedRequest;

    // Get OpenAI API key from environment variable ONLY (secure)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('[SECURITY] OpenAI API key not configured');
      return NextResponse.json(
        { error: 'AI article generation is not available at this time.' },
        { status: 503 } // Service Unavailable
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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You write deal coverage for a credit card rewards site. Your voice is direct, knowledgeable, and slightly irreverent—like a friend who happens to be obsessed with maximizing credit card offers.

CRITICAL RULES TO SOUND HUMAN:
- Never use these AI clichés: "Whether you're...", "It's worth noting", "In today's...", "If you're looking to...", "This offer is perfect for...", "Don't miss out on...", "Take advantage of..."
- Never start sentences with "This" repeatedly
- Never use corporate buzzwords: "leverage", "optimize", "maximize your savings potential"
- Never hedge with "may", "might", "could potentially"—be direct
- Avoid exclamation points except rarely for genuine emphasis
- Don't explain obvious things
- Use contractions naturally (you'll, it's, don't, won't)
- Vary sentence length—some short, some longer
- Include one slightly opinionated take or personal observation
- Reference the merchant naturally, not robotically

Your tone: Confident expertise without being preachy. You've seen hundreds of these offers. You know which ones matter and which are noise. This one caught your attention—explain why in plain English.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.85,
        max_tokens: 1800
      })
    });

    if (!response.ok) {
      // Log error internally but don't expose details to client
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error?.type,
        // Don't log full error message as it may contain sensitive info
      });
      
      return NextResponse.json(
        { error: 'Failed to generate article content. Please try again later.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const articleContent = data.choices[0]?.message?.content || '';

    if (!articleContent) {
      console.error('[API] OpenAI returned empty content');
      return NextResponse.json(
        { error: 'Generated content was empty. Please try again.' },
        { status: 500 }
      );
    }

    // Parse the article into structured format
    const parsedArticle = parseArticleContent(articleContent);

    // Fetch product images for the merchant
    let merchantImages: Array<{ url: string; alt: string; source?: string }> = [];
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const imageResponse = await fetch(`${baseUrl}/api/openai/fetch-images`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Forward authentication
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ merchant })
      });
      
      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        merchantImages = imageData.images || [];
      }
    } catch (imageError) {
      console.error('[API] Error fetching images:', imageError);
      // Continue without images - not critical
    }

    return NextResponse.json({
      success: true,
      article: parsedArticle,
      merchantImages,
      rawContent: articleContent
    });

  } catch (error) {
    console.error('[API] Error generating article:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
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

  let dealDetails = `${merchant} — ${offerValue} via ${issuer}${cardName ? ` ${cardName}` : ''}`;
  
  if (minSpend) dealDetails += ` (min $${minSpend})`;
  if (maxRedemption) dealDetails += ` (max $${maxRedemption})`;
  if (expiresAt) dealDetails += ` — expires ${expiresAt}`;
  if (cashback) dealDetails += ` — stacks with ${cashback}`;
  if (promoCode) dealDetails += ` — code: ${promoCode}`;
  if (dealScore) dealDetails += ` — DealStackr Score: ${dealScore}/100`;

  const prompt = `Write a short deal brief for: ${dealDetails}

Return JSON with these keys:
- headline: Punchy, specific (50-70 chars). No generic phrases. Include the key number.
- intro: 2-3 sentences. Get to the point fast. What's the deal, what's the catch, is it good?
- vendorBackground: 2-3 sentences about ${merchant}. What they sell, price range, who shops there. Be specific—mention actual products or categories if you know them.
- valueExplanation: 3-4 sentences. Do the math. Example: "Spend $200, get $40 back—that's 20% off a new jacket." Be concrete, not abstract.
- dealMerits: 2-3 sentences. What makes this particular offer notable? Is the threshold low? The percentage high? Good timing? Or is it just okay?
- howToRedeem: 3-5 bullet points. Quick, scannable steps. No fluff.
${cashback || promoCode ? `- stackingNotes: 2-3 sentences on stacking with ${cashback || promoCode}. Be specific about order of operations.` : ''}
${expiresAt ? `- expirationNote: 1-2 sentences. When it ends and whether that matters.` : ''}

Keep total length under 400 words. Write like you're telling a friend about a deal you spotted—not like you're writing ad copy.`;

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
