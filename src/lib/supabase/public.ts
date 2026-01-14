import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase-public] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function createSupabasePublicClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Env eksikse null döndür, çağıran taraf handle etsin
    console.warn('[supabase-public] Missing env vars, returning null client');
    return null as any; // Type safety için any, ama kullanımda null check yapılacak
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch,
    },
  });
}

