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
    const apiType = urlObj.searchParams.get("apiType"); // 'search' or 'book-status'
    
    let API_KEY = Deno.env.get("DATA4LIBRARY_API_KEY");
    if (!API_KEY) {
      // Fallback auth key
      API_KEY = "6be31d996e38b30fa59d6be40c0f4f9f257a4192b0c36f54c935400ad6b85cc1";
    }

    if (apiType === "book-status" || urlObj.searchParams.has("isbn")) {
      // 1. 도서관 소장 여부 확인 (library/book-status/route.ts 이관)
      const isbn = urlObj.searchParams.get("isbn");
      const libCodesStr = urlObj.searchParams.get("libCodes");

      if (!isbn) {
        return new Response(
          JSON.stringify({ error: "isbn parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!libCodesStr) {
        return new Response(
          JSON.stringify({ results: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const libCodes = libCodesStr.split(",").map((code) => code.trim()).filter(Boolean);

      const fetchPromises = libCodes.map(async (libCode) => {
        const fetchUrl = `http://data4library.kr/api/bookExist?authKey=${API_KEY}&libCode=${libCode}&isbn13=${isbn}&format=json`;
        try {
          const response = await fetch(fetchUrl);
          if (!response.ok) {
            throw new Error(`Status check failed with status ${response.status}`);
          }
          const data = await response.json();
          const result = data.response?.result || {};

          return {
            libCode,
            hasBook: result.hasBook || "N",
            loanAvailable: result.loanAvailable || "N",
          };
        } catch (err: any) {
          return {
            libCode,
            hasBook: "N",
            loanAvailable: "N",
            error: err.message,
          };
        }
      });

      const results = await Promise.all(fetchPromises);
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // 2. 도서관 목록 검색 (library/search/route.ts 이관)
      const region = urlObj.searchParams.get("region");
      const dtl_region = urlObj.searchParams.get("dtl_region");

      let fetchUrl = `http://data4library.kr/api/libSrch?authKey=${API_KEY}&format=json&pageSize=150`;
      if (region) fetchUrl += `&region=${region}`;
      if (dtl_region) fetchUrl += `&dtl_region=${dtl_region}`;

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Data4Library API failed with status ${response.status}`);
      }

      const data = await response.json();

      const libsData = (data.response?.libs || []) as Record<string, any>[];
      const libraries = libsData.map((item) => {
        const lib = (item.doc || item.lib || {}) as Record<string, any>;
        return {
          libCode: String(lib.libCode || ""),
          libName: String(lib.libName || ""),
          address: String(lib.address || ""),
        };
      }).filter((lib) => lib.libCode && lib.libName);

      return new Response(
        JSON.stringify({ libraries }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
