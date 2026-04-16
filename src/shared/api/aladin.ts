/**
 * Aladin Book API helper — centralized fetching logic for book data.
 */

const BASE_URL = 'https://www.aladin.co.kr/ttb/api';

function getKey(): string {
  const key = process.env.ALADIN_API_KEY;
  if (!key) throw new Error('ALADIN_API_KEY is not configured');
  return key;
}

/** Lookup a book by ISBN (tries ISBN13 first, then ISBN) */
export async function lookupBookByIsbn(isbn: string) {
  const key = getKey();
  const fetchWithType = async (idType: 'ISBN13' | 'ISBN') => {
    const url = `${BASE_URL}/ItemLookUp.aspx?ttbkey=${key}&ItemId=${isbn}&ItemIdType=${idType}&output=js&Version=20131101&Cover=Big&OptResult=ebookList,usedList,reviewList`;
    const res = await fetch(url);
    return res.json();
  };

  const data = await fetchWithType('ISBN13');
  if (!data.errorCode) return data;

  // Fallback to ISBN
  const data2 = await fetchWithType('ISBN');
  if (!data2.errorCode) return data2;

  throw new Error(data2.errorMessage || 'Book not found');
}

/** Search books using the Aladin search API */
export async function searchBooks(query: string, maxResults = 10) {
  const key = getKey();
  const url = `${BASE_URL}/ItemSearch.aspx?ttbkey=${key}&Query=${encodeURIComponent(query)}&MaxResults=${maxResults}&start=1&SearchTarget=Book&output=js&Version=20131101&Cover=Big`;
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
  const key = getKey();
  let url = `${BASE_URL}/ItemList.aspx?ttbkey=${key}&QueryType=${queryType}&MaxResults=${maxResults}&start=1&SearchTarget=Book&output=js&Version=20131101&Cover=Big`;
  if (categoryId !== undefined) url += `&CategoryId=${categoryId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aladin list fetch failed: ${res.status}`);
  return res.json();
}
