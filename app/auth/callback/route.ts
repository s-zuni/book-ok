import { createClient } from "@shared/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 리다이렉트할 경로 (기본값: 홈)
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    // 서버 사이드에서 코드를 세션으로 교환 (자동으로 쿠키 설정)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
    }
    
    console.error("Auth callback error:", error);
  }

  // 오류 발생 시 또는 코드가 없을 때 홈으로 리다이렉트
  return NextResponse.redirect(`${origin}/`);
}
