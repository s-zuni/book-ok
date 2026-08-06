import { NextResponse } from 'next/server';
import { createClient } from '@shared/lib/supabase/server'; 

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const isNative = searchParams.get('native') === 'true';

    // 💡 HTTPS Bridge: 네이티브 앱에서 요청한 경우 앱 딥링크 스킴으로 302 리다이렉트
    if (isNative && code) {
        return NextResponse.redirect(`com.bookok.kr://auth-callback?code=${encodeURIComponent(code)}`);
    }

    // Open Redirect 취약점 방지 로직: 반드시 '/' 로 시작하되, '//' 로 시작하지 않도록 검증
    let next = searchParams.get('next') ?? '/';
    if (!next.startsWith('/') || next.startsWith('//')) {
        next = '/';
    }

    if (code) {
        try {
            const supabase = await createClient(); 
            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (!error) {
                return NextResponse.redirect(`${origin}${next}`);
            }
            console.error('Auth Callback Error:', error.message);
        } catch (err) {
            console.error('Unexpected Auth Callback Error:', err);
        }
    }

    return NextResponse.redirect(`${origin}/auth/error`);
}