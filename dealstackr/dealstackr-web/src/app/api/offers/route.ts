import { NextRequest, NextResponse } from 'next/server';
import { getOffers, getOffersByIssuer, getStackableOffers, getStats, syncOffers, clearOffers, getLastSyncInfo } from '@/lib/data';
import { checkAdminAuth } from '@/lib/supabase/auth-check';
import { OffersArraySchema, validateInput, ValidationError, validateApiKey, timingSafeCompare } from '@/lib/validation';
import { getCorsHeaders, getPreflightHeaders } from '@/lib/cors';
import { checkRateLimit, getClientIdentifier, createRateLimitHeaders } from '@/lib/rateLimit';

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
  
  // Rate limiting for GET requests (more lenient)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { 
    maxRequests: 200,  // 200 requests per 15 minutes for reads
    windowSeconds: 900 
  });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429, 
        headers: { ...corsHeaders, ...createRateLimitHeaders(rateLimit) }
      }
    );
  }
  
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
    
    return NextResponse.json(await getOffers(), { 
      headers: { ...corsHeaders, ...createRateLimitHeaders(rateLimit) }
    });
  } catch (error) {
    console.error('[API] Error in GET /api/offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - PUBLIC for offer sync (rate limited), Admin-only for clear action
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Rate limiting for POST requests
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`post:${clientId}`, { 
    maxRequests: 30,   // 30 requests per 15 minutes for public writes
    windowSeconds: 900 
  });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many sync requests. Please try again later.' },
      { 
        status: 429, 
        headers: { ...corsHeaders, ...createRateLimitHeaders(rateLimit) }
      }
    );
  }
  
  // Check request size limit (max 1MB)
  const contentLength = request.headers.get('content-length');
  const MAX_BODY_SIZE = 1024 * 1024; // 1MB
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: 'Request body too large. Maximum 1MB allowed.' },
      { status: 413, headers: corsHeaders }
    );
  }
  
  try {
    const body = await request.json();
    
    // Handle clear action - ADMIN ONLY with confirmation
    if (body.action === 'clear') {
      // Check for API key or admin auth for destructive actions
      const apiKey = request.headers.get('x-sync-api-key');
      let isAdmin = false;
      
      if (apiKey && SYNC_API_KEY && timingSafeCompare(apiKey, SYNC_API_KEY)) {
        isAdmin = true;
      } else {
        const auth = await checkAdminAuth();
        isAdmin = auth.authenticated;
      }
      
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin access required to clear offers.' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      // Require explicit confirmation
      if (body.confirm !== 'DELETE_ALL_OFFERS') {
        return NextResponse.json(
          { error: 'Confirmation required. Set confirm: "DELETE_ALL_OFFERS" to proceed.' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Log the deletion for audit trail
      console.warn('[SECURITY] Clearing all offers - requested by admin');
      
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
    
    // Limit number of offers per request (max 500)
    const MAX_OFFERS_PER_REQUEST = 500;
    if (offersData.length > MAX_OFFERS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many offers. Maximum ${MAX_OFFERS_PER_REQUEST} per request.` },
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
