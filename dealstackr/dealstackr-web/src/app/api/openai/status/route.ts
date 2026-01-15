import { NextResponse } from 'next/server';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/supabase/auth-check';

export async function GET() {
  // Require admin authentication
  const auth = await checkAdminAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const configured = !!process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    configured,
    message: configured 
      ? 'OpenAI API key is configured' 
      : 'OpenAI API key is not configured. Set OPENAI_API_KEY environment variable.'
  });
}
