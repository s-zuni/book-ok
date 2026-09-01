import { supabase } from "@shared/lib/supabase";
import { Capacitor } from "@capacitor/core";

export interface ServiceMeta {
    key: string;
    name: string;
}

// 경로별 서비스 매핑
export function getServiceInfo(pathname: string): ServiceMeta | null {
    if (!pathname) return null;
    
    // 관리자 페이지는 일반 사용자 서비스 통계에서 제외
    if (pathname.startsWith('/admin')) {
        return null;
    }

    if (pathname === '/') {
        return { key: 'home', name: '홈 피드' };
    }
    if (pathname.startsWith('/chat')) {
        return { key: 'chat', name: 'AI 독서 챗봇(콕이)' };
    }
    if (pathname.startsWith('/book')) {
        return { key: 'book', name: '도서 탐색 및 상세' };
    }
    if (pathname.startsWith('/search')) {
        return { key: 'search', name: '통합 도서 검색' };
    }
    if (pathname.startsWith('/solution')) {
        return { key: 'solution', name: '독서 진단 및 맞춤 솔루션' };
    }
    if (pathname.startsWith('/community')) {
        return { key: 'community', name: '커뮤니티' };
    }
    if (pathname.startsWith('/mypage')) {
        return { key: 'mypage', name: '마이페이지 & 자녀 관리' };
    }
    if (pathname.startsWith('/intro') || pathname.startsWith('/landing')) {
        return { key: 'landing', name: '온보딩 및 소개' };
    }

    return { key: 'other', name: '기타 페이지' };
}

// 클라이언트 디바이스 환경 감지
export function getDeviceType(): string {
    if (typeof window === 'undefined') return 'desktop_web';
    
    if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') return 'ios';
        if (platform === 'android') return 'android';
        return 'native_app';
    }

    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua);
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(ua);

    if (isMobile) return 'mobile_web';
    if (isTablet) return 'tablet_web';
    return 'desktop_web';
}

// 브라우저/기기 식별용 익명 ID
export function getOrCreateAnonymousId(): string {
    if (typeof window === 'undefined') return 'server';
    const KEY = 'bookok_anon_id';
    let anonId = localStorage.getItem(KEY);
    if (!anonId) {
        anonId = 'anon_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        localStorage.setItem(KEY, anonId);
    }
    return anonId;
}

// 앱 세션 ID (브라우저 탭 세션 단위)
export function getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    const KEY = 'bookok_session_id';
    let sessId = sessionStorage.getItem(KEY);
    if (!sessId) {
        sessId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        sessionStorage.setItem(KEY, sessId);
    }
    return sessId;
}

// 세션 생성 또는 갱신
export async function touchSession(userId: string | null = null): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const sessionId = getOrCreateSessionId();
        const anonymousId = getOrCreateAnonymousId();
        const deviceType = getDeviceType();

        // 세션 초기화 또는 last_active_at 갱신
        const { error } = await supabase
            .from('app_sessions')
            .upsert({
                id: sessionId,
                user_id: userId || null,
                anonymous_id: anonymousId,
                device_type: deviceType,
                last_active_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) {
            // 에러 무시 (사용자 UX 방해 금지)
        }
    } catch {
        // Safe fail
    }
}

// 서비스 체류시간 기록
export async function recordServiceStay(
    service: ServiceMeta,
    path: string,
    durationSeconds: number,
    userId: string | null = null
): Promise<void> {
    if (typeof window === 'undefined' || durationSeconds <= 0) return;

    try {
        const sessionId = getOrCreateSessionId();
        const deviceType = getDeviceType();

        // 1. service_usage_logs 기록
        await supabase
            .from('service_usage_logs')
            .insert({
                session_id: sessionId,
                user_id: userId || null,
                service_key: service.key,
                service_name: service.name,
                path: path,
                duration_seconds: Math.max(1, Math.round(durationSeconds)),
                device_type: deviceType,
                started_at: new Date(Date.now() - durationSeconds * 1000).toISOString(),
                ended_at: new Date().toISOString()
            });

        // 2. app_sessions 누적 시간 및 last_active_at 갱신
        // DB RPC 호출 또는 raw 쿼리 대신 현재 세션의 기존 duration을 조회 후 누적
        const { data: currentSession } = await supabase
            .from('app_sessions')
            .select('total_duration_seconds, page_count')
            .eq('id', sessionId)
            .maybeSingle();

        const currentTotal = (currentSession?.total_duration_seconds || 0) + Math.round(durationSeconds);
        const currentPageCount = (currentSession?.page_count || 1) + 1;

        await supabase
            .from('app_sessions')
            .upsert({
                id: sessionId,
                user_id: userId || null,
                anonymous_id: getOrCreateAnonymousId(),
                device_type: deviceType,
                total_duration_seconds: currentTotal,
                page_count: currentPageCount,
                last_active_at: new Date().toISOString()
            }, { onConflict: 'id' });

    } catch (err) {
        console.warn('Analytics stay log error:', err);
    }
}

