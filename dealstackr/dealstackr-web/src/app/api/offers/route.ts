import { NextRequest, NextResponse } from 'next/server';
import { getOffers, getOffersByIssuer, getStackableOffers, getStats, syncOffers, clearOffers, getLastSyncInfo } from '@/lib/data';
import { checkAdminAuth } from '@/lib/supabase/auth-check';

// Simple API key for Chrome extension sync (prevents random abuse)
const SYNC_API_KEY = process.env.SYNC_API_KEY || 'dealstackr-sync-2024';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Sync-API-Key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET - Public (anyone can view offers)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const issuer = searchParams.get('issuer') as 'Chase' | 'Amex' | null;
  const stackable = searchParams.get('stackable') === 'true';
  const stats = searchParams.get('stats') === 'true';
  const syncInfo = searchParams.get('syncInfo') === 'true';
  
  if (syncInfo) {
    return NextResponse.json(getLastSyncInfo(), { headers: corsHeaders });
  }
  
  if (stats) {
    return NextResponse.json(getStats(), { headers: corsHeaders });
  }
  
  if (stackable) {
    return NextResponse.json(getStackableOffers(), { headers: corsHeaders });
  }
  
  if (issuer) {
    return NextResponse.json(getOffersByIssuer(issuer), { headers: corsHeaders });
  }
  
  return NextResponse.json(getOffers(), { headers: corsHeaders });
}

// POST - Protected with sync API key (for Chrome extension)
export async function POST(request: NextRequest) {
  try {
    // Check for sync API key
    const apiKey = request.headers.get('x-sync-api-key');
    if (apiKey !== SYNC_API_KEY) {
      // Also allow if user is authenticated as admin
      const auth = await checkAdminAuth();
      if (!auth.authenticated) {
        return NextResponse.json(
          { error: 'Invalid sync key. Add x-sync-api-key header.' },
          { status: 401, headers: corsHeaders }
        );
      }
    }
    
    const body = await request.json();
    
    // Handle clear action
    if (body.action === 'clear') {
      clearOffers();
      return NextResponse.json({ success: true, message: 'All offers cleared' }, { headers: corsHeaders });
    }
    
    // Handle sync
    if (Array.isArray(body.offers || body)) {
      const offers = body.offers || body;
      const result = syncOffers(offers);
      return NextResponse.json(result, { headers: corsHeaders });
    }
    
    return NextResponse.json({ error: 'Expected array of offers or action' }, { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('Error in POST /api/offers:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }
}
