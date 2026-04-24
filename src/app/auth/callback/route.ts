import { NextResponse } from 'next/server';
import { createClient } from '@shared/lib/supabase/server'; 

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    
    // Open Redirect 취약점 방지 로직: 반드시 '/' 로 시작하되, '//' 로 시작하지 않도록 검증
    let next = searchParams.get('next') ?? '/';
    if (!next.startsWith('/') || next.startsWith('//')) {
        next = '/';
    }

    if (code) {
        try {
            // createClient는 비동기 함수이므로 await이 필요합니다.
            const supabase = await createClient(); 
            
            // 인증 코드를 세션(쿠키)으로 안전하게 교환
            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (!error) {
                // 교환 성공 시 원래 있던 페이지로 리다이렉트
                return NextResponse.redirect(`${origin}${next}`);
            }
            console.error('Auth Callback Error:', error.message);
        } catch (err) {
            console.error('Unexpected Auth Callback Error:', err);
        }
    }

    // 사용자에게 에러 상황을 안내하는 전용 페이지로 이동
    return NextResponse.redirect(`${origin}/auth/error`);
}