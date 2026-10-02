import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function normalizeYes24Item(raw: any, fallbackId = "") {
  const isbn = raw.isbn13 || raw.isbn10 || String(raw.itemId || fallbackId);
  const cleanTitle = raw.title?.split(" - ")?.[0]?.trim() || raw.title || "제목 없음";
  const cleanAuthor = raw.author
    ? raw.author
        .replace(/\s*저(\/.*)?$/, "")
        .replace(/\s*\(지은이\)|\s*\(그림\)|\s*\(글\)/g, "")
        .split(",")[0]
        ?.trim() || raw.author
    : "저자 미상";

  const description = raw.contentDetail?.bookIntroduction || raw.contentDetail?.bookSummary || raw.description || "";
  const toc = raw.contentDetail?.tableOfContents || raw.toc || "";

  return {
    isbn13: isbn,
    isbn: isbn,
    itemId: raw.itemId,
    title: cleanTitle,
    author: cleanAuthor,
    cover: raw.cover || "",
    sideCover: raw.sideCover || "",
    backCover: raw.backCover || "",
    categoryName: raw.goodsSortNm || raw.goodsType || "어린이",
    description,
    toc,
    publisher: raw.publisher || "",
    pubDate: raw.publishDate || "",
    customerRating: raw.starScore || 9.5,
    salesPoint: raw.salePoint || 500,
    pages: raw.pages,
    link: raw.link || "",
  };
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let query = "";
    let categoryId = "";
    let sort = "Accuracy";
    let apiType = "ItemSearch";
    let queryType = "Bestseller";
    let page = "1";
    let itemId = "";

    // 1. Try to read from POST JSON body first
    if (req.method === "POST") {
      try {
        const body = await req.clone().json();
        query = body.query || body.q || "";
        categoryId = body.categoryId ? String(body.categoryId) : "";
        sort = body.sort || "Accuracy";
        apiType = body.apiType || "ItemSearch";
        queryType = body.queryType || "Bestseller";
        page = body.page ? String(body.page) : "1";
        itemId = body.itemId || "";
      } catch (_e) {
        // Ignore JSON parsing errors
      }
    }

    // 2. Fallback to URL search parameters if still empty
    const urlObj = new URL(req.url);
    query = query || urlObj.searchParams.get("query") || urlObj.searchParams.get("q") || "";
    categoryId = categoryId || urlObj.searchParams.get("categoryId") || "";
    sort = sort || urlObj.searchParams.get("sort") || "Accuracy";
    apiType = apiType || urlObj.searchParams.get("apiType") || "ItemSearch";
    queryType = queryType || urlObj.searchParams.get("queryType") || "Bestseller";
    page = page || urlObj.searchParams.get("page") || "1";
    itemId = itemId || urlObj.searchParams.get("itemId") || "";

    const rawYes24Key = Deno.env.get("YES24_API_KEY") || Deno.env.get("yes24_api_key");
    const aladinKey = Deno.env.get("ALADIN_API_KEY") || Deno.env.get("aladin_api_key");

    // =========================================================================
    // PRIMARY PATH: YES24 Open API
    // =========================================================================
    if (rawYes24Key) {
      const yes24Key = rawYes24Key.startsWith("yk_") ? rawYes24Key : `yk_${rawYes24Key}`;
      const headers = {
        "X-Api-Key": yes24Key,
        "Accept": "application/json",
      };

      // 1. Single Book Detail Lookup
      if (apiType === "ItemLookUp" || itemId) {
        const targetItemId = itemId || query;
        if (!targetItemId) {
          return new Response(
            JSON.stringify({ error: "ItemId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isIsbn = /^\d{10,13}$/.test(targetItemId);
        const searchType = isIsbn ? "ISBN13" : "ItemId";
        const fetchUrl = `https://apis.yes24.com/v1/goods/itemDetail?searchType=${searchType}&query=${encodeURIComponent(targetItemId)}&detail=Y`;

        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
          throw new Error(`YES24 itemDetail failed: ${res.status}`);
        }
        const data = await res.json();
        const rawItem = data.data?.items?.[0];

        if (!rawItem) {
          return new Response(
            JSON.stringify({ error: "Book not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const formatted = normalizeYes24Item(rawItem, targetItemId);
        return new Response(
          JSON.stringify({
            description: formatted.description,
            toc: formatted.toc,
            item: formatted,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Category Bestsellers / New Books
      if (apiType === "ItemList") {
        let targetCategory = "001001016"; // default 어린이
        if (categoryId === "13789" || categoryId === "001001027") {
          targetCategory = "001001027"; // 유아
        } else if (categoryId && categoryId.startsWith("001")) {
          targetCategory = categoryId;
        }

        const isBestseller = queryType === "Bestseller" || queryType === "BlogBest";
        const endpoint = isBestseller ? "bestseller" : "newproduct";
        const fetchUrl = `https://apis.yes24.com/v1/category/${endpoint}?categoryId=${targetCategory}&page=${page}&pageSize=50&detail=Y`;

        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
          throw new Error(`YES24 category ${endpoint} failed: ${res.status}`);
        }
        const data = await res.json();
        const items = (data.data?.items || []).map((it: any) => normalizeYes24Item(it));

        return new Response(
          JSON.stringify({
            totalResults: data.data?.totalCount || items.length,
            item: items,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Keyword Search (Goods Item Search)
      const targetQuery = query || "어린이 베스트셀러";
      const fetchUrl = `https://apis.yes24.com/v1/goods/itemList?query=${encodeURIComponent(targetQuery)}&page=${page}&pageSize=50&category=BOOK&detail=Y`;

      const res = await fetch(fetchUrl, { headers });
      if (!res.ok) {
        throw new Error(`YES24 itemList search failed: ${res.status}`);
      }
      const data = await res.json();
      const items = (data.data?.items || []).map((it: any) => normalizeYes24Item(it));

      return new Response(
        JSON.stringify({
          totalResults: data.data?.totalCount || items.length,
          item: items,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // FALLBACK PATH: Legacy Aladin Open API
    // =========================================================================
    if (!aladinKey) {
      return new Response(
        JSON.stringify({ error: "Neither YES24_API_KEY nor ALADIN_API_KEY is configured in Supabase environment secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let fetchUrl = "";
    if (apiType === "ItemLookUp" || itemId) {
      const targetItemId = itemId || query;
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${aladinKey}&itemIdType=ISBN13&ItemId=${targetItemId}&output=js&Version=20131101&OptResult=toc,description`;
    } else if (apiType === "ItemList") {
      const targetCategory = categoryId || "1108";
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemList.aspx?ttbkey=${aladinKey}&QueryType=${queryType}&MaxResults=50&start=1&SearchTarget=Book&Output=js&Version=20131101&Cover=Big&CategoryId=${targetCategory}`;
    } else if (apiType === "Search") {
      const targetQuery = query || "아동";
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${aladinKey}&Query=${encodeURIComponent(targetQuery)}&QueryType=Title&MaxResults=10&start=${page}&SearchTarget=Book&output=js&Version=20131101&CategoryId=13789&Cover=Big`;
    } else {
      const targetQuery = query || "아동";
      const targetCategory = categoryId || "1108";
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${aladinKey}&Query=${encodeURIComponent(targetQuery)}&Output=js&Version=20131101&SearchTarget=Book&CategoryId=${targetCategory}&MaxResults=50&Cover=Big&Sort=${sort}`;
    }

    const res = await fetch(fetchUrl, {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Windows; BookOk/1.0)" },
    });

    if (!res.ok) {
      throw new Error(`Aladin API call failed with status: ${res.status}`);
    }
    const data = await res.json();
    if (data.errorCode) {
      throw new Error(`Aladin API Error: ${data.errorMessage}`);
    }

    if (apiType === "ItemLookUp" || itemId) {
      const item = data.item?.[0];
      if (!item) {
        return new Response(
          JSON.stringify({ error: "Book not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          description: item.description || "",
          toc: item.toc || "",
          item: item,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch recommendations.", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
