import { NextRequest, NextResponse } from 'next/server';
import { getOffersAsync as getOffers, getOffersByIssuer, getStackableOffers, getStats, syncOffers, clearOffers, getLastSyncInfo } from '@/lib/data';
import { checkAdminAuth } from '@/lib/supabase/auth-check';
import { OffersArraySchema, validateInput, ValidationError, validateApiKey } from '@/lib/validation';
import { getCorsHeaders, getPreflightHeaders } from '@/lib/cors';

// API key for Chrome extension sync
// IMPORTANT: Set SYNC_API_KEY in environment variables to a secure random value
// Generate with: openssl rand -hex 32
const SYNC_API_KEY = process.env.SYNC_API_KEY;

// Validate API key is properly configured at runtime (not build time)
function checkApiKeyAtRuntime() {
  if (!SYNC_API_KEY || !validateApiKey(SYNC_API_KEY)) {
    console.error('[SECURITY] SYNC_API_KEY is not set or is insecure! Generate with: openssl rand -hex 32');
    return false;
  }
  return true;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = getPreflightHeaders(origin);
  return NextResponse.json({}, { headers });
}

// GET - Public (anyone can view offers)
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  try {
    const { searchParams } = new URL(request.url);
    const issuer = searchParams.get('issuer') as 'Chase' | 'Amex' | null;
    const stackable = searchParams.get('stackable') === 'true';
    const stats = searchParams.get('stats') === 'true';
    const syncInfo = searchParams.get('syncInfo') === 'true';
    
    // Validate issuer parameter if provided
    if (issuer && !['Chase', 'Amex'].includes(issuer)) {
      return NextResponse.json(
        { error: 'Invalid issuer. Must be "Chase" or "Amex"' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (syncInfo) {
      return NextResponse.json(await getLastSyncInfo(), { headers: corsHeaders });
    }
    
    if (stats) {
      return NextResponse.json(await getStats(), { headers: corsHeaders });
    }
    
    if (stackable) {
      return NextResponse.json(await getStackableOffers(), { headers: corsHeaders });
    }
    
    if (issuer) {
      return NextResponse.json(await getOffersByIssuer(issuer), { headers: corsHeaders });
    }
    
    return NextResponse.json(await getOffers(), { headers: corsHeaders });
  } catch (error) {
    console.error('[API] Error in GET /api/offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Protected with sync API key (for Chrome extension)
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Runtime API key validation
  if (!checkApiKeyAtRuntime()) {
    return NextResponse.json(
      { error: 'Server configuration error. Please contact administrator.' },
      { status: 503, headers: corsHeaders }
    );
  }
  
  try {
    // Check for sync API key
    const apiKey = request.headers.get('x-sync-api-key');
    
    // Validate API key OR check admin authentication
    let isAuthorized = false;
    
    if (apiKey === SYNC_API_KEY && SYNC_API_KEY) {
      isAuthorized = true;
    } else {
      // Fallback: check if user is authenticated as admin
      const auth = await checkAdminAuth();
      isAuthorized = auth.authenticated;
    }
    
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid X-Sync-API-Key header or admin authentication required.' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const body = await request.json();
    
    // Handle clear action
    if (body.action === 'clear') {
      await clearOffers();
      return NextResponse.json(
        { success: true, message: 'All offers cleared' },
        { headers: corsHeaders }
      );
    }
    
    // Handle sync with validation
    const offersData = body.offers || body;
    
    if (!Array.isArray(offersData)) {
      return NextResponse.json(
        { error: 'Expected array of offers' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate offers array
    try {
      const validatedOffers = validateInput(OffersArraySchema, offersData);
      const result = await syncOffers(validatedOffers);
      return NextResponse.json(result, { headers: corsHeaders });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400, headers: corsHeaders }
        );
      }
      throw error;
    }
    
  } catch (error) {
    console.error('[API] Error in POST /api/offers:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500, headers: corsHeaders }
    );
  }
}
