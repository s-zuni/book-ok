-- 문해력 점검 '낱말 퀴즈': 지문 없이 바로 풀 수 있는 어휘 문항(빈칸·비슷한말·반대말·뜻·맞춤법·다른 낱말 찾기)
--  1) literacy_questions 가 지문(passage_id)에 묶이지 않는 문항을 가질 수 있게 한다 (학년 단위)
--  2) 문항별 즉시 확인에서 '첫 답'을 서버가 고정하는 테이블

ALTER TABLE public.literacy_questions
    ALTER COLUMN passage_id DROP NOT NULL,
    ALTER COLUMN evidence DROP NOT NULL;

ALTER TABLE public.literacy_questions
    ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'passage',
    ADD COLUMN IF NOT EXISTS grade_level SMALLINT;

ALTER TABLE public.literacy_questions
    DROP CONSTRAINT IF EXISTS literacy_questions_type_shape;
ALTER TABLE public.literacy_questions
    ADD CONSTRAINT literacy_questions_type_shape CHECK (
        (question_type = 'passage'
            AND passage_id IS NOT NULL
            AND evidence IS NOT NULL)
        OR
        (question_type IN ('cloze', 'synonym', 'antonym', 'meaning', 'spelling', 'odd_one_out')
            AND passage_id IS NULL
            AND area = 'vocabulary'
            AND grade_level IS NOT NULL
            AND grade_level BETWEEN 0 AND 6)
    );

-- 학년별 낱말 문항 풀 조회용
CREATE INDEX IF NOT EXISTS idx_literacy_questions_word_pool
    ON public.literacy_questions (grade_level)
    WHERE passage_id IS NULL AND is_verified = true;

-- 같은 학년·같은 질문이 중복 저장되는 것을 막는다
CREATE UNIQUE INDEX IF NOT EXISTS uq_literacy_word_question_text
    ON public.literacy_questions (grade_level, question_type, md5(question))
    WHERE passage_id IS NULL;

-- 낱말 문항 응답: 세션(nonce)당 문항별 첫 답만 인정한다. Edge Function(service role)만 사용.
CREATE TABLE IF NOT EXISTS public.literacy_word_answers (
    nonce UUID NOT NULL,
    question_id UUID NOT NULL REFERENCES public.literacy_questions(id) ON DELETE CASCADE,
    selected SMALLINT NOT NULL CHECK (selected BETWEEN 0 AND 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (nonce, question_id)
);
ALTER TABLE public.literacy_word_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.literacy_word_answers FROM anon, authenticated;

-- 오래된 데이터 정리 대상에 낱말 응답 추가 (호출 제한 함수의 기존 정리 로직에 한 줄 추가)
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

    IF random() < 0.02 THEN
        DELETE FROM public.literacy_rate_events WHERE created_at < NOW() - INTERVAL '1 day';
        DELETE FROM public.literacy_session_nonces WHERE created_at < NOW() - INTERVAL '1 day';
        DELETE FROM public.literacy_word_answers WHERE created_at < NOW() - INTERVAL '1 day';
    END IF;

    RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.literacy_rate_limit_hit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.literacy_rate_limit_hit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
