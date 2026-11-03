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

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tffvsyarxfujmvbqlutr.supabase.co";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZnZzeWFyeGZ1am12YnFsdXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzU0OTEsImV4cCI6MjA4MjkxMTQ5MX0.7ctb_C-BJN_WTNi_yqaQllFY0oVARqsvSjQkte_M-yo";

export function createClient() {
    // In a 100% SPA static export, we do not use Next.js SSR.
    // Using @supabase/ssr creates cookie parsing issues in Capacitor or Edge runtimes without a server request context.
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: CapacitorStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: !Capacitor.isNativePlatform(),
            flowType: 'pkce',
            // Official no-op lock to prevent Web Lock deadlocks in mobile WebViews (Capacitor/iOS/Android)
            lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                return await fn();
            },
        }
    });
}

export const supabase = createClient();
