import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/supabase/auth-check';

export async function POST(request: NextRequest) {
  // Require admin authentication (this endpoint is called by generate-article)
  const auth = await checkAdminAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const { merchant } = await request.json();

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant name is required' },
        { status: 400 }
      );
    }

    // Use Unsplash API for product images (free tier available)
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!unsplashAccessKey) {
      // Return placeholder images if Unsplash not configured
      return NextResponse.json({
        success: true,
        images: generatePlaceholderImages(merchant)
      });
    }
    
    try {
      const searchQuery = encodeURIComponent(`${merchant} products lifestyle`);
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=3&orientation=landscape`;
      
      const response = await fetch(unsplashUrl, {
        headers: {
          'Authorization': `Client-ID ${unsplashAccessKey}`
        }
      });

      if (!response.ok) {
        // Fallback to placeholder images if Unsplash fails
        return NextResponse.json({
          success: true,
          images: generatePlaceholderImages(merchant)
        });
      }

      const data = await response.json();
      
      const images = data.results?.slice(0, 3).map((photo: { 
        urls: { regular: string }; 
        description?: string; 
        user: { name: string } 
      }) => ({
        url: photo.urls.regular,
        alt: `${merchant} ${photo.description || 'product'}`,
        source: `Photo by ${photo.user.name} on Unsplash`
      })) || generatePlaceholderImages(merchant);

      return NextResponse.json({
        success: true,
        images
      });

    } catch (fetchError) {
      console.error('Error fetching from Unsplash:', fetchError);
      // Return placeholder images as fallback
      return NextResponse.json({
        success: true,
        images: generatePlaceholderImages(merchant)
      });
    }

  } catch (error) {
    console.error('Error in fetch-images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// Generate placeholder images using a placeholder service
function generatePlaceholderImages(merchant: string): Array<{ url: string; alt: string; source?: string }> {
  return [
    {
      url: `https://placehold.co/800x400/4f46e5/ffffff?text=${encodeURIComponent(merchant)}`,
      alt: `${merchant} brand image`,
      source: 'Placeholder'
    },
    {
      url: `https://placehold.co/800x400/6366f1/ffffff?text=${encodeURIComponent(merchant + ' Products')}`,
      alt: `${merchant} products`,
      source: 'Placeholder'
    },
    {
      url: `https://placehold.co/800x400/818cf8/ffffff?text=${encodeURIComponent(merchant + ' Lifestyle')}`,
      alt: `${merchant} lifestyle`,
      source: 'Placeholder'
    }
  ];
}
