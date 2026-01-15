import { createClient } from './server';

/**
 * Check if the current request is authenticated as admin
 * Returns the user if authenticated, null otherwise
 */
export async function checkAdminAuth(): Promise<{ authenticated: boolean; email?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { authenticated: false };
    }
    
    // Check if user email matches admin email
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email !== adminEmail) {
      return { authenticated: false };
    }
    
    return { authenticated: true, email: user.email };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Helper to return unauthorized response
 */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
