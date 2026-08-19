import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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
      } catch (e) {
        // Ignore JSON parsing errors for compatibility
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

    // Get API Key from Supabase env
    const ALADIN_KEY = Deno.env.get("ALADIN_API_KEY") || Deno.env.get("aladin_api_key");
    if (!ALADIN_KEY) {
      return new Response(
        JSON.stringify({ error: "ALADIN_API_KEY is not configured in Supabase environment secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let fetchUrl = "";

    if (apiType === "ItemLookUp" || itemId) {
      const targetItemId = itemId || query;
      if (!targetItemId) {
        return new Response(
          JSON.stringify({ error: "ItemId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ALADIN_KEY}&itemIdType=ISBN13&ItemId=${targetItemId}&output=js&Version=20131101&OptResult=toc,description`;
    } else if (apiType === "ItemList") {
      const targetCategory = categoryId || "1108";
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemList.aspx?ttbkey=${ALADIN_KEY}&QueryType=${queryType}&MaxResults=50&start=1&SearchTarget=Book&Output=js&Version=20131101&Cover=Big&CategoryId=${targetCategory}`;
    } else if (apiType === "Search") {
      const targetQuery = query || "아동";
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_KEY}&Query=${encodeURIComponent(targetQuery)}&QueryType=Title&MaxResults=10&start=${page}&SearchTarget=Book&output=js&Version=20131101&CategoryId=13789&Cover=Big`;
    } else {
      const targetQuery = query || "아동";
      const targetCategory = categoryId || "1108";
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_KEY}&Query=${encodeURIComponent(targetQuery)}&Output=js&Version=20131101&SearchTarget=Book&CategoryId=${targetCategory}&MaxResults=50&Cover=Big&Sort=${sort}`;
    }

    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows; BookOk/1.0)",
      },
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
