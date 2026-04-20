import { createClient } from '@supabase/supabase-js';

// Environment-aware Supabase configuration
const isBrowser = typeof window !== 'undefined';

// On client: use the /supabase proxy to hide the real URL
// On server: use the private NEXT_SUPABASE_URL
const supabaseUrl = isBrowser 
  ? '/supabase' 
  : (process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '');

// On client: retrieve the Anon Key injected via layout.tsx
// On server: use the private NEXT_SUPABASE_ANON_KEY
const supabaseAnonKey = isBrowser
  ? (window as any)._SUPABASE_ANON_KEY
  : (process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

if (!supabaseUrl || !supabaseAnonKey) {
  if (!isBrowser) {
    console.warn('Supabase credentials missing. Check environment variables.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'bookok-auth-token',
    }
});
