import { createClient } from '@supabase/supabase-js';

// Environment-aware Supabase configuration
const isBrowser = typeof window !== 'undefined';

// Use a getter or a robust value to prevent crashes during module initialization
const getSupabaseConfig = () => {
  if (isBrowser) {
    // On client: retrieve the Anon Key injected via layout.tsx
    // Origin is combined with /supabase to satisfy absolute URL requirement of the SDK
    const anonKey = (window as any)._SUPABASE_ANON_KEY || "";
    const url = `${window.location.origin}/supabase`;
    return { url, anonKey };
  } else {
    // On server: use private environment variables
    const url = process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anonKey = process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    return { url, anonKey };
  }
};

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig();

// Prevent createClient from crashing if URL is empty by providing a dummy but valid-format URL
const safeUrl = supabaseUrl || "https://placeholder-domain.supabase.co";
const safeKey = supabaseAnonKey || "placeholder-key";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase configuration is partial or missing. Check env vars or layout.tsx injection.");
}

export const supabase = createClient(safeUrl, safeKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'bookok-auth-token',
        flowType: 'pkce', // Explicitly use PKCE for better Next.js compatibility
    }
});
