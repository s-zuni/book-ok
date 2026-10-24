-- 홈 "오늘의 독서 챌린지"는 책 마스터(books)와 연결되지 않는 직접 입력 기록(제목·소감은 observation_data)이라
-- book_id 없이 저장된다. book_id NOT NULL 때문에 이 INSERT가 항상 실패해 기록이 저장되지 않았다.
-- FK(books.id)는 그대로 두고 NULL만 허용한다. 기존 행은 영향 없음.
ALTER TABLE public.read_books ALTER COLUMN book_id DROP NOT NULL;
