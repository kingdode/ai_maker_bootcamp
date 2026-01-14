import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedDealById, updateFeaturedDeal, deleteFeaturedDeal } from '@/lib/data';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const deal = getFeaturedDealById(id);
  
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }
  
  return NextResponse.json(deal);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const deal = updateFeaturedDeal(id, body);
    
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    
    return NextResponse.json(deal);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const success = deleteFeaturedDeal(id);
  
  if (!success) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }
  
  return NextResponse.json({ success: true });
}
