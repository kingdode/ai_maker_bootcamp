import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Check if user is allowed
      const { data: { user } } = await supabase.auth.getUser();
      const allowedEmail = process.env.ADMIN_EMAIL;
      
      if (allowedEmail && user?.email !== allowedEmail) {
        // User not allowed - sign them out and redirect with error
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/admin/login?error=AccessDenied`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/admin/login?error=AuthError`);
}
