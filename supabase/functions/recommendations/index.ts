import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const urlObj = new URL(req.url);
    const query = urlObj.searchParams.get("query") || urlObj.searchParams.get("q");
    const categoryId = urlObj.searchParams.get("categoryId");
    const sort = urlObj.searchParams.get("sort") || "Accuracy";
    const apiType = urlObj.searchParams.get("apiType") || "ItemSearch"; // 'ItemSearch', 'ItemList', 'ItemLookUp', 'Search'
    const queryType = urlObj.searchParams.get("queryType") || "Bestseller";
    const page = urlObj.searchParams.get("page") || "1";
    const itemId = urlObj.searchParams.get("itemId");

    // Get API Key from Supabase env
    let ALADIN_KEY = Deno.env.get("ALADIN_API_KEY");
    if (!ALADIN_KEY) {
      // Fallback key if env is not configured yet
      ALADIN_KEY = "ttbzxzx7290920001";
    }

    let fetchUrl = "";

    if (apiType === "ItemLookUp" || itemId) {
      // 1. Book Detail (book-detail/route.ts 이관)
      const targetItemId = itemId || query;
      if (!targetItemId) {
        return new Response(
          JSON.stringify({ error: "ItemId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ALADIN_KEY}&itemIdType=ISBN13&ItemId=${targetItemId}&output=js&Version=20131101&OptResult=toc,description`;
    } else if (apiType === "ItemList") {
      // 2. Recommendations List (recommendations/route.ts 이관)
      const targetCategory = categoryId || "1108";
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemList.aspx?ttbkey=${ALADIN_KEY}&QueryType=${queryType}&MaxResults=50&start=1&SearchTarget=Book&Output=js&Version=20131101&Cover=Big&CategoryId=${targetCategory}`;
    } else if (apiType === "Search") {
      // 3. Simple Title Search (search/route.ts 이관)
      const targetQuery = query || "아동";
      fetchUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_KEY}&Query=${encodeURIComponent(targetQuery)}&QueryType=Title&MaxResults=10&start=${page}&SearchTarget=Book&output=js&Version=20131101&CategoryId=13789&Cover=Big`;
    } else {
      // 4. Default ItemSearch (recommendations/route.ts 이관)
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

    // Book Detail format matching (book-detail/route.ts 이관 형식)
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

    // List and Search default json pass back
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
