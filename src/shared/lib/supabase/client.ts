import { createBrowserClient } from '@supabase/ssr';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const CapacitorStorage = {
    getItem: async (key: string): Promise<string | null> => {
        if (Capacitor.isNativePlatform()) {
            const { value } = await Preferences.get({ key });
            return value;
        }
        return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (Capacitor.isNativePlatform()) {
            await Preferences.set({ key, value });
        } else if (typeof window !== 'undefined') {
            localStorage.setItem(key, value);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        if (Capacitor.isNativePlatform()) {
            await Preferences.remove({ key });
        } else if (typeof window !== 'undefined') {
            localStorage.removeItem(key);
        }
    },
};

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk";
    
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: CapacitorStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        }
    });
}

export const supabase = createClient();
