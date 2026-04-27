import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Environment-aware Supabase configuration
const isBrowser = typeof window !== 'undefined';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tffvsyarxfujmvbqlutr.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client-side instance using @supabase/ssr for cookie synchronization
// Server-side instance uses plain supabase-js if needed (though createClient from @shared/lib/supabase/server is preferred)
export const supabase = isBrowser 
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false, // Server-side plain client shouldn't persist to local storage
        }
    });
