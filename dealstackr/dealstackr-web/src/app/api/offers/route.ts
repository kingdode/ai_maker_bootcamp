import { NextRequest, NextResponse } from 'next/server';
import { getOffers, getOffersByIssuer, getStackableOffers, getStats, syncOffers, clearOffers, getLastSyncInfo } from '@/lib/data';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

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

export async function POST(request: NextRequest) {
  try {
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
