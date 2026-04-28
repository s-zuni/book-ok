import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk";

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch (error) {
                        // 이 에러는 서버 컴포넌트에서 쿠키를 설정하려고 할 때 발생할 수 있습니다.
                        // 미들웨어(middleware)에서 세션을 새로고침하고 있다면 안전하게 무시할 수 있습니다.
                    }
                },
            },
        }
    );
}