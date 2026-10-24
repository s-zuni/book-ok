-- 지문당 영역별 문항을 여러 개 둘 수 있도록 (passage_id, area) 유니크를 (passage_id, area, item_order)로 확장
-- item_order: 같은 영역 안에서의 순서(0부터). 기존 문항은 모두 0이다.

ALTER TABLE public.literacy_questions
    ADD COLUMN IF NOT EXISTS item_order SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE public.literacy_questions
    DROP CONSTRAINT IF EXISTS literacy_questions_item_order_range;
ALTER TABLE public.literacy_questions
    ADD CONSTRAINT literacy_questions_item_order_range CHECK (item_order BETWEEN 0 AND 19);

DROP INDEX IF EXISTS public.uq_literacy_questions_passage_area;

-- 동시 요청으로 같은 문항이 중복 저장되는 것은 계속 막는다
CREATE UNIQUE INDEX IF NOT EXISTS uq_literacy_questions_passage_area_order
    ON public.literacy_questions (passage_id, area, item_order);
