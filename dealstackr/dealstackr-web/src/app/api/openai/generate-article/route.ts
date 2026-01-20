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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial content writer specializing in credit card rewards, cashback deals, and shopping savings strategies. Write comprehensive, well-researched editorial articles that educate consumers about credit card offers and help them maximize their savings. Your writing should be thorough, accurate, engaging, and consumer-friendly. Provide detailed explanations, real-world examples, and actionable advice. Maintain a professional yet approachable tone that builds trust with readers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
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

  prompt += `\n\nWrite a comprehensive, engaging editorial article with the following structure:

1. HEADLINE: Catchy, compelling headline (max 80 characters) that captures the deal's value

2. INTRO: 3-4 sentences introducing the deal, setting the stage for readers. Make it engaging and highlight the key benefit.

3. VENDOR BACKGROUND: 4-6 sentences about what ${merchant} is known for, their product categories, typical price points, and their target customer base. Paint a picture of the shopping experience.

4. VALUE EXPLANATION: 5-7 sentences explaining the savings in detail. Include:
   - The specific math of the savings
   - Real-world purchase scenarios
   - How much a typical shopper might save
   - Comparison to regular pricing or other offers

5. DEAL MERITS: 4-6 sentences on what makes this deal exceptional. Cover:
   - Unique aspects of this particular offer
   - Why now is a good time to take advantage
   - Who would benefit most from this deal
   - Any standout features or benefits

6. HOW TO REDEEM: Detailed step-by-step instructions (5-7 bullet points) covering:
   - Exact steps to activate the offer
   - Card requirements and enrollment process
   - Purchase requirements and timelines
   - How to track and verify the credit/cashback
   - Best practices for maximizing value

7. STACKING NOTES: ${cashback || promoCode ? '3-5 sentences on how to combine this with other offers. Include specific portal recommendations, timing strategies, and total potential savings when stacked.' : 'Skip if not applicable'}

8. EXPIRATION NOTE: ${expiresAt ? '2-3 sentences about the deadline, urgency, and recommended action timeline.' : 'Skip if not applicable'}

IMPORTANT: Write in a detailed, informative style. This should be a comprehensive guide.
Target length: 500-700 words total.
Tone: Professional yet friendly, informative without being salesy, enthusiastic about savings.

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
