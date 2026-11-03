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

interface WeeklyPlan {
  week: number;
  theme: string;
  goals: string[];
  recommendedBooks: {
    genre: string;
    suggestion: string;
    reason: string;
  }[];
  activities: string[];
}

interface ReadingPlan {
  summary: string;
  monthlyGoal: number;
  weeklyPlans: WeeklyPlan[];
  tips: string[];
  strengthAreas: string[];
  improvementAreas: string[];
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("openai_api_key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "OpenAI API Key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate Limit & User Resolution
    const userId = await resolveUserId(req);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "anonymous";
    const rateKey = userId ? `user:${userId}` : `ip:${clientIp}`;
    const limit = userId ? 20 : 5; // 4주 플랜은 무거운 호출이므로 10분당 로그인 20회, 비로그인 5회

    if (checkRateLimit(rateKey, limit)) {
      return new Response(
        JSON.stringify({ success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { childName = "아이", childAge = 7, readBooks = [], keywords = [], missingGenres = [] } = await req.json();

    const safeChildName = String(childName).slice(0, 30).replace(/[\r\n]/g, "");
    const safeChildAge = Math.min(Math.max(Number(childAge) || 7, 1), 18);
    const safeReadBooks = Array.isArray(readBooks) ? readBooks.slice(-30) : [];
    const safeKeywords = Array.isArray(keywords) ? keywords.slice(0, 10).map((k: any) => String(k).slice(0, 30)) : [];
    const safeMissingGenres = Array.isArray(missingGenres) ? missingGenres.slice(0, 10).map((g: any) => String(g).slice(0, 30)) : [];

    // Calculate monthly read count
    const monthlyReadCount = safeReadBooks.filter((book: any) => {
      const readDate = new Date(book.readDate);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return readDate >= oneMonthAgo;
    }).length;

    // Calculate average difficulty
    const difficultyMap: Record<string, number> = { "쉬움": 1, "적당": 2, "어려움": 3 };
    const avgDifficulty = safeReadBooks.reduce((sum: number, book: any) =>
      sum + (difficultyMap[book.difficulty || "적당"] || 2), 0
    ) / (safeReadBooks.length || 1);

    // Calculate average rating
    const avgRating = safeReadBooks.reduce((sum: number, book: any) =>
      sum + (Number(book.rating) || 3), 0
    ) / (safeReadBooks.length || 1);

    const prompt = `당신은 아동 독서 전문가입니다. 아래 정보를 바탕으로 개인화된 4주 독서 계획을 JSON 형식으로 생성해주세요.

## 아이 정보
- 이름: ${safeChildName}
- 나이: ${safeChildAge}세
- 최근 읽은 책 수: ${safeReadBooks.length}권
- 월간 독서량: ${monthlyReadCount}권
- 평균 난이도: ${avgDifficulty.toFixed(1)} (1:쉬움, 2:적당, 3:어려움)
- 평균 별점: ${avgRating.toFixed(1)}/5

## 읽은 책 목록 (최근 10권)
${safeReadBooks.slice(-10).map((b: any) => `- ${String(b.title).slice(0, 50)} (${String(b.category || "장르미상").slice(0, 20)}, 별점: ${b.rating || "미평가"}, 난이도: ${b.difficulty || "미평가"})`).join("\n")}

## AI 분석 키워드
${safeKeywords.join(", ") || "정보 없음"}

## 부족한 장르
${safeMissingGenres.join(", ") || "정보 없음"}

## 생성할 JSON 구조
{
  "summary": "전체 계획 요약 (2-3문장)",
  "monthlyGoal": 목표 권수(숫자),
  "weeklyPlans": [
    {
      "week": 1,
      "theme": "주간 테마",
      "goals": ["구체적 목표 1", "구체적 목표 2"],
      "recommendedBooks": [
        {
          "genre": "장르",
          "suggestion": "추천 도서 유형",
          "reason": "추천 이유"
        }
      ],
      "activities": ["독후 활동 1", "독후 활동 2"]
    }
  ],
  "tips": ["부모님 팁 1", "부모님 팁 2"],
  "strengthAreas": ["강점 분야 1", "강점 분야 2"],
  "improvementAreas": ["개선 필요 분야 1"]
}

중요 지침:
1. 아이의 나이(${safeChildAge}세)에 적합한 계획을 세워주세요.
2. 부족한 장르를 자연스럽게 포함시켜 균형 있는 독서를 유도해주세요.
3. 별점이 높았던 책 유형을 활용하고, 난이도가 적절하도록 조절해주세요.
4. 독후 활동은 창의적이고 실행 가능해야 합니다.
5. 반드시 유효한 JSON만 반환하세요. 다른 텍스트 없이 JSON만 출력하세요.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "당신은 아동 독서 교육 전문가입니다. 항상 유효한 JSON 형식으로만 응답합니다." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI API Error");
    }

    const responseText = data.choices[0]?.message?.content || "{}";

    let plan: ReadingPlan;
    try {
      plan = JSON.parse(responseText) as ReadingPlan;
    } catch {
      // Fallback plan
      plan = {
        summary: "개인화된 독서 계획을 생성하는 중 오류가 발생했습니다.",
        monthlyGoal: Math.max(4, monthlyReadCount + 2),
        weeklyPlans: [],
        tips: ["꾸준한 독서 습관이 중요합니다", "아이와 함께 책을 읽어보세요"],
        strengthAreas: [],
        improvementAreas: safeMissingGenres.slice(0, 2)
      };
    }

    return new Response(
      JSON.stringify({ success: true, plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
