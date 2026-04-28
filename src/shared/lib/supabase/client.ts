import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk";
    
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
