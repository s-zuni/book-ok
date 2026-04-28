import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 나중에 쿠키 설정 시 참조를 변경할 수 있도록 let으로 선언
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request의 쿠키를 먼저 업데이트
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // 업데이트된 request를 바탕으로 응답 객체를 재생성
          supabaseResponse = NextResponse.next({
            request,
          });
          // 응답 객체에도 쿠키를 세팅
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 만료된 경우 세션 쿠키를 새로 고칩니다.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청 경로와 일치시킵니다:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘 파일)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
};