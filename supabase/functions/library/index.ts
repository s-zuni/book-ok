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
    let apiType = "";
    let isbn = "";
    let libCodesStr = "";
    let region = "";
    let dtl_region = "";

    // 1. Try to read from POST JSON body first
    if (req.method === "POST") {
      try {
        const body = await req.clone().json();
        apiType = body.apiType || "";
        isbn = body.isbn || "";
        libCodesStr = body.libCodes || "";
        region = body.region || "";
        dtl_region = body.dtl_region || "";
      } catch (e) {
        // Ignore
      }
    }

    // 2. Fallback to URL search parameters
    const urlObj = new URL(req.url);
    apiType = apiType || urlObj.searchParams.get("apiType") || "";
    isbn = isbn || urlObj.searchParams.get("isbn") || "";
    libCodesStr = libCodesStr || urlObj.searchParams.get("libCodes") || "";
    region = region || urlObj.searchParams.get("region") || "";
    dtl_region = dtl_region || urlObj.searchParams.get("dtl_region") || "";

    let API_KEY = Deno.env.get("DATA4LIBRARY_API_KEY") || Deno.env.get("data4library_api_key");
    if (!API_KEY) {
      API_KEY = "c0bde3ba4483595bfd280c6bfa5bf7627b8d4477ce024e44c1ea1db1af866";
    }

    if (apiType === "book-status" || isbn) {
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
