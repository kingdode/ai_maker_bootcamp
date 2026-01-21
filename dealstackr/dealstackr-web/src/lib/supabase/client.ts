import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Return cached client if available
  if (client) return client;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] Missing environment variables. Auth will not work.');
    // Return a non-functional client that won't crash but auth won't work
    // This allows the page to render and show an appropriate error message
    client = createBrowserClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
    );
    return client;
  }
  
  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
