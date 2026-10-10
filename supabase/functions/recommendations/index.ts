import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const YES24_BASE_URL = "https://apis.yes24.com/v1";
const DEFAULT_CATEGORY = "001001016"; // 어린이
const SEARCH_PAGE_SIZE = 10; // 검색 화면(apiType=Search)의 페이지당 노출 수와 일치
const MAX_PAGE_SIZE = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// 이전(알라딘) 카테고리 ID → YES24 카테고리 ID. 이미 배포된 앱이 예전 ID를 보내므로 서버에서 변환합니다.
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "1108": "001001016", // 어린이
  "13789": "001001027", // 유아
  "35088": "001001027005", // 0~3세
  "35106": "001001027006", // 4~6세
  "48803": "001001016015", // 초등 1-2학년
  "48804": "001001016017", // 초등 5-6학년
  "13790": "001001027001", // 언어 → 유아 그림책
  "1110": "001001016003", // 학습만화
  "1132": "001001016001", // 인성 → 어린이 문학
  "1175": "001001016002", // 수학 → 초등학습
  "1137": "001001016004", // 자연/과학 → 어린이 교양
  "1109": "001001016004", // 역사/사회 → 어린이 교양
  "1177": "001001016004", // 예술/체육 → 어린이 교양
};

function resolveCategory(categoryId: string): string {
  if (categoryId.startsWith("001")) return categoryId;
  return LEGACY_CATEGORY_MAP[categoryId] || DEFAULT_CATEGORY;
}

// YES24 itemDetail 은 ISBN10 검색을 지원하지 않으므로 ISBN13 으로 변환
function isbn10To13(isbn10: string): string {
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + ((10 - (sum % 10)) % 10);
}

// "흔한남매 원저/백난도 글/..." , "루리 글,그림", "백희나 저" → 대표 저자명만 추출
function cleanAuthor(author: string | undefined): string {
  if (!author) return "저자 미상";
  let first = author.split("/")[0].split(",")[0].replace(/\(.*?\)/g, "").trim();
  let prev = "";
  while (prev !== first) {
    prev = first;
    first = first.replace(/\s+(원저|글그림|글|그림|저|지음|지은이|옮김|역)$/, "").trim();
  }
  return first || author;
}

// "20191205" → "2019-12-05"
function formatPubDate(date: string | undefined): string {
  return date && /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : date || "";
}

function normalizeItem(raw: any, fallbackId = "") {
  const isbn = raw.isbn13 || raw.isbn10 || String(raw.itemId || fallbackId);
  return {
    isbn13: isbn,
    isbn,
    itemId: raw.itemId,
    title: raw.title?.split(" - ")?.[0]?.trim() || raw.title || "제목 없음",
    author: cleanAuthor(raw.author),
    cover: raw.cover || "",
    sideCover: raw.sideCover || "",
    backCover: raw.backCover || "",
    categoryName: raw.goodsSortNm || raw.goodsType || "어린이",
    description: raw.contentDetail?.bookIntroduction || raw.contentDetail?.bookSummary || raw.description || "",
    toc: raw.contentDetail?.tableOfContents || raw.toc || "",
    publisher: raw.publisher || "",
    pubDate: formatPubDate(raw.publishDate),
    // starScore: 0~10 척도, 0 은 평점 없음 → 비워서 내려보냄
    customerRating: raw.starScore > 0 ? raw.starScore : undefined,
    salesPoint: raw.salePoint || undefined,
    pages: raw.pages,
    link: raw.link || "",
    // 예스24 애드온 링크(수익 연결). 애드온 미신청이면 일반 상품 링크. 가공하지 않고 그대로 사용합니다.
    buyLink: raw.addOnLink || raw.link || "",
  };
}

// YES24 itemList 는 sort 파라미터를 지원하지 않아 서버에서 정렬
function sortItems(items: ReturnType<typeof normalizeItem>[], sort: string) {
  if (sort === "SalesPoint") return [...items].sort((a, b) => (b.salesPoint || 0) - (a.salesPoint || 0));
  if (sort === "PublishTime") return [...items].sort((a, b) => b.pubDate.localeCompare(a.pubDate));
  return items;
}

// 추천 도서에서 제외할 전집·세트 상품 (제목 부제 " - 전집 10권" 까지 보도록 원본 title 로 검사)
const SET_PATTERN = /전집|세트|\bset\b|전\s*\d+\s*권|\d+\s*권\s*(?:세트|전집)|\d+\s*[~\-]\s*\d+\s*권/i;
const isNotBookSet = (raw: any) => !SET_PATTERN.test(`${raw.title || ""} ${raw.goodsSortNm || ""}`);

// ───────── 관심사 기반 맞춤 추천: 도서관정보나루(대출 데이터)로 후보 선정 → YES24 로 도서 정보 보강 ─────────
// 관심사 id → KDC 분류/관련도 키워드/보충 검색어. 클라이언트(features/books/interestTopics.ts)의 id 와 일치해야 합니다.
const INTEREST_CONFIG: Record<string, { kdc: string; keywords: string[]; search: string[] }> = {
  insect: { kdc: "4", keywords: ["곤충", "벌레", "나비", "개미", "딱정벌레", "잠자리", "매미", "사마귀"], search: ["곤충 어린이", "곤충 도감"] },
  animal: { kdc: "4", keywords: ["동물", "강아지", "고양이", "곰", "토끼", "공룡", "새", "물고기"], search: ["동물 어린이", "동물 그림책"] },
  friendship: { kdc: "8", keywords: ["친구", "우정", "단짝", "함께"], search: ["친구 우정 동화", "친구 그림책"] },
  family: { kdc: "8", keywords: ["가족", "엄마", "아빠", "할머니", "할아버지", "형제", "동생", "누나", "오빠"], search: ["가족 동화", "가족 그림책"] },
  emotion: { kdc: "8", keywords: ["감정", "마음", "기분", "화", "슬픔", "기쁨", "눈물", "용기"], search: ["감정 마음 그림책", "마음 동화"] },
  adventure: { kdc: "8", keywords: ["모험", "탐험", "여행", "보물", "비밀", "마법"], search: ["모험 동화", "모험 그림책"] },
  science: { kdc: "4", keywords: ["과학", "실험", "우주", "지구", "원리", "탐구", "로봇"], search: ["어린이 과학", "과학 동화"] },
  school: { kdc: "8", keywords: ["학교", "입학", "선생님", "교실", "학급", "방학"], search: ["학교 동화", "학교생활 그림책"] },
  career: { kdc: "3", keywords: ["직업", "진로", "꿈", "되고 싶", "일터", "의사", "소방관"], search: ["직업 어린이", "직업 그림책"] },
};
const MAX_INTERESTS = 3;
const LIBRARY_BASE_URL = "http://data4library.kr/api";
const LIBRARY_POPULAR_SIZE = 40; // 연령별 인기대출 후보 풀 (크기에 비례해 API 가 느려져 작게 유지)
const LIBRARY_LOOKBACK_DAYS = 180; // 대출 집계 기간
const SEARCH_TIMEOUT_MS = 3000; // srchBooks 는 평소 수십 ms 라 짧게 제한
const LIBRARY_AGE_WAIT_MS = 2500; // 연령별 인기대출을 기다리는 최대 시간. 초과 시 키워드 검색 결과만으로 응답
const LIBRARY_AGE_BACKGROUND_TIMEOUT_MS = 25000;
const MIN_CANDIDATES = 8; // 관련 도서가 이보다 적으면 관련도 낮은 검색 결과로 보충
const CANDIDATES_PER_TOPIC = 30; // YES24 보강 대상 수 (보강 실패분 여유 포함)
const RESULTS_PER_TOPIC = 8;
const LIBRARY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const YES24_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

type LibraryBook = { isbn13: string; title: string; classNm: string; loanCount: number };
type BookItem = ReturnType<typeof normalizeItem>;

// 같은 격리 환경(isolate) 안에서 반복 호출을 줄이는 단순 TTL 캐시
function createCache<T>(ttlMs: number) {
  const store = new Map<string, { at: number; value: T }>();
  return {
    get(key: string): T | undefined {
      const hit = store.get(key);
      return hit && Date.now() - hit.at < ttlMs ? hit.value : undefined;
    },
    set(key: string, value: T) {
      if (store.size >= CACHE_MAX_ENTRIES) store.delete(store.keys().next().value as string);
      store.set(key, { at: Date.now(), value });
    },
  };
}
const agePoolCache = createCache<LibraryBook[]>(LIBRARY_CACHE_TTL_MS);
const keywordPoolCache = createCache<LibraryBook[]>(LIBRARY_CACHE_TTL_MS);
const yes24Cache = createCache<BookItem | null>(YES24_CACHE_TTL_MS);

async function libraryGet(path: string, params: Record<string, string>, authKey: string, timeoutMs = 8000): Promise<any[]> {
  const qs = new URLSearchParams({ authKey, format: "json", ...params });
  const res = await fetch(`${LIBRARY_BASE_URL}/${path}?${qs}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`data4library ${path} failed: ${res.status}`);
  const data = await res.json();
  if (data?.response?.error) throw new Error(`data4library ${path}: ${data.response.error}`);
  return data?.response?.docs || [];
}

const toLibraryBook = (entry: any): LibraryBook | null => {
  const doc = entry?.doc ?? entry;
  const isbn13 = String(doc?.isbn13 || "").trim();
  if (!/^\d{13}$/.test(isbn13) || !doc?.bookname) return null;
  return {
    isbn13,
    title: String(doc.bookname),
    classNm: String(doc.class_nm || ""),
    loanCount: Number(doc.loan_count) || 0,
  };
};

const formatDate = (d: Date) => d.toISOString().slice(0, 10);

// 도서관정보나루는 동시 호출에 약해(타임아웃·빈 응답) 조회 종류별로 한 번에 하나씩만 보냅니다.
function createLane() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task, task);
    tail = result.catch(() => undefined);
    return result;
  };
}
const searchLane = createLane();
const loanLane = createLane();

const delay = (ms: number) => new Promise<null>(resolve => setTimeout(() => resolve(null), ms));
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

const parseLibraryDocs = (docs: any[]) => docs.map(toLibraryBook).filter((b): b is LibraryBook => !!b && !SET_PATTERN.test(b.title));

// 연령별 인기대출 조회(loanItemSrch)는 응답이 1~25초로 불안정해서, 요청을 막지 않고 백그라운드에서 캐시를 채웁니다.
const agePoolInflight = new Map<string, Promise<LibraryBook[] | null>>();
function getAgePool(interestId: string, age: number, authKey: string): Promise<LibraryBook[] | null> {
  const key = `${interestId}|${age}`;
  const cached = agePoolCache.get(key);
  if (cached) return Promise.resolve(cached);

  let inflight = agePoolInflight.get(key);
  if (!inflight) {
    const end = new Date();
    const start = new Date(end.getTime() - LIBRARY_LOOKBACK_DAYS * 86400000);
    inflight = loanLane(() => libraryGet("loanItemSrch", {
      startDt: formatDate(start),
      endDt: formatDate(end),
      from_age: String(Math.max(age - 1, 0)),
      to_age: String(age + 1),
      kdc: INTEREST_CONFIG[interestId].kdc,
      pageNo: "1",
      pageSize: String(LIBRARY_POPULAR_SIZE),
    }, authKey, LIBRARY_AGE_BACKGROUND_TIMEOUT_MS))
      .then(docs => {
        const pool = parseLibraryDocs(docs);
        if (pool.length > 0) agePoolCache.set(key, pool);
        return pool;
      })
      .catch(() => null)
      .finally(() => agePoolInflight.delete(key));
    agePoolInflight.set(key, inflight);
    EdgeRuntime?.waitUntil(inflight); // 응답 후에도 조회가 끝까지 진행되도록 유지
  }
  return Promise.race([inflight, delay(LIBRARY_AGE_WAIT_MS)]);
}

async function getKeywordPool(interestId: string, authKey: string): Promise<LibraryBook[]> {
  const cached = keywordPoolCache.get(interestId);
  if (cached) return cached;

  // 검색어별로 순차 조회(빠른 API). 실패하거나 빈 응답이면 1회 재시도
  const pool: LibraryBook[] = [];
  for (const keyword of INTEREST_CONFIG[interestId].search) {
    const params = { keyword, pageNo: "1", pageSize: "100" };
    for (let attempt = 0, found: LibraryBook[] = []; attempt < 2 && found.length === 0; attempt++) {
      found = parseLibraryDocs(await searchLane(() => libraryGet("srchBooks", params, authKey, SEARCH_TIMEOUT_MS)).catch(() => []));
      pool.push(...found);
    }
  }
  // 빈 결과(일시 장애 가능성)는 캐시하지 않음
  if (pool.length > 0) keywordPoolCache.set(interestId, pool);
  return pool;
}

/**
 * 관심사 후보 도서 선정 (도서관정보나루)
 *  ① 연령별 인기대출(loanItemSrch, 관심사 KDC) 중 관심사 키워드가 제목·분류에 있는 도서 (준비된 경우)
 *  ② 관심사 키워드 검색(srchBooks, 대출순) 중 관련 도서. 연령 필터가 없어 ① 뒤에 배치(연령 적합도는 YES24 분류로 보정)
 *  ③ 후보가 적으면 나머지 검색 결과로 보충
 */
async function fetchLibraryCandidates(interestId: string, age: number, authKey: string): Promise<LibraryBook[]> {
  const config = INTEREST_CONFIG[interestId];
  const relevanceOf = (b: LibraryBook) =>
    config.keywords.reduce((sum, kw) => sum + (b.title.includes(kw) ? 2 : 0) + (b.classNm.includes(kw) ? 1 : 0), 0);

  const [agePool, searched] = await Promise.all([getAgePool(interestId, age, authKey), getKeywordPool(interestId, authKey)]);

  const seen = new Set<string>();
  const unique = (list: LibraryBook[]) => list.filter(b => !seen.has(b.isbn13) && (seen.add(b.isbn13), true));
  const relevantAgePool = unique((agePool ?? []).filter(b => relevanceOf(b) > 0).sort((a, b) => b.loanCount - a.loanCount));
  const relevantSearched = unique(searched.filter(b => relevanceOf(b) > 0));
  let result = [...relevantAgePool, ...relevantSearched];
  if (result.length < MIN_CANDIDATES) result = [...result, ...unique(searched)];

  // 시리즈 중복 제거: 권수만 다른 도서는 대출이 가장 많은 한 권만 남김
  const seenSeries = new Set<string>();
  return result
    .filter(b => {
      const series = b.title.replace(/[\s:]*(제?\s*\d+\s*권?|\d+)\s*$/, "").trim();
      return seenSeries.has(series) ? false : (seenSeries.add(series), true);
    })
    .slice(0, CANDIDATES_PER_TOPIC);
}

// 키워드 검색에는 성인 도서도 섞이므로 YES24 분류로 어린이·유아 도서만 통과
const KIDS_CATEGORY = /어린이|유아|초등|청소년/;

/** ISBN13 으로 YES24 도서 정보(표지·평점·소개) 조회. 표지가 없거나 세트 상품이면 null */
async function fetchYes24Book(isbn13: string, apiKey: string): Promise<BookItem | null> {
  const cached = yes24Cache.get(isbn13);
  if (cached !== undefined) return cached;
  let item: BookItem | null = null;
  try {
    const data = await yes24Get(`/goods/itemDetail?searchType=ISBN13&query=${isbn13}&detail=Y`, apiKey);
    const raw = data.data?.items?.[0];
    if (raw && isNotBookSet(raw) && raw.cover && KIDS_CATEGORY.test(raw.goodsSortNm || "")) item = normalizeItem(raw, isbn13);
  } catch (_e) {
    return null; // 일시 오류는 캐시하지 않음
  }
  yes24Cache.set(isbn13, item);
  return item;
}

async function fetchInterestItems(interestId: string, age: number, libraryKey: string, yes24Key: string): Promise<BookItem[]> {
  const candidates = await fetchLibraryCandidates(interestId, age, libraryKey);
  const enriched = await Promise.all(candidates.map(c => fetchYes24Book(c.isbn13, yes24Key)));
  const ageFit = age < 7 ? /유아/ : /어린이|초등|청소년/;
  const books = enriched.filter((b): b is BookItem => !!b);
  // 안정 정렬: 연령에 맞는 YES24 분류를 앞으로, 나머지는 기존(관련도·대출) 순서 유지
  return [...books.filter(b => ageFit.test(b.categoryName)), ...books.filter(b => !ageFit.test(b.categoryName))].slice(0, RESULTS_PER_TOPIC);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function yes24Get(path: string, apiKey: string) {
  const res = await fetch(`${YES24_BASE_URL}${path}`, {
    headers: { "X-Api-Key": apiKey, "Accept": "application/json" },
  });
  if (res.status === 404 || res.status === 400) return { data: null }; // 결과 없음/잘못된 ID(GOODS_002, PARAM_004)
  if (!res.ok) throw new Error(`YES24 ${path.split("?")[0]} failed: ${res.status}`);
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // POST JSON 본문 우선, 없으면 URL 쿼리스트링 사용
    let body: Record<string, any> = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch (_e) {
        // 본문이 없거나 JSON 이 아니면 쿼리스트링만 사용
      }
    }
    const params = new URL(req.url).searchParams;
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = body[key] ?? params.get(key);
        if (value !== undefined && value !== null && value !== "") return String(value);
      }
      return "";
    };

    const query = pick("query", "q");
    const categoryId = pick("categoryId");
    const sort = pick("sort");
    const apiType = pick("apiType") || "ItemSearch";
    const queryType = pick("queryType") || "Bestseller";
    const page = Math.max(parseInt(pick("page"), 10) || 1, 1);
    const itemId = pick("itemId");
    const maxResults = Math.min(parseInt(pick("maxResults"), 10) || MAX_PAGE_SIZE, MAX_PAGE_SIZE);

    // 시크릿 값에 공백·따옴표가 섞여 들어가도 동작하도록 정리
    const rawKey = (Deno.env.get("YES24_API_KEY") || Deno.env.get("yes24_api_key"))?.trim().replace(/^["']|["']$/g, "");
    if (!rawKey) {
      return json({ error: "YES24_API_KEY is not configured in Supabase environment secrets." }, 500);
    }
    const apiKey = rawKey.startsWith("yk_") ? rawKey : `yk_${rawKey}`;

    // 1. 단일 도서 상세 조회
    if (apiType === "ItemLookUp" || itemId) {
      let lookupId = itemId || query;
      if (!lookupId) return json({ error: "ItemId is required" }, 400);
      if (/^\d{9}[\dXx]$/.test(lookupId)) lookupId = isbn10To13(lookupId);
      const searchType = /^\d{13}$/.test(lookupId) ? "ISBN13" : "ItemId";

      const data = await yes24Get(
        `/goods/itemDetail?searchType=${searchType}&query=${encodeURIComponent(lookupId)}&detail=Y`,
        apiKey,
      );
      const rawItem = data.data?.items?.[0];
      if (!rawItem) return json({ error: "Book not found" }, 404);

      const item = normalizeItem(rawItem, lookupId);
      return json({ description: item.description, toc: item.toc, item });
    }

    // 2. 카테고리 베스트셀러 / 신간
    if (apiType === "ItemList") {
      const isNew = queryType === "ItemNewAll" || queryType === "ItemNewSpecial";
      const endpoint = isNew ? "newproduct" : "bestseller";
      const data = await yes24Get(
        `/category/${endpoint}?categoryId=${resolveCategory(categoryId)}&page=${page}&pageSize=${maxResults}&detail=Y`,
        apiKey,
      );
      const items = (data.data?.items || []).filter(isNotBookSet).map((it: any) => normalizeItem(it));
      return json({ totalResults: data.data?.totalCount || items.length, item: items });
    }

    // 3. 관심사 기반 맞춤 추천
    if (apiType === "InterestPicks") {
      const interestIds = [...new Set(
        (Array.isArray(body.interests) ? body.interests : []).filter((id: unknown) => typeof id === "string" && id in INTEREST_CONFIG),
      )].slice(0, MAX_INTERESTS) as string[];
      if (interestIds.length === 0) return json({ totalResults: 0, item: [] });

      const libraryKey = Deno.env.get("DATA4LIBRARY_API_KEY") || Deno.env.get("data4library_api_key");
      if (!libraryKey) return json({ error: "DATA4LIBRARY_API_KEY is not configured in Supabase environment secrets." }, 500);

      const age = Math.min(Math.max(parseInt(pick("age"), 10) || 6, 0), 13);
      const buckets = await Promise.all(
        interestIds.map(async (id) => {
          // 한 관심사 조회가 실패해도 나머지 관심사 추천은 그대로 응답
          const items = await fetchInterestItems(id, age, libraryKey, apiKey).catch(() => []);
          return items.map((it) => ({ ...it, interestId: id }));
        }),
      );
      // 한 관심사로 쏠리지 않도록 관심사별 상위 도서를 번갈아 병합하고 중복은 제거
      const seen = new Set<string>();
      const merged: any[] = [];
      for (let i = 0; i < RESULTS_PER_TOPIC; i++) {
        for (const bucket of buckets) {
          const it = bucket[i];
          if (it && !seen.has(it.isbn13)) { seen.add(it.isbn13); merged.push(it); }
        }
      }
      return json({ totalResults: merged.length, item: merged });
    }

    // 4. 키워드 검색
    const pageSize = apiType === "Search" ? SEARCH_PAGE_SIZE : maxResults;
    const data = await yes24Get(
      `/goods/itemList?query=${encodeURIComponent(query || "어린이 베스트셀러")}&page=${page}&pageSize=${pageSize}&category=BOOK&detail=Y`,
      apiKey,
    );
    // 검색 화면(apiType=Search)은 사용자가 직접 찾는 것이므로 세트도 노출, 추천 용도 호출만 세트 제외
    const rawItems = apiType === "Search" ? data.data?.items || [] : (data.data?.items || []).filter(isNotBookSet);
    const items = sortItems(rawItems.map((it: any) => normalizeItem(it)), sort);
    return json({ totalResults: data.data?.totalCount || items.length, item: items });
  } catch (error: any) {
    return json({ error: "Failed to fetch recommendations.", details: error.message }, 500);
  }
});
