-- 1. pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 문해력 지문 테이블 (Knowledge Base)
CREATE TABLE IF NOT EXISTS public.literacy_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 0 AND 6), -- 0: 유아(5~6세), 1~6: 초등 1~6학년
    genre TEXT NOT NULL,                -- '동화', '과학', '역사', '사회', '철학', '자연'
    interest_tags TEXT[] DEFAULT '{}',  -- ['science', 'animal', 'friendship' 등]
    word_count INTEGER NOT NULL,        -- 어절 수 (WPM 계산 기준)
    char_count INTEGER NOT NULL,        -- 글자 수
    source_attribution TEXT DEFAULT '공공누리 제1유형 · 국립국어원 한국어기초사전 등급 어휘 연계',
    key_vocabularies JSONB DEFAULT '[]'::jsonb, -- [{"word": "호기심", "meaning": "새롭고 신기한 것을 좋아하는 마음", "level": "초등1"}]
    embedding VECTOR(1536),             -- OpenAI text-embedding-3-small
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_literacy_passages_embedding 
    ON public.literacy_passages USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_literacy_passages_grade_genre 
    ON public.literacy_passages (grade_level, genre) WHERE is_active = true;

ALTER TABLE public.literacy_passages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active literacy passages" ON public.literacy_passages;
CREATE POLICY "Anyone can read active literacy passages"
    ON public.literacy_passages FOR SELECT
    USING (is_active = true);

-- 3. 문해력 문항 테이블 (LangChain Generator + Critic 검수 완료 문항)
CREATE TABLE IF NOT EXISTS public.literacy_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passage_id UUID NOT NULL REFERENCES public.literacy_passages(id) ON DELETE CASCADE,
    area TEXT NOT NULL CHECK (area IN ('vocabulary', 'factual', 'inferential', 'critical')),
    question TEXT NOT NULL,
    options JSONB NOT NULL,             -- ["보기1", "보기2", "보기3", "보기4"]
    correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
    evidence TEXT NOT NULL,             -- 지문 내 근거 문장 (하이라이팅용)
    explanation TEXT NOT NULL,          -- 아이/학부모 맞춤형 해설
    critic_score INTEGER DEFAULT 100,   -- Critic Agent 검수 점수
    is_verified BOOLEAN DEFAULT true,   -- 무결성 검수 통과 여부
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_literacy_questions_passage 
    ON public.literacy_questions (passage_id) WHERE is_verified = true;

ALTER TABLE public.literacy_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read verified literacy questions" ON public.literacy_questions;
CREATE POLICY "Anyone can read verified literacy questions"
    ON public.literacy_questions FOR SELECT
    USING (is_verified = true);

-- 4. 아동별 문해력 진단 결과 및 처방 기록 테이블 (RLS 적용)
CREATE TABLE IF NOT EXISTS public.literacy_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    child_id BIGINT NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    passage_id UUID NOT NULL REFERENCES public.literacy_passages(id) ON DELETE RESTRICT,
    grade_level INTEGER NOT NULL,
    
    -- 측정 원시 데이터
    reading_time_seconds INTEGER NOT NULL,
    raw_wpm NUMERIC(6,2) NOT NULL,
    effective_wpm NUMERIC(6,2) NOT NULL,
    answers JSONB NOT NULL,             -- [{"question_id": "...", "area": "vocabulary", "selected": 2, "is_correct": true, "time_spent_sec": 12}]
    
    -- 5각형 영역별 점수 (0 ~ 100)
    score_vocabulary INTEGER NOT NULL,
    score_factual INTEGER NOT NULL,
    score_inferential INTEGER NOT NULL,
    score_critical INTEGER NOT NULL,
    score_fluency INTEGER NOT NULL,
    total_bli_score INTEGER NOT NULL,   -- 종합 문해력 지수 (0 ~ 100)
    bli_tier TEXT NOT NULL,             -- 예: '씨앗 독서가', '새싹 독서가', '나무 독서가', '숲 독서가'
    
    -- AI 진단 총평 및 처방 도서
    weakest_area TEXT NOT NULL,
    strength_area TEXT NOT NULL,
    ai_diagnosis_summary TEXT NOT NULL, -- 학부모용 맞춤 코칭 리포트
    prescribed_keywords TEXT[] DEFAULT '{}',
    prescribed_books JSONB DEFAULT '[]'::jsonb, -- 처방된 도서 3권 스냅샷 (Book 타입 배열)
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_literacy_assessments_child_created
    ON public.literacy_assessments (child_id, created_at DESC);

ALTER TABLE public.literacy_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view own children assessments" ON public.literacy_assessments;
CREATE POLICY "Parents can view own children assessments"
    ON public.literacy_assessments FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Parents can insert own children assessments" ON public.literacy_assessments;
CREATE POLICY "Parents can insert own children assessments"
    ON public.literacy_assessments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Parents can delete own children assessments" ON public.literacy_assessments;
CREATE POLICY "Parents can delete own children assessments"
    ON public.literacy_assessments FOR DELETE
    USING (auth.uid() = user_id);

-- 5. pgvector 하이브리드 검색 RPC 함수
CREATE OR REPLACE FUNCTION public.match_literacy_passage(
    query_embedding VECTOR(1536),
    target_grade INTEGER,
    excluded_passage_ids UUID[] DEFAULT '{}',
    match_count INTEGER DEFAULT 1
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    grade_level INTEGER,
    genre TEXT,
    interest_tags TEXT[],
    word_count INTEGER,
    char_count INTEGER,
    source_attribution TEXT,
    key_vocabularies JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lp.id,
        lp.title,
        lp.content,
        lp.grade_level,
        lp.genre,
        lp.interest_tags,
        lp.word_count,
        lp.char_count,
        lp.source_attribution,
        lp.key_vocabularies,
        CASE
            WHEN lp.embedding IS NOT NULL AND query_embedding IS NOT NULL
            THEN 1 - (lp.embedding <=> query_embedding)
            ELSE 0.5
        END AS similarity
    FROM public.literacy_passages lp
    WHERE lp.is_active = true
      AND lp.grade_level = target_grade
      AND NOT (lp.id = ANY(excluded_passage_ids))
    ORDER BY
        CASE
            WHEN lp.embedding IS NOT NULL AND query_embedding IS NOT NULL
            THEN lp.embedding <=> query_embedding
            ELSE random()
        END
    LIMIT match_count;
END;
$$;

