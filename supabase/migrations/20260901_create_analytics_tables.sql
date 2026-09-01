-- Migration: Create Analytics & Stay Time Tracking Tables
-- Date: 2026-09-01

-- 1. app_sessions: 전체 앱 접속 및 세션별 총 체류시간 기록 테이블
CREATE TABLE IF NOT EXISTS public.app_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    anonymous_id TEXT,
    device_type TEXT DEFAULT 'desktop_web',
    total_duration_seconds INTEGER DEFAULT 0,
    page_count INTEGER DEFAULT 1,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_started_at ON public.app_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_app_sessions_last_active ON public.app_sessions(last_active_at);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON public.app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_anon_id ON public.app_sessions(anonymous_id);

-- 2. service_usage_logs: 각 서비스/페이지별 방문 및 체류시간 기록 테이블
CREATE TABLE IF NOT EXISTS public.service_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT REFERENCES public.app_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    service_key TEXT NOT NULL,
    service_name TEXT NOT NULL,
    path TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    device_type TEXT DEFAULT 'desktop_web',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_usage_logs_service_key ON public.service_usage_logs(service_key);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_started_at ON public.service_usage_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_session_id ON public.service_usage_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_user_id ON public.service_usage_logs(user_id);

-- 3. RLS 활성화 및 정책 구성
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_usage_logs ENABLE ROW LEVEL SECURITY;

-- app_sessions: 누구나(비회원/회원) 세션 생성 및 갱신 가능
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.app_sessions;
CREATE POLICY "Anyone can insert sessions" ON public.app_sessions
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update own sessions" ON public.app_sessions;
CREATE POLICY "Anyone can update own sessions" ON public.app_sessions
    FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can select sessions" ON public.app_sessions;
CREATE POLICY "Admins can select sessions" ON public.app_sessions
    FOR SELECT TO public USING (
        check_is_admin_v3() OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    );

-- service_usage_logs: 누구나 서비스 이용 로그 기록 및 갱신 가능
DROP POLICY IF EXISTS "Anyone can insert service logs" ON public.service_usage_logs;
CREATE POLICY "Anyone can insert service logs" ON public.service_usage_logs
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update service logs" ON public.service_usage_logs;
CREATE POLICY "Anyone can update service logs" ON public.service_usage_logs
    FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can select service logs" ON public.service_usage_logs;
CREATE POLICY "Admins can select service logs" ON public.service_usage_logs
    FOR SELECT TO public USING (
        check_is_admin_v3() OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    );

-- 4. 고속 집계 RPC 함수: get_admin_analytics
CREATE OR REPLACE FUNCTION public.get_admin_analytics(
    p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '7 days'),
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_duration BIGINT;
    v_avg_duration NUMERIC;
    v_total_sessions BIGINT;
    v_unique_users BIGINT;
    v_active_now BIGINT;
    v_service_stats JSONB;
    v_daily_trends JSONB;
    v_hourly_distribution JSONB;
    v_device_stats JSONB;
BEGIN
    -- 1. 전체 개요 지표
    SELECT 
        COALESCE(SUM(total_duration_seconds), 0),
        COALESCE(ROUND(AVG(total_duration_seconds), 1), 0),
        COUNT(*),
        COUNT(DISTINCT COALESCE(user_id::text, anonymous_id))
    INTO 
        v_total_duration,
        v_avg_duration,
        v_total_sessions,
        v_unique_users
    FROM public.app_sessions
    WHERE started_at >= p_start_date AND started_at <= p_end_date;

    -- 실시간 활성 사용자 (최근 5분 이내 활동)
    SELECT COUNT(DISTINCT COALESCE(user_id::text, anonymous_id))
    INTO v_active_now
    FROM public.app_sessions
    WHERE last_active_at >= (NOW() - INTERVAL '5 minutes');

    -- 2. 서비스별 상세 통계
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_service_stats
    FROM (
        SELECT 
            service_key,
            service_name,
            COALESCE(SUM(duration_seconds), 0) AS total_duration,
            COALESCE(ROUND(AVG(duration_seconds), 1), 0) AS avg_duration,
            COUNT(DISTINCT COALESCE(user_id::text, session_id)) AS unique_users,
            COUNT(*) AS visit_count,
            CASE 
                WHEN v_total_duration > 0 THEN 
                    ROUND((COALESCE(SUM(duration_seconds), 0)::numeric / v_total_duration::numeric) * 100, 1)
                ELSE 0 
            END AS duration_share
        FROM public.service_usage_logs
        WHERE started_at >= p_start_date AND started_at <= p_end_date
        GROUP BY service_key, service_name
        ORDER BY total_duration DESC
    ) sub;

    -- 3. 일자별 추이 (Daily Trends)
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_daily_trends
    FROM (
        SELECT 
            TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(s.total_duration_seconds), 0) AS total_duration,
            COALESCE(ROUND(AVG(s.total_duration_seconds), 1), 0) AS avg_duration,
            COUNT(s.id) AS session_count,
            COUNT(DISTINCT COALESCE(s.user_id::text, s.anonymous_id)) AS unique_users
        FROM generate_series(DATE_TRUNC('day', p_start_date), DATE_TRUNC('day', p_end_date), '1 day'::interval) d(day)
        LEFT JOIN public.app_sessions s 
            ON DATE_TRUNC('day', s.started_at) = d.day
        GROUP BY d.day
        ORDER BY d.day ASC
    ) sub;

    -- 4. 시간대별 활동 분포 (0시 ~ 23시)
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_hourly_distribution
    FROM (
        SELECT 
            h.hour,
            COUNT(s.id) AS session_count,
            COALESCE(SUM(s.total_duration_seconds), 0) AS total_duration
        FROM generate_series(0, 23) h(hour)
        LEFT JOIN public.app_sessions s 
            ON EXTRACT(HOUR FROM s.started_at) = h.hour
            AND s.started_at >= p_start_date AND s.started_at <= p_end_date
        GROUP BY h.hour
        ORDER BY h.hour ASC
    ) sub;

    -- 5. 디바이스/환경별 점유율
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_device_stats
    FROM (
        SELECT 
            COALESCE(device_type, 'desktop_web') AS device_type,
            COUNT(*) AS session_count,
            COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS unique_users,
            COALESCE(SUM(total_duration_seconds), 0) AS total_duration
        FROM public.app_sessions
        WHERE started_at >= p_start_date AND started_at <= p_end_date
        GROUP BY device_type
        ORDER BY session_count DESC
    ) sub;

    RETURN jsonb_build_object(
        'overview', jsonb_build_object(
            'total_duration_seconds', v_total_duration,
            'avg_duration_seconds', v_avg_duration,
            'total_sessions', v_total_sessions,
            'unique_users', v_unique_users,
            'active_now', v_active_now
        ),
        'service_stats', v_service_stats,
        'daily_trends', v_daily_trends,
        'hourly_distribution', v_hourly_distribution,
        'device_stats', v_device_stats
    );
END;
$$;

