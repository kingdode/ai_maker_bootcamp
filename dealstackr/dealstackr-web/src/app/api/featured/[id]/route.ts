import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedDealById, updateFeaturedDeal, deleteFeaturedDeal } from '@/lib/data';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/supabase/auth-check';
import { FeaturedDealSchema, validateInput, ValidationError } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Public (anyone can view a deal)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate ID format
    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: 'Invalid deal ID' },
        { status: 400 }
      );
    }
    
    const deal = getFeaturedDealById(id);
    
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    
    return NextResponse.json(deal);
  } catch (error) {
    console.error('[API] Error in GET /api/featured/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

// PUT - Protected (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // Check admin authentication
  const auth = await checkAdminAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }
  
  try {
    const { id } = await params;
    
    // Validate ID format
    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: 'Invalid deal ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Validate update data (partial schema)
    try {
      const validatedDeal = validateInput(FeaturedDealSchema.partial(), body);
      const deal = updateFeaturedDeal(id, validatedDeal);
      
      if (!deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      }
      
      return NextResponse.json(deal);
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
    console.error('[API] Error in PUT /api/featured/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    );
  }
}

// DELETE - Protected (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Check admin authentication
  const auth = await checkAdminAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }
  
  try {
    const { id } = await params;
    
    // Validate ID format
    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: 'Invalid deal ID' },
        { status: 400 }
      );
    }
    
    const success = deleteFeaturedDeal(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error in DELETE /api/featured/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete deal' },
      { status: 500 }
    );
  }
}
