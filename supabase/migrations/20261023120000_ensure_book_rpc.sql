-- 일반 사용자가 books 에 없는 책을 읽은 책/찜으로 저장할 수 있게 하는 등록 함수.
-- 배경: books 의 INSERT 정책은 관리자 전용이라, 클라이언트가 직접 INSERT 하면 RLS 에 막혀
--       "책 정보를 저장하지 못했어요" 로 독서 기록 저장이 실패했다.
-- 정책을 모든 사용자에게 열면 임의의 책 행을 만들 수 있으므로, 입력을 검증하는 함수로만 등록을 허용한다.
-- 이미 있는 책(bookid 일치)은 수정하지 않고 id 만 돌려준다.
CREATE OR REPLACE FUNCTION public.ensure_book(
    p_bookid TEXT,
    p_title TEXT,
    p_author TEXT DEFAULT NULL,
    p_imgsrc TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_pubdate TEXT DEFAULT NULL,
    p_publisher TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bookid TEXT := btrim(coalesce(p_bookid, ''));
    v_title TEXT := btrim(coalesce(p_title, ''));
    v_id BIGINT;
    v_new_id BIGINT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    IF v_bookid = '' OR length(v_bookid) > 64 OR v_title = '' OR length(v_title) > 300 THEN
        RAISE EXCEPTION 'invalid book' USING ERRCODE = '22023';
    END IF;

    SELECT id INTO v_id FROM public.books WHERE bookid = v_bookid;
    IF FOUND THEN
        RETURN v_id;
    END IF;

    -- 기존 데이터 규칙: 숫자 ISBN 은 id 로도 사용. 이미 쓰인 id 이거나 숫자가 아니면 시퀀스 사용
    IF v_bookid ~ '^[0-9]{1,18}$' AND NOT EXISTS (SELECT 1 FROM public.books WHERE id = v_bookid::BIGINT) THEN
        v_new_id := v_bookid::BIGINT;
    ELSE
        v_new_id := nextval(pg_get_serial_sequence('public.books', 'id'));
    END IF;

    BEGIN
        INSERT INTO public.books (id, bookid, title, author, imgsrc, category, description, "pubDate", publisher)
        VALUES (
            v_new_id,
            v_bookid,
            left(v_title, 300),
            left(coalesce(nullif(btrim(coalesce(p_author, '')), ''), '저자 미상'), 200),
            left(coalesce(p_imgsrc, ''), 1000),
            left(coalesce(nullif(btrim(coalesce(p_category, '')), ''), '기타'), 100),
            left(coalesce(p_description, ''), 5000),
            left(p_pubdate, 50),
            left(p_publisher, 200)
        )
        RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
        -- 동시 요청이 먼저 등록한 경우
        SELECT id INTO v_id FROM public.books WHERE bookid = v_bookid;
        IF NOT FOUND THEN
            RAISE;
        END IF;
    END;

    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
