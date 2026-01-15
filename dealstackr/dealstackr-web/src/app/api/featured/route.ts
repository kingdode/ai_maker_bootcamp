import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedDeals, getAllFeaturedDeals, createFeaturedDeal } from '@/lib/data';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/supabase/auth-check';

// GET - Public (anyone can view featured deals)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';
  
  const deals = all ? getAllFeaturedDeals() : getFeaturedDeals();
  return NextResponse.json(deals);
}

// POST - Protected (admin only)
export async function POST(request: NextRequest) {
  // Check admin authentication
  const auth = await checkAdminAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }
  
  try {
    const body = await request.json();
    const deal = createFeaturedDeal(body);
    return NextResponse.json(deal, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
