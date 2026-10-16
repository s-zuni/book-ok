-- 문해력 테이블 보강: 문항 중복/형식 제약 + 진단 기록 INSERT 시 자녀 소유권 검증

-- 지문당 영역별 문항은 1개 (동시 LLM 생성 시 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS uq_literacy_questions_passage_area
    ON public.literacy_questions (passage_id, area);

ALTER TABLE public.literacy_questions
    DROP CONSTRAINT IF EXISTS literacy_questions_options_len;
ALTER TABLE public.literacy_questions
    ADD CONSTRAINT literacy_questions_options_len
    CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) = 4);

ALTER TABLE public.literacy_assessments
    DROP CONSTRAINT IF EXISTS literacy_assessments_grade_range;
ALTER TABLE public.literacy_assessments
    ADD CONSTRAINT literacy_assessments_grade_range
    CHECK (grade_level BETWEEN 0 AND 6);

-- 본인 자녀에 대한 기록만 INSERT 가능
DROP POLICY IF EXISTS "Parents can insert own children assessments" ON public.literacy_assessments;
CREATE POLICY "Parents can insert own children assessments"
    ON public.literacy_assessments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = child_id AND c.parent_id = auth.uid()
        )
    );

-- 정답 보호: 문항 테이블은 클라이언트 직접 조회를 막고 Edge Function(service role)만 접근
DROP POLICY IF EXISTS "Anyone can read verified literacy questions" ON public.literacy_questions;

-- 실제 라이선스 근거가 없는 출처 표기 정리 (자체 제작 지문)
ALTER TABLE public.literacy_passages
    ALTER COLUMN source_attribution SET DEFAULT 'Book,ok 자체 제작 지문';
UPDATE public.literacy_passages SET source_attribution = 'Book,ok 자체 제작 지문';
