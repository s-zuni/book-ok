-- 20261028_fix_analytics_security.sql
-- 1. get_admin_analytics 관리자 전용 권한 가드 적용
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
    -- [보안 가드] 관리자가 아닌 경우 즉시 차단
    IF NOT public.check_is_admin_v3() THEN
        RAISE EXCEPTION 'Forbidden: Admin access required.';
    END IF;

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
            TO_CHAR(started_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS date,
            COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS active_users,
            COUNT(*) AS sessions,
            COALESCE(ROUND(AVG(total_duration_seconds), 1), 0) AS avg_duration
        FROM public.app_sessions
        WHERE started_at >= p_start_date AND started_at <= p_end_date
        GROUP BY TO_CHAR(started_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')
        ORDER BY date ASC
    ) sub;

    -- 4. 시간대별 활동 분포 (Hourly Distribution: 0시~23시)
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_hourly_distribution
    FROM (
        SELECT 
            EXTRACT(HOUR FROM started_at AT TIME ZONE 'Asia/Seoul')::int AS hour,
            COUNT(*) AS sessions
        FROM public.app_sessions
        WHERE started_at >= p_start_date AND started_at <= p_end_date
        GROUP BY hour
        ORDER BY hour ASC
    ) sub;

    -- 5. 기기/플랫폼 분포 (Device Stats)
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_device_stats
    FROM (
        SELECT 
            platform,
            COUNT(*) AS count,
            ROUND((COUNT(*)::numeric / NULLIF(v_total_sessions, 0)::numeric) * 100, 1) AS share
        FROM public.app_sessions
        WHERE started_at >= p_start_date AND started_at <= p_end_date
        GROUP BY platform
        ORDER BY count DESC
    ) sub;

    -- 최종 반환 JSON 구조
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

-- 2. profiles 테이블 권한 상승 방지 트리거
-- service_role이 아니면 일반 사용자가 본인의 is_admin이나 role을 admin으로 임의 변경하는 것을 방지
CREATE OR REPLACE FUNCTION public.protect_profile_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- auth.role()이 'service_role'이 아닌 경우, 일반 세션에서의 role/is_admin 임의 승격 차단
    IF auth.role() <> 'service_role' THEN
        IF TG_OP = 'INSERT' THEN
            NEW.is_admin := false;
            NEW.role := 'user';
        ELSIF TG_OP = 'UPDATE' THEN
            NEW.is_admin := OLD.is_admin;
            NEW.role := OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_admin_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_admin_role
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_admin_role();
