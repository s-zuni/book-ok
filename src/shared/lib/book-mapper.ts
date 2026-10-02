import type { Book } from '@shared/types';

/** `recommendations` 엣지 함수(YES24)가 내려주는 도서 항목 */
export interface BookApiItem {
    isbn13?: string;
    isbn?: string;
    itemId?: string | number;
    title: string;
    author?: string;
    publisher?: string;
    cover?: string;
    categoryName?: string;
    pubDate?: string;
    description?: string;
    /** YES24 starScore (0~10 척도, 평점이 없으면 undefined) */
    customerRating?: number;
    salesPoint?: number;
}

/** 엣지 함수 응답 항목 → 앱 공용 Book. 평점은 YES24 실데이터만 사용합니다(5점 만점 환산). */
export function toBook(item: BookApiItem): Book {
    const id = String(item.isbn13 || item.isbn || item.itemId || '');
    const cover = item.cover || '';
    return {
        id,
        bookid: id,
        title: item.title,
        author: item.author || '저자 미상',
        publisher: item.publisher || '',
        imgsrc: cover,
        coverUrl: cover,
        category: item.categoryName || '',
        pubDate: item.pubDate,
        description: item.description,
        rating: item.customerRating ? Math.round(item.customerRating * 5) / 10 : undefined,
    };
}
