/**
 * YES24 Open API helper — Centralized fetching and normalization logic for book data.
 * Replaces legacy Aladin Open API.
 */

import { Book } from '@shared/types';

const BASE_URL = 'https://apis.yes24.com/v1';

export function getYes24ApiKey(): string {
  const key = process.env.YES24_API_KEY;
  if (!key) throw new Error('YES24_API_KEY is not configured');
  return key.startsWith('yk_') ? key : `yk_${key}`;
}

/**
 * Normalizes YES24 raw item data into the standard Book interface.
 */
export function normalizeYes24Book(item: any): Book {
  const isbn = item.isbn13 || item.isbn10 || String(item.itemId || '');
  const cleanTitle = item.title?.split(' - ')?.[0]?.trim() || item.title || '제목 없음';
  
  // Clean author string (e.g. "백희나 저" -> "백희나")
  const cleanAuthor = item.author
    ? item.author
        .replace(/\s*저(\/.*)?$/, '')
        .replace(/\s*\(지은이\)|\s*\(글\)|\s*\(그림\)/g, '')
        .split('/')[0]
        ?.trim() || item.author
    : '저자 미상';

  const description = item.contentDetail?.bookIntroduction || item.contentDetail?.bookSummary || item.description || '';
  const toc = item.contentDetail?.tableOfContents || item.toc || '';
  const rating = item.starScore ? parseFloat((item.starScore / 2).toFixed(1)) : 4.8;
  const reviewsCount = item.salePoint ? Math.min(Math.floor(item.salePoint / 100), 300) + 12 : 50;

  return {
    id: isbn,
    bookid: isbn,
    title: cleanTitle,
    author: cleanAuthor,
    imgsrc: item.cover || '',
    coverUrl: item.cover || '',
    category: item.goodsSortNm || item.goodsType || '어린이',
    pubDate: item.publishDate || '',
    publisher: item.publisher || '',
    description,
    toc,
    rating,
    reviewsCount,
  };
}

/**
 * Lookup a book by ISBN13 (or ItemId) with full detail (TOC, description, covers).
 */
export async function lookupBookByIsbn(isbn: string): Promise<{ item: Book; raw: any }> {
  const key = getYes24ApiKey();
  const searchType = /^\d{10,13}$/.test(isbn) ? 'ISBN13' : 'ItemId';
  const url = `${BASE_URL}/goods/itemDetail?searchType=${searchType}&query=${encodeURIComponent(isbn)}&detail=Y`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': key,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`YES24 itemDetail failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success || !data.data?.items?.length) {
    throw new Error(data.message || 'Book not found on YES24');
  }

  const rawItem = data.data.items[0];
  return {
    item: normalizeYes24Book(rawItem),
    raw: rawItem,
  };
}

/**
 * Search books using the YES24 Goods Search API.
 */
export async function searchBooks(
  query: string,
  pageSize = 20,
  page = 1,
  category = 'BOOK'
): Promise<{ items: Book[]; totalCount: number; raw: any }> {
  const key = getYes24ApiKey();
  const url = `${BASE_URL}/goods/itemList?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}&category=${category}&detail=Y`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': key,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`YES24 itemList failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'YES24 search failed');
  }

  const rawItems = data.data?.items || [];
  const totalCount = data.data?.totalCount || rawItems.length;

  return {
    items: rawItems.map(normalizeYes24Book),
    totalCount,
    raw: data,
  };
}

/**
 * Fetch bestsellers by category (Default: 001001016 어린이).
 */
export async function fetchBestsellers(
  categoryId = '001001016',
  pageSize = 20,
  page = 1
): Promise<{ items: Book[]; totalCount: number }> {
  const key = getYes24ApiKey();
  const url = `${BASE_URL}/category/bestseller?categoryId=${categoryId}&page=${page}&pageSize=${pageSize}&detail=Y`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': key,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`YES24 bestseller failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'YES24 bestseller fetch failed');
  }

  const rawItems = data.data?.items || [];
  return {
    items: rawItems.map(normalizeYes24Book),
    totalCount: data.data?.totalCount || rawItems.length,
  };
}

/**
 * Fetch new products by category (Default: 001001016 어린이).
 */
export async function fetchNewBooks(
  categoryId = '001001016',
  pageSize = 20,
  page = 1
): Promise<{ items: Book[]; totalCount: number }> {
  const key = getYes24ApiKey();
  const url = `${BASE_URL}/category/newproduct?categoryId=${categoryId}&page=${page}&pageSize=${pageSize}&detail=Y`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': key,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`YES24 newproduct failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'YES24 newproduct fetch failed');
  }

  const rawItems = data.data?.items || [];
  return {
    items: rawItems.map(normalizeYes24Book),
    totalCount: data.data?.totalCount || rawItems.length,
  };
}

