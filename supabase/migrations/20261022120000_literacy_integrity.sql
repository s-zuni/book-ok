-- 문해력 점검 무결성 보강
--  1) 세션 토큰 일회용(nonce 소진)  2) DB 기반 호출 제한  3) 기록 위조 통로 제거  4) 채점 방식 버전·지문 스냅샷

-- 1. 진단 세션 nonce: 같은 세션 토큰으로 제출을 반복하지 못하게 한다
CREATE TABLE IF NOT EXISTS public.literacy_session_nonces (
    nonce UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.literacy_session_nonces ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon/authenticated 접근 불가. Edge Function(service role)만 사용한다.
REVOKE ALL ON public.literacy_session_nonces FROM anon, authenticated;

-- 2. 호출 제한 이벤트
CREATE TABLE IF NOT EXISTS public.literacy_rate_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bucket_key TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_literacy_rate_events_lookup
    ON public.literacy_rate_events (bucket_key, action, created_at DESC);
ALTER TABLE public.literacy_rate_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.literacy_rate_events FROM anon, authenticated;

-- 제한을 넘으면 true(차단), 아니면 이벤트를 기록하고 false.
-- 같은 키의 동시 호출을 직렬화하기 위해 advisory lock을 사용한다.
CREATE OR REPLACE FUNCTION public.literacy_rate_limit_hit(
    p_key TEXT,
    p_action TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_action || ':' || p_key, 0));

    SELECT count(*) INTO recent_count
    FROM public.literacy_rate_events
    WHERE bucket_key = p_key
      AND action = p_action
      AND created_at > NOW() - make_interval(secs => p_window_seconds);

    IF recent_count >= p_limit THEN
        RETURN TRUE;
    END IF;

    INSERT INTO public.literacy_rate_events (bucket_key, action) VALUES (p_key, p_action);

    -- 오래된 데이터 정리 (호출 시 일부만 수행해 비용을 분산)
    IF random() < 0.02 THEN
        DELETE FROM public.literacy_rate_events WHERE created_at < NOW() - INTERVAL '1 day';
        DELETE FROM public.literacy_session_nonces WHERE created_at < NOW() - INTERVAL '1 day';
    END IF;

    RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.literacy_rate_limit_hit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.literacy_rate_limit_hit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- 3. 기록 저장은 Edge Function(service role)만 수행한다: 클라이언트가 점수를 직접 INSERT하는 통로 제거
DROP POLICY IF EXISTS "Parents can insert own children assessments" ON public.literacy_assessments;

-- 4. 채점 방식 버전, 지문 스냅샷, 유창성 미산정 허용
ALTER TABLE public.literacy_assessments
    ADD COLUMN IF NOT EXISTS scoring_version SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS passage_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS session_nonce UUID;

-- 기존 기록은 이전 방식(scoring_version = 1)으로 계산된 값이다
ALTER TABLE public.literacy_assessments
    ALTER COLUMN score_fluency DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_literacy_assessments_session_nonce
    ON public.literacy_assessments (session_nonce) WHERE session_nonce IS NOT NULL;

ALTER TABLE public.literacy_assessments
    DROP CONSTRAINT IF EXISTS literacy_assessments_score_range;
ALTER TABLE public.literacy_assessments
    ADD CONSTRAINT literacy_assessments_score_range CHECK (
        score_vocabulary BETWEEN 0 AND 100
        AND score_factual BETWEEN 0 AND 100
        AND score_inferential BETWEEN 0 AND 100
        AND score_critical BETWEEN 0 AND 100
        AND (score_fluency IS NULL OR score_fluency BETWEEN 0 AND 100)
        AND total_bli_score BETWEEN 0 AND 100
    ) NOT VALID;
-- 기존 행은 검증하지 않고(NOT VALID) 새 행부터 적용한다.
