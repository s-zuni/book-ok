import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Environment-aware Supabase configuration
const isBrowser = typeof window !== 'undefined';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk";

// Client-side instance using @supabase/ssr for cookie synchronization
// Server-side instance uses plain supabase-js if needed (though createClient from @shared/lib/supabase/server is preferred)
export const supabase = isBrowser 
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false, // Server-side plain client shouldn't persist to local storage
        }
    });
