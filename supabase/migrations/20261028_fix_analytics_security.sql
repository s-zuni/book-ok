-- 20261028_fix_analytics_security.sql
-- 1. get_admin_analytics: 운영 DB의 현재 정의에 '관리자 전용 권한 가드'만 추가한다.
CREATE OR REPLACE FUNCTION public.get_admin_analytics(p_start_date timestamp with time zone DEFAULT (now() - '7 days'::interval), p_end_date timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- 2. profiles 권한 상승 방지: 기존 tr_protect_profile_admin 트리거 함수가 is_admin 만 보호하고 있어
--    role 컬럼을 'admin' 으로 직접 바꿔 관리자가 될 수 있었다(check_is_admin_v3 는 role='admin' 도 관리자로 본다).
--    is_admin 과 role 변경을 모두 'service_role 또는 기존 관리자'에게만 허용한다.
CREATE OR REPLACE FUNCTION public.protect_profile_admin_field()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) OR (NEW.role IS DISTINCT FROM OLD.role) THEN
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
      ) THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can update admin privileges.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
