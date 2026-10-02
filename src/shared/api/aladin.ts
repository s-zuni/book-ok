/**
 * Legacy Book API helper — now routes to YES24 Open API with fallback.
 * @deprecated Prefer using `@shared/api/yes24` directly.
 */

import * as yes24 from './yes24';

const ALADIN_BASE_URL = 'https://www.aladin.co.kr/ttb/api';

function getAladinKey(): string | null {
  return process.env.ALADIN_API_KEY || null;
}

/** Lookup a book by ISBN (Tries YES24 first, fallback to Aladin) */
export async function lookupBookByIsbn(isbn: string) {
  if (process.env.YES24_API_KEY) {
    try {
      const { item, raw } = await yes24.lookupBookByIsbn(isbn);
      return {
        item: [
          {
            ...raw,
            isbn13: raw.isbn13 || isbn,
            title: item.title,
            author: item.author,
            cover: item.imgsrc,
            categoryName: item.category,
            description: item.description,
            toc: item.toc,
            publisher: item.publisher,
            pubDate: item.pubDate,
          },
        ],
        description: item.description,
        toc: item.toc,
      };
    } catch (err) {
      console.warn('YES24 lookupBookByIsbn failed, falling back to legacy Aladin:', err);
    }
  }

  const key = getAladinKey();
  if (!key) throw new Error('No book API key configured (neither YES24 nor Aladin)');

  const fetchWithType = async (idType: 'ISBN13' | 'ISBN') => {
    const url = `${ALADIN_BASE_URL}/ItemLookUp.aspx?ttbkey=${key}&ItemId=${isbn}&ItemIdType=${idType}&output=js&Version=20131101&Cover=Big&OptResult=ebookList,usedList,reviewList`;
    const res = await fetch(url);
    return res.json();
  };

  const data = await fetchWithType('ISBN13');
  if (!data.errorCode) return data;

  const data2 = await fetchWithType('ISBN');
  if (!data2.errorCode) return data2;

  throw new Error(data2.errorMessage || 'Book not found');
}

/** Search books using YES24 (fallback to Aladin) */
export async function searchBooks(query: string, maxResults = 10) {
  if (process.env.YES24_API_KEY) {
    try {
      const res = await yes24.searchBooks(query, maxResults);
      return {
        totalResults: res.totalCount,
        item: res.items.map((b) => ({
          isbn13: b.bookid,
          isbn: b.bookid,
          title: b.title,
          author: b.author,
          cover: b.imgsrc,
          categoryName: b.category,
          publisher: b.publisher,
          pubDate: b.pubDate,
          description: b.description,
        })),
      };
    } catch (err) {
      console.warn('YES24 searchBooks failed, falling back to legacy Aladin:', err);
    }
  }

  const key = getAladinKey();
  if (!key) throw new Error('No book API key configured');
  const url = `${ALADIN_BASE_URL}/ItemSearch.aspx?ttbkey=${key}&Query=${encodeURIComponent(query)}&MaxResults=${maxResults}&start=1&SearchTarget=Book&output=js&Version=20131101&Cover=Big`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aladin search failed: ${res.status}`);
  return res.json();
}

/** Fetch best-seller or new books list */
export async function fetchBookList(
  queryType: 'Bestseller' | 'ItemNewAll' | 'ItemNewSpecial' | 'BlogBest' = 'Bestseller',
  maxResults = 20,
  categoryId?: number
) {
  if (process.env.YES24_API_KEY) {
    try {
      const yes24Cat = categoryId === 13789 ? '001001027' : '001001016';
      const res =
        queryType === 'Bestseller'
          ? await yes24.fetchBestsellers(yes24Cat, maxResults)
          : await yes24.fetchNewBooks(yes24Cat, maxResults);

      return {
        totalResults: res.totalCount,
        item: res.items.map((b) => ({
          isbn13: b.bookid,
          isbn: b.bookid,
          title: b.title,
          author: b.author,
          cover: b.imgsrc,
          categoryName: b.category,
          publisher: b.publisher,
          pubDate: b.pubDate,
          description: b.description,
        })),
      };
    } catch (err) {
      console.warn('YES24 fetchBookList failed, falling back to legacy Aladin:', err);
    }
  }

  const key = getAladinKey();
  if (!key) throw new Error('No book API key configured');
  let url = `${ALADIN_BASE_URL}/ItemList.aspx?ttbkey=${key}&QueryType=${queryType}&MaxResults=${maxResults}&start=1&SearchTarget=Book&output=js&Version=20131101&Cover=Big`;
  if (categoryId !== undefined) url += `&CategoryId=${categoryId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aladin list fetch failed: ${res.status}`);
  return res.json();
}
