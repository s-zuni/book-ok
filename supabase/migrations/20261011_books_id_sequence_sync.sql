-- books.id 시퀀스를 현재 최대 id 다음으로 맞춥니다.
-- 배경: books.id 는 identity 인데 시퀀스가 1부터 시작해, 시드 행(id 1~10)과 충돌하는
--       "duplicate key value violates unique constraint books_pkey" 가 책 등록 때 발생했고,
--       그 결과 read_books.book_id(NOT NULL)가 비어 독서 기록 저장이 실패했습니다.
-- 기존 도서 행은 id 에 ISBN 숫자를 직접 쓰므로 최대 id 는 매우 큰 값입니다. 여러 번 실행해도 안전합니다.
select setval(
  pg_get_serial_sequence('public.books', 'id'),
  coalesce((select max(id) from public.books), 0) + 1,
  false
);
