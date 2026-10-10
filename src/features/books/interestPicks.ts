import { supabaseUrl, supabaseAnonKey } from '@shared/lib/supabase';
import { safeFetch } from '@shared/lib/api';
import { toBook, type BookApiItem } from '@shared/lib/book-mapper';
import type { Book } from '@shared/types';

export interface InterestPick {
    interestId: string;
    book: Book;
}

/** 관심사 기반 맞춤 추천. 서버가 도서관정보나루 인기대출(연령·분류)로 후보를 고르고 YES24 도서 정보로 보강한 뒤 관심사별로 병합합니다. */
export async function fetchInterestPicks(interestIds: string[], age: number): Promise<InterestPick[]> {
    const response = await safeFetch(`${supabaseUrl}/functions/v1/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
        body: JSON.stringify({ apiType: 'InterestPicks', interests: interestIds, age }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const items: (BookApiItem & { interestId: string })[] = data?.item || [];
    return items.map(item => ({ interestId: item.interestId, book: toBook(item) }));
}
