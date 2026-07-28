import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const CapacitorStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            if (Capacitor.isNativePlatform()) {
                const { value } = await Preferences.get({ key });
                return value;
            }
            return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        } catch (err) {
            console.error("CapacitorStorage getItem error:", err);
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            if (Capacitor.isNativePlatform()) {
                await Preferences.set({ key, value });
            } else if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
        } catch (err) {
            console.error("CapacitorStorage setItem error:", err);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            if (Capacitor.isNativePlatform()) {
                await Preferences.remove({ key });
            } else if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch (err) {
            console.error("CapacitorStorage removeItem error:", err);
        }
    },
};

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk";
    
    if (Capacitor.isNativePlatform()) {
        // On native platforms (Capacitor), we do not need SSR cookie sync,
        // so we use the standard supabase-js client to prevent cookies hanging or security errors in WebView.
        return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: CapacitorStorage,
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false, // Turn off URL parsing as deep links are handled manually in AuthContext
            }
        });
    } else {
        // On web, we use @supabase/ssr's createBrowserClient to support Next.js middleware and cookie sync.
        return createBrowserClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: CapacitorStorage,
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            }
        });
    }
}

export const supabase = createClient();
