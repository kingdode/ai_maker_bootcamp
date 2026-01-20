import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedDeals, getAllFeaturedDeals, createFeaturedDeal } from '@/lib/data';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/supabase/auth-check';
import { FeaturedDealSchema, validateInput, ValidationError } from '@/lib/validation';

// GET - Public (anyone can view featured deals)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    
    const deals = all ? getAllFeaturedDeals() : getFeaturedDeals();
    return NextResponse.json(deals);
  } catch (error) {
    console.error('[API] Error in GET /api/featured:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured deals' },
      { status: 500 }
    );
  }
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
    
    // Validate featured deal data
    try {
      const validatedDeal = validateInput(FeaturedDealSchema, body);
      const deal = createFeaturedDeal(validatedDeal);
      return NextResponse.json(deal, { status: 201 });
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
  } catch (error) {
    console.error('[API] Error in POST /api/featured:', error);
    return NextResponse.json(
      { error: 'Failed to create featured deal' },
      { status: 500 }
    );
  }
}
