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

    const API_KEY = Deno.env.get("DATA4LIBRARY_API_KEY") || Deno.env.get("data4library_api_key") || "c0bde3ba4483595bfd280c6bfa5bf7627b8d4477ce024e44c1ea1db1af866";

    // Helper for fast fetching with timeout
    const fetchWithTimeout = async (url: string, timeoutMs: number = 3500) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return res;
      } catch (err) {
        clearTimeout(id);
        return null;
      }
    };

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
        try {
          // 1. Check book existence & loan availability
          const existUrl = `http://data4library.kr/api/bookExist?authKey=${API_KEY}&libCode=${libCode}&isbn13=${isbn}&format=json`;
          const existRes = await fetchWithTimeout(existUrl, 3000);
          const existData = (existRes && existRes.ok) ? await existRes.json() : {};
          const existResult = existData.response?.result || {};
          const hasBook = existResult.hasBook || "N";
          const loanAvailable = existResult.loanAvailable || "N";

          let callNumber = "";
          let shelfLocName = "";
          let separateShelfName = "";

          // 2. If held at library, fetch item details (call number, shelf location)
          if (hasBook === "Y") {
            try {
              const itemUrl = `http://data4library.kr/api/itemSrch?authKey=${API_KEY}&libCode=${libCode}&isbn13=${isbn}&type=ALL&format=json`;
              const itemRes = await fetchWithTimeout(itemUrl, 3000);
              if (itemRes && itemRes.ok) {
                const itemData = await itemRes.json();
                const docs = itemData.response?.docs || [];
                if (docs.length > 0) {
                  const doc = docs[0]?.doc || {};
                  callNumber = doc.callNumber || doc.callNumbers?.[0]?.callNumber?.callNumber || "";
                  shelfLocName = doc.shelf_loc_name || doc.callNumbers?.[0]?.callNumber?.shelf_loc_name || "";
                  separateShelfName = doc.separate_shelf_name || doc.callNumbers?.[0]?.callNumber?.separate_shelf_name || "";
                }
              }
            } catch (e) {
              console.warn(`Failed to fetch itemSrch for libCode ${libCode}:`, e);
            }
          }

          // 3. Fetch library detailed metadata (homepage, operatingTime, closed, address, tel)
          let homepage = "";
          let operatingTime = "";
          let closed = "";
          let tel = "";
          let address = "";

          try {
            const libInfoUrl = `http://data4library.kr/api/libSrch?authKey=${API_KEY}&libCode=${libCode}&format=json`;
            const libRes = await fetchWithTimeout(libInfoUrl, 3000);
            if (libRes && libRes.ok) {
              const libData = await libRes.json();
              const libs = libData.response?.libs || [];
              if (libs.length > 0) {
                const libInfo = libs[0]?.lib || libs[0]?.doc || {};
                homepage = libInfo.homepage || "";
                operatingTime = libInfo.operatingTime || "";
                closed = libInfo.closed || "";
                tel = libInfo.tel || "";
                address = libInfo.address || "";
              }
            }
          } catch (e) {
            console.warn(`Failed to fetch libSrch for libCode ${libCode}:`, e);
          }

          return {
            libCode,
            hasBook,
            loanAvailable,
            callNumber,
            shelfLocName,
            separateShelfName,
            homepage,
            operatingTime,
            closed,
            tel,
            address,
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
