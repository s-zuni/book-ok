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
  };
}

// YES24 itemList 는 sort 파라미터를 지원하지 않아 서버에서 정렬
function sortItems(items: ReturnType<typeof normalizeItem>[], sort: string) {
  if (sort === "SalesPoint") return [...items].sort((a, b) => (b.salesPoint || 0) - (a.salesPoint || 0));
  if (sort === "PublishTime") return [...items].sort((a, b) => b.pubDate.localeCompare(a.pubDate));
  return items;
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

    const rawKey = Deno.env.get("YES24_API_KEY") || Deno.env.get("yes24_api_key");
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
      const items = (data.data?.items || []).map((it: any) => normalizeItem(it));
      return json({ totalResults: data.data?.totalCount || items.length, item: items });
    }

    // 3. 키워드 검색
    const pageSize = apiType === "Search" ? SEARCH_PAGE_SIZE : maxResults;
    const data = await yes24Get(
      `/goods/itemList?query=${encodeURIComponent(query || "어린이 베스트셀러")}&page=${page}&pageSize=${pageSize}&category=BOOK&detail=Y`,
      apiKey,
    );
    const items = sortItems((data.data?.items || []).map((it: any) => normalizeItem(it)), sort);
    return json({ totalResults: data.data?.totalCount || items.length, item: items });
  } catch (error: any) {
    return json({ error: "Failed to fetch recommendations.", details: error.message }, 500);
  }
});
