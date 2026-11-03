import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting in-memory bucket (10분 윈도우)
const RATE_WINDOW_MS = 10 * 60 * 1000;
const localBuckets = new Map<string, number[]>();

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const recent = (localBuckets.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= limit) return true;
  recent.push(now);
  localBuckets.set(key, recent);
  if (localBuckets.size > 2000) {
    for (const [k, v] of localBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) localBuckets.delete(k);
    }
  }
  return false;
}

async function resolveUserId(req: Request): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !supabaseUrl || !anonKey || token === anonKey) return null;
  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data, error } = await authClient.auth.getUser(token);
    return error || !data?.user ? null : data.user.id;
  } catch {
    return null;
  }
}

// "흔한남매 원저/백난도 글/..." , "루리 글,그림", "백희나 저" → 대표 저자명만 추출
function cleanYes24Author(author: string | undefined): string {
  if (!author) return "저자 미상";
  let first = author.split("/")[0].split(",")[0].replace(/\(.*?\)/g, "").trim();
  let prev = "";
  while (prev !== first) {
    prev = first;
    first = first.replace(/\s+(원저|글그림|글|그림|저|지음|지은이|옮김|역)$/, "").trim();
  }
  return first || author;
}

serve(async (req) => {
  // CORS Preflight Request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("openai_api_key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API Key not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate Limit & User Resolution
    const userId = await resolveUserId(req);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "anonymous";
    const rateKey = userId ? `user:${userId}` : `ip:${clientIp}`;
    const limit = userId ? 30 : 10; // 로그인 10분당 30회, 비로그인 10분당 10회

    if (checkRateLimit(rateKey, limit)) {
      return new Response(
        JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, prompt, mode } = await req.json();

    // 입력 메시지 Sanitization: system 롤 차단, 최근 10개, 각 1000자 제한
    const sanitizedMessages = Array.isArray(messages)
      ? messages
          .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-10)
          .map((m: any) => ({
            role: m.role,
            content: String(m.content).slice(0, 1000)
          }))
      : [];

    let systemPrompt = "";
    let requestMessages: any[] = [];
    let candidateBooks: any[] = [];

    if (mode === "expert" || prompt) {
      // 독서 교육 및 발달 전문가 모드
      systemPrompt = "당신은 아동 독서 교육 및 발달 전문가입니다. 부모님들에게 아이의 독서 성향을 분석해주고, 맞춤형 조언과 솔루션을 제공하는 역할을 맡고 있습니다. 친절하고 전문적인 어조(존댓말)로 답변해주세요.";
      const userText = prompt ? String(prompt).slice(0, 1000) : (sanitizedMessages[sanitizedMessages.length - 1]?.content || "");
      requestMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ];
    } else {
      // AI 사서 모드 - YES24 실시간 도서 검색 Grounding 수행
      const lastUserMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || "";
      
      // 검색 키워드 정제
      let searchKeyword = lastUserMessage
        .replace(/[?.,!~]/g, " ")
        .replace(/추천해줘|추천해주세요|추천|알려줘|알려주세요|알고싶어|있을까|도서|책|아이|어린이|유아/g, " ")
        .trim();
      
      if (!searchKeyword || searchKeyword.length < 2) {
        searchKeyword = lastUserMessage.slice(0, 30).trim() || "베스트셀러";
      }

      const rawYes24Key = Deno.env.get("YES24_API_KEY") || Deno.env.get("yes24_api_key");

      try {
        if (rawYes24Key) {
          const yes24Key = rawYes24Key.startsWith("yk_") ? rawYes24Key : `yk_${rawYes24Key}`;
          const yesUrl = `https://apis.yes24.com/v1/goods/itemList?query=${encodeURIComponent(searchKeyword)}&page=1&pageSize=10&category=BOOK&detail=Y`;
          const yesRes = await fetch(yesUrl, {
            headers: { "X-Api-Key": yes24Key, "Accept": "application/json" }
          });
          if (yesRes.ok) {
            const yesData = await yesRes.json();
            if (Array.isArray(yesData.data?.items)) {
              candidateBooks = yesData.data.items.map((item: any) => {
                const bookId = String(item.goodsNo || item.id || "");
                return {
                  id: bookId,
                  bookid: bookId,
                  title: item.goodsName || item.title || "제목 정보 없음",
                  author: cleanYes24Author(item.author || item.authorName),
                  publisher: item.publisher || item.company || "출판사 미상",
                  description: item.description || item.goodsIntro || item.summary || "",
                  cover_url: item.imageUrl || item.goodsImgUrl || "",
                  purchase_url: item.linkUrl || (bookId ? `https://www.yes24.com/Product/Goods/${bookId}` : ""),
                  tags: item.categoryName ? [item.categoryName] : []
                };
              });
            }
          }
        }
      } catch (err) {
        console.warn("YES24 search failed in Edge Function:", err);
      }

      const booksContext = candidateBooks.length > 0
        ? `\n[후보 도서 목록]\n${candidateBooks.map((b, i) => `${i + 1}. [${b.id}] ${b.title} / ${b.author} / ${b.publisher}`).join("\n")}`
        : "";

      systemPrompt = `당신은 대한민국 최고의 어린이 도서 전문 AI 사서 '북콕(Book,ok)'입니다.
사용자의 질문이나 아이의 연령, 상황, 관심사를 바탕으로 가장 알맞은 도서를 따뜻하고 다정하게 추천해주세요.

[추천 원칙]
1. **정확성**: 반드시 후보 도서 목록에 있는 책을 우선적으로 추천하세요.
2. **이유 설명**: 왜 이 책을 아이에게 추천하는지 흥미 유발 포인트와 교육적 가치를 함께 설명하세요.
3. **독후 활동 제안**: 책을 읽은 후 부모와 아이가 함께 나눌 수 있는 간단한 대화 질문이나 활동을 1개 제시하세요.
4. **분량**: 답변은 400~600자 내외로 정갈하게 작성하세요.
5. **추천도서 태깅(필수)**:
   - 답변 맨 마지막 줄에 반드시 \`[RECOMMENDED_BOOKS: ISBN1, ISBN2, ISBN3]\` (또는 도서 ID) 형태로 3권의 정보를 기재해주세요.
   - 예시: [RECOMMENDED_BOOKS: 9788936434120, 9788954607346, 9788949112345]

${booksContext}
`;

      requestMessages = [
        { role: "system", content: systemPrompt },
        ...sanitizedMessages
      ];
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: requestMessages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI API Error");
    }

    const botMessage = mode === "expert" || prompt 
      ? { content: data.choices[0].message.content }
      : data.choices[0].message;

    // 추천 도서 객체 매칭
    let recommendedBooks: any[] = [];
    if (botMessage.content) {
      const match = botMessage.content.match(/\[RECOMMENDED_BOOKS:\s*(.*?)\]/);
      if (match) {
        const identifiers = match[1].split(',').map((t: string) => t.trim()).filter(Boolean);
        
        // 1. 후보 도서 목록에서 ID 또는 제목으로 매칭
        for (const id of identifiers) {
          const found = candidateBooks.find(b => 
            String(b.id) === id || 
            String(b.bookid) === id || 
            b.title.includes(id) || 
            id.includes(b.title)
          );
          if (found && !recommendedBooks.some(rb => rb.id === found.id)) {
            recommendedBooks.push(found);
          }
        }
      }

      // 후보 도서가 매칭되지 않았는데 후보 목록이 있다면 상위 3권 제공
      if (recommendedBooks.length === 0 && candidateBooks.length > 0) {
        recommendedBooks = candidateBooks.slice(0, 3);
      }
    }

    const result = {
      ...botMessage,
      books: recommendedBooks.length > 0 ? recommendedBooks : undefined
    };

    return new Response(
      JSON.stringify({ result, books: recommendedBooks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
