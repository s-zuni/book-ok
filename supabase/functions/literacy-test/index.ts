import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const YES24_BASE_URL = "https://apis.yes24.com/v1";
const SET_PATTERN = /전집|세트|\bset\b|전\s*\d+\s*권|\d+\s*권\s*(?:세트|전집)|\d+\s*[~\-]\s*\d+\s*권/i;
const isNotBookSet = (raw: any) => !SET_PATTERN.test(`${raw.title || ""} ${raw.goodsSortNm || ""}`);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

/** 학년별 기준 읽기 속도 (어절/분, WPM) */
const GRADE_WPM_NORMS: Record<number, { targetWpm: number; minWpm: number; maxWpm: number; label: string }> = {
  0: { targetWpm: 65, minWpm: 25, maxWpm: 160, label: "유아 (5~6세)" },
  1: { targetWpm: 105, minWpm: 45, maxWpm: 220, label: "초등 1학년" },
  2: { targetWpm: 135, minWpm: 60, maxWpm: 260, label: "초등 2학년" },
  3: { targetWpm: 165, minWpm: 75, maxWpm: 300, label: "초등 3학년" },
  4: { targetWpm: 195, minWpm: 90, maxWpm: 340, label: "초등 4학년" },
  5: { targetWpm: 225, minWpm: 105, maxWpm: 380, label: "초등 5학년" },
  6: { targetWpm: 250, minWpm: 120, maxWpm: 420, label: "초등 6학년" },
};

const AREA_LABELS: Record<string, string> = {
  vocabulary: "어휘력",
  factual: "사실적 이해",
  inferential: "추론적 이해",
  critical: "비판적 이해",
  fluency: "읽기 유창성",
};

/** 약점 영역별 처방 검색 키워드 및 처방 사유 템플릿 */
const PRESCRIPTION_MAP: Record<string, {
  keywordsByGrade: Record<string, string[]>;
  reasonTemplate: (childName: string, gradeLabel: string) => string;
  coachingTip: string;
}> = {
  vocabulary: {
    keywordsByGrade: {
      toddler: ["유아 말놀이 그림책", "의성어 의태어 동화"],
      lower: ["초등 저학년 어휘력 동화", "초등 속담 관용구 동화"],
      upper: ["초등 고학년 어휘력 비문학", "초등 한자어 문해력"],
    },
    reasonTemplate: (name, gradeLabel) =>
      `${name}(${gradeLabel})의 문맥 속 어휘 추론과 표현력을 풍부하게 확장해 주는 맞춤 처방 도서입니다.`,
    coachingTip: "책을 읽다 모르는 낱말이 나오면 바로 사전을 찾기보다 앞뒤 문장을 보고 뜻을 먼저 짐작해 보는 '문맥 추리 놀이'를 해보세요.",
  },
  factual: {
    keywordsByGrade: {
      toddler: ["유아 자연관찰 그림책", "호기심 과학 그림책"],
      lower: ["초등 저학년 과학 동화", "초등 저학년 지식 그림책"],
      upper: ["초등 고학년 과학 비문학", "초등 역사 문화 교양"],
    },
    reasonTemplate: (name, gradeLabel) =>
      `${name}(${gradeLabel})가 글의 핵심 정보와 육하원칙을 정확하게 파악하는 힘을 길러 주는 도서입니다.`,
    coachingTip: "한 장이나 한 단락을 읽은 뒤 '누가, 언제, 어디서, 무엇을 했을까?'를 한 문장으로 짧게 요약해 보는 대화를 나누어 보세요.",
  },
  inferential: {
    keywordsByGrade: {
      toddler: ["유아 감정 마음 그림책", "친구 우정 그림책"],
      lower: ["초등 저학년 탐정 추리 동화", "초등 창작동화 마음"],
      upper: ["초등 고학년 추리 동화", "초등 문학 성장 소설"],
    },
    reasonTemplate: (name, gradeLabel) =>
      `등장인물의 숨겨진 속마음과 사건의 원인을 깊이 있게 추론하도록 돕는 ${name} 맞춤 도서입니다.`,
    coachingTip: "이야기 중간에 책을 잠시 덮고 '만약 네가 주인공이라면 지금 어떤 기분이었을까? 다음에 어떻게 할까?'라고 질문해 주세요.",
  },
  critical: {
    keywordsByGrade: {
      toddler: ["유아 인성 생각 그림책", "배려 약속 그림책"],
      lower: ["초등 저학년 철학 동화", "초등 생각 키우기 동화"],
      upper: ["초등 고학년 어린이 철학 토론", "초등 사회 비판적 사고"],
    },
    reasonTemplate: (name, gradeLabel) =>
      `글쓴이의 주장을 스스로 판단하고 자신만의 논리적인 생각을 세우도록 돕는 ${name} 맞춤 도서입니다.`,
    coachingTip: "책을 다 읽은 뒤 '작가의 생각에 찬성하니, 아니면 다른 생각이 있니? 왜 그렇게 생각했어?'라고 아이의 근거를 물어봐 주세요.",
  },
  fluency: {
    keywordsByGrade: {
      toddler: ["유아 리듬 말놀이 그림책", "전래동화 그림책"],
      lower: ["초등 저학년 읽기 독립 동화", "초등 짧은 창작동화"],
      upper: ["초등 고학년 단편 문학", "초등 흥미진진 모험 동화"],
    },
    reasonTemplate: (name, gradeLabel) =>
      `${name}(${gradeLabel})가 글 읽기의 호흡을 익히고 막힘없이 즐겁게 완독하는 성취감을 주는 도서입니다.`,
    coachingTip: "부모님과 아이가 한 문장씩 번갈아 소리 내어 읽는 '주고받기 낭독'을 하면 읽기 리듬감과 집중력이 빠르게 자라납니다.",
  },
};

function mapAgeToGrade(age?: number | null, explicitGrade?: number | null): number {
  if (typeof explicitGrade === "number" && explicitGrade >= 0 && explicitGrade <= 6) {
    return explicitGrade;
  }
  const a = typeof age === "number" ? age : 8;
  if (a <= 6) return 0;
  if (a === 7) return 1;
  if (a === 8) return 2;
  if (a === 9) return 3;
  if (a === 10) return 4;
  if (a === 11) return 5;
  return 6;
}

/** Authorization 헤더의 사용자 JWT 검증. 익명(anon key) 또는 무효 토큰이면 null(게스트) */
async function resolveUserId(req: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === anonKey) return null;
  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data, error } = await authClient.auth.getUser(token);
    return error || !data?.user ? null : data.user.id;
  } catch {
    return null;
  }
}

/** 인스턴스 단위 best-effort 호출 제한 (OpenAI/YES24 비용 남용 방지) */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMITS: Record<string, number> = { start: 20, submit: 10 };
const rateBuckets = new Map<string, number[]>();

function isRateLimited(key: string, action: string): boolean {
  const limit = RATE_LIMITS[action] ?? 10;
  const now = Date.now();
  const bucketKey = `${action}:${key}`;
  const recent = (rateBuckets.get(bucketKey) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= limit) {
    rateBuckets.set(bucketKey, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(bucketKey, recent);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return false;
}

/** 진단 세션 토큰: 서버가 지문 인출 시각을 서명해 두고, 제출 시 실제 경과 시간으로 읽기 시간을 검증 */
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signSession(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

async function issueSessionToken(passageId: string, userId: string | null, secret: string): Promise<string> {
  const payload = `${passageId}|${userId || "guest"}|${Date.now()}`;
  return `${payload}|${await signSession(payload, secret)}`;
}

/** 유효하면 경과 시간(초), 아니면 null */
async function verifySessionToken(token: unknown, passageId: string, userId: string | null, secret: string): Promise<number | null> {
  if (typeof token !== "string") return null;
  const parts = token.split("|");
  if (parts.length !== 4) return null;
  const [pid, uid, issuedAt, sig] = parts;
  if (pid !== passageId || uid !== (userId || "guest")) return null;
  const expected = await signSession(`${pid}|${uid}|${issuedAt}`, secret);
  if (expected !== sig) return null;
  const elapsedMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > SESSION_TTL_MS) return null;
  return Math.floor(elapsedMs / 1000);
}

const QUESTION_AREAS = ["vocabulary", "factual", "inferential", "critical"] as const;
const MIN_CRITIC_SCORE = 80;

/** LLM 생성 문항의 구조·근거 검증: 영역별 1문항, 보기 4개(중복 없음), 정답 범위, evidence 원문 일치 */
function normalizeAndValidateQuestions(raw: any[], passageContent: string, criticScore: number) {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const compact = (s: string) => s.replace(/\s+/g, "");
  const content = compact(passageContent);
  const seenAreas = new Set<string>();
  const result = [];
  for (const q of raw) {
    if (!QUESTION_AREAS.includes(q?.area) || seenAreas.has(q.area)) return null;
    seenAreas.add(q.area);
    if (typeof q.question !== "string" || !q.question.trim()) return null;
    if (!Array.isArray(q.options) || q.options.length !== 4) return null;
    const options = q.options.map((o: unknown) => String(o ?? "").trim());
    if (options.some((o: string) => !o) || new Set(options).size !== 4) return null;
    const answer = Number(q.correct_answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) return null;
    if (typeof q.evidence !== "string" || !q.evidence.trim() || !content.includes(compact(q.evidence))) return null;
    if (typeof q.explanation !== "string" || !q.explanation.trim()) return null;
    result.push({
      area: q.area as typeof QUESTION_AREAS[number],
      question: q.question.trim(),
      options,
      correct_answer: answer,
      evidence: q.evidence.trim(),
      explanation: q.explanation.trim(),
      critic_score: criticScore,
    });
  }
  return result;
}

/** OpenAI 임베딩 생성 (text-embedding-3-small) */
async function generateEmbedding(text: string, openAiKey?: string): Promise<number[] | null> {
  if (!openAiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

/**
 * LangChain Pipeline Step 2 & 3:
 * Question Generator Chain (Structured JSON Schema) + Self-Correction Critic Agent
 */
async function generateAndVerifyQuestionsWithLLM(
  passage: any,
  openAiKey: string
): Promise<Array<{
  area: "vocabulary" | "factual" | "inferential" | "critical";
  question: string;
  options: string[];
  correct_answer: number;
  evidence: string;
  explanation: string;
  critic_score: number;
}> | null> {
  try {
    const gradeLabel = GRADE_WPM_NORMS[passage.grade_level]?.label || `초등 ${passage.grade_level}학년`;

    // 1. Question Generator Chain with Structured Output
    const genRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "literacy_question_set",
            strict: true,
            schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      area: { type: "string", enum: ["vocabulary", "factual", "inferential", "critical"] },
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correct_answer: { type: "integer" },
                      evidence: { type: "string" },
                      explanation: { type: "string" },
                    },
                    required: ["area", "question", "options", "correct_answer", "evidence", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content: `당신은 대한민국 교육부 초등 국어 교육과정 및 국립국어원 한국어기초사전 기반의 문해력 평가 출제 위원입니다.
제공된 지문을 읽고 대상 연령(${gradeLabel})에 맞는 4대 영역(vocabulary, factual, inferential, critical) 4지선다 문항을 정확히 1개씩 총 4문항 출제하세요.
[엄격 출제 규칙]
1. 정답 고유성: 4개 보기 중 정답은 오직 1개여야 하며, 오답 보기는 매력적이되 명확히 오답이어야 합니다.
2. 지문 기반성(Grounding): evidence 필드에는 반드시 지문 본문에 그대로 등장하는 문장(원문 일치)을 기재하세요.
3. 학년 어휘 적합성: ${gradeLabel} 수준을 벗어나는 한자어나 성인 용어를 사용하지 마세요.`,
          },
          {
            role: "user",
            content: `[지문 제목]: ${passage.title}\n[대상 학년]: ${gradeLabel}\n[지문 본문]:\n${passage.content}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!genRes.ok) return null;
    const genData = await genRes.json();
    const parsedGen = JSON.parse(genData.choices?.[0]?.message?.content || "{}");
    if (!normalizeAndValidateQuestions(parsedGen.questions, passage.content, 0)) return null;

    // 2. Self-Correction & Critic Agent Verification
    const criticRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `당신은 문해력 문항 품질 검수 에이전트(Critic Agent)입니다.
생성된 4개 문항에 대해 다음 3가지를 검수하고 수정본 JSON을 반환하세요:
1. 정답 고유성: 4개 보기 중 정답이 유일한가?
2. 지문 기반성: 지문을 읽어야만 풀 수 있고, evidence가 실제 지문 내 문장인가?
3. 학년 어휘 적합성: ${gradeLabel} 수준에 적합한가?
응답 형식: { "critic_score": 0~100, "questions": [검수 및 보완이 완료된 4개 문항 배열] }`,
          },
          {
            role: "user",
            content: `[지문 본문]:\n${passage.content}\n\n[생성된 문항]:\n${JSON.stringify(parsedGen.questions)}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(7000),
    });

    // Critic 검수를 통과하지 못한 문항은 저장·출제하지 않는다 (미검수 문항에 임의 점수 부여 금지)
    if (!criticRes.ok) return null;
    const criticData = await criticRes.json();
    const parsedCritic = JSON.parse(criticData.choices?.[0]?.message?.content || "{}");
    const criticScore = Number(parsedCritic.critic_score);
    if (!Number.isFinite(criticScore) || criticScore < MIN_CRITIC_SCORE) return null;
    return normalizeAndValidateQuestions(parsedCritic.questions, passage.content, Math.round(criticScore));
  } catch (e) {
    console.warn("LLM question generation/critic fallback:", e);
    return null;
  }
}

/** YES24 도서 검색으로 약점 보완 처방 도서 3권 인출 */
async function fetchPrescribedBooks(
  weakestArea: string,
  gradeLevel: number,
  childName: string,
  preferredTopics: string[] = []
): Promise<{ books: any[]; keywords: string[] }> {
  const gradeBucket = gradeLevel === 0 ? "toddler" : gradeLevel <= 2 ? "lower" : "upper";
  const gradeLabel = GRADE_WPM_NORMS[gradeLevel]?.label || `초등 ${gradeLevel}학년`;
  const config = PRESCRIPTION_MAP[weakestArea] || PRESCRIPTION_MAP.inferential;
  const searchQueries = [...(config.keywordsByGrade[gradeBucket] || ["초등 문해력 동화"])];

  const rawKey = (Deno.env.get("YES24_API_KEY") || Deno.env.get("yes24_api_key"))
    ?.trim()
    .replace(/^["']|["']$/g, "");
  if (!rawKey) {
    return { books: [], keywords: searchQueries };
  }
  const apiKey = rawKey.startsWith("yk_") ? rawKey : `yk_${rawKey}`;

  const books: any[] = [];
  const seenIsbn = new Set<string>();

  for (const query of searchQueries) {
    if (books.length >= 3) break;
    try {
      const url = `${YES24_BASE_URL}/goods/itemList?query=${encodeURIComponent(query)}&page=1&pageSize=12&category=BOOK&detail=Y`;
      const res = await fetch(url, {
        headers: { "X-Api-Key": apiKey, "Accept": "application/json" },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const rawItems = (data.data?.items || []).filter(isNotBookSet);
      for (const raw of rawItems) {
        if (books.length >= 3) break;
        const isbn = raw.isbn13 || raw.isbn10 || String(raw.itemId || "");
        if (!isbn || !raw.cover || seenIsbn.has(isbn)) continue;
        seenIsbn.add(isbn);
        const title = raw.title?.split(" - ")?.[0]?.trim() || raw.title || "추천 도서";
        books.push({
          id: isbn,
          bookid: isbn,
          isbn13: isbn,
          title,
          author: cleanAuthor(raw.author),
          publisher: raw.publisher || "",
          imgsrc: raw.cover,
          coverUrl: raw.cover,
          category: raw.goodsSortNm || "어린이 권장도서",
          description:
            raw.contentDetail?.bookIntroduction ||
            raw.contentDetail?.bookSummary ||
            config.reasonTemplate(childName, gradeLabel),
          rating: raw.starScore > 0 ? Math.round(raw.starScore * 5) / 10 : 4.8,
          purchaseUrl: raw.addOnLink || raw.link || "",
          prescriptionArea: AREA_LABELS[weakestArea] || "문해력 균형",
          prescriptionReason: config.reasonTemplate(childName, gradeLabel),
        });
      }
    } catch (e) {
      console.warn("YES24 prescription search error:", e);
    }
  }

  return { books, keywords: searchQueries };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openAiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("openai_api_key") || "";

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || "start";

    // 인증: 클라이언트가 보낸 userId는 신뢰하지 않고 JWT에서 직접 확인한다 (게스트는 null)
    const authUserId = await resolveUserId(req, supabaseUrl, supabaseAnonKey);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(authUserId || `ip:${clientIp}`, action)) {
      return json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429);
    }

    // 자녀 소유권 검증: 로그인한 부모의 자녀만 인정
    let ownedChildId: number | null = null;
    const requestedChildId = body.childId ? Number(body.childId) : NaN;
    if (authUserId && Number.isInteger(requestedChildId)) {
      const { data: ownedChild } = await supabase
        .from("children")
        .select("id")
        .eq("id", requestedChildId)
        .eq("parent_id", authUserId)
        .maybeSingle();
      if (ownedChild) ownedChildId = ownedChild.id;
    }

    // =====================================================================
    // ACTION 1: START TEST (Context Retriever + Verified Question Serving)
    // =====================================================================
    if (action === "start") {
      const targetGrade = mapAgeToGrade(body.childAge, body.gradeLevel);
      const childId = ownedChildId;
      const preferredTopics: string[] = Array.isArray(body.preferredTopics) ? body.preferredTopics : [];
      const preferredGenre: string | undefined = body.preferredGenre;

      // 1. 이미 아이가 최근에 풀었던 지문 ID 목록 조회 (중복 출제 방지)
      let excludedIds: string[] = [];
      if (childId && !Number.isNaN(childId)) {
        const { data: pastAssessments } = await supabase
          .from("literacy_assessments")
          .select("passage_id")
          .eq("child_id", childId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (pastAssessments) {
          excludedIds = pastAssessments.map((a: any) => a.passage_id).filter(Boolean);
        }
      }

      // 2. pgvector 유사도 검색 또는 학년/관심사 매칭으로 최적 지문 1편 인출
      let selectedPassage: any = null;

      if (openAiKey && (preferredTopics.length > 0 || preferredGenre)) {
        const queryText = `학년: ${targetGrade}, 관심사: ${preferredTopics.join(", ")} ${preferredGenre || ""}`;
        const queryEmbedding = await generateEmbedding(queryText, openAiKey);
        if (queryEmbedding) {
          const { data: matched } = await supabase.rpc("match_literacy_passage", {
            query_embedding: queryEmbedding,
            target_grade: targetGrade,
            excluded_passage_ids: excludedIds,
            match_count: 1,
          });
          if (Array.isArray(matched) && matched.length > 0) {
            selectedPassage = matched[0];
          }
        }
      }

      // Fallback / Metadata Retriever: 학년 일치 지문 인출 후 관심사 태그 오버랩 우선 정렬
      if (!selectedPassage) {
        const { data: candidates } = await supabase
          .from("literacy_passages")
          .select("*")
          .eq("is_active", true)
          .eq("grade_level", targetGrade);

        if (candidates && candidates.length > 0) {
          // 미응시 지문 우선 필터링 (만약 해당 학년의 모든 지문을 다 풀었다면 전체에서 재선택)
          const unvisited = candidates.filter((p: any) => !excludedIds.includes(p.id));
          const pool = unvisited.length > 0 ? unvisited : candidates;

          // 관심사 태그 매칭 점수 정렬
          const scored = pool.map((p: any) => {
            const tags: string[] = Array.isArray(p.interest_tags) ? p.interest_tags : [];
            const overlap = preferredTopics.filter((t) => tags.includes(t)).length;
            const genreMatch = preferredGenre && p.genre === preferredGenre ? 2 : 0;
            return { passage: p, score: overlap + genreMatch + Math.random() * 0.5 };
          });
          scored.sort((a, b) => b.score - a.score);
          selectedPassage = scored[0].passage;
        }
      }

      if (!selectedPassage) {
        return json({ error: "해당 학년의 문해력 진단 지문을 찾을 수 없습니다." }, 404);
      }

      // 3. 검수 완료된 문항 풀(literacy_questions) 조회
      const { data: existingQuestions } = await supabase
        .from("literacy_questions")
        .select("id, passage_id, area, question, options, correct_answer, evidence, explanation, critic_score")
        .eq("passage_id", selectedPassage.id)
        .eq("is_verified", true);

      const areaOrder = ["vocabulary", "factual", "inferential", "critical"];
      let finalQuestions = (existingQuestions || []).sort(
        (a: any, b: any) => areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area)
      );

      // 만약 DB에 검수된 문항이 없다면 실시간 LangChain Generator + Critic 파이프라인 가동 후 DB 캐싱
      if (finalQuestions.length < 4 && openAiKey) {
        const generated = await generateAndVerifyQuestionsWithLLM(selectedPassage, openAiKey);
        if (generated && generated.length === 4) {
          const toInsert = generated.map((q) => ({
            passage_id: selectedPassage.id,
            area: q.area,
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            evidence: q.evidence,
            explanation: q.explanation,
            critic_score: q.critic_score,
            is_verified: true,
          }));
          const questionColumns = "id, passage_id, area, question, options, correct_answer, evidence, explanation, critic_score";
          const { data: inserted, error: insertErr } = await supabase
            .from("literacy_questions")
            .insert(toInsert)
            .select(questionColumns);
          let ready = inserted;
          if (insertErr) {
            // 동시 요청이 먼저 저장했다면((passage_id, area) 유니크 충돌) 저장된 문항을 재조회
            const { data: refetched } = await supabase
              .from("literacy_questions")
              .select(questionColumns)
              .eq("passage_id", selectedPassage.id)
              .eq("is_verified", true);
            ready = refetched;
          }
          if (ready && ready.length > 0) {
            finalQuestions = ready.sort(
              (a: any, b: any) => areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area)
            );
          }
        }
      }

      // 정답·근거·해설은 채점 결과(submit)에서만 공개
      const publicQuestions = finalQuestions.map((q: any) => ({
        id: q.id,
        passage_id: q.passage_id,
        area: q.area,
        question: q.question,
        options: q.options,
      }));
      const sessionToken = await issueSessionToken(selectedPassage.id, authUserId, supabaseServiceKey);

      return json({
        session_token: sessionToken,
        passage: {
          id: selectedPassage.id,
          title: selectedPassage.title,
          content: selectedPassage.content,
          grade_level: selectedPassage.grade_level,
          grade_label: GRADE_WPM_NORMS[selectedPassage.grade_level]?.label || `초등 ${selectedPassage.grade_level}학년`,
          genre: selectedPassage.genre,
          interest_tags: selectedPassage.interest_tags || [],
          word_count: selectedPassage.word_count,
          char_count: selectedPassage.char_count,
          source_attribution: selectedPassage.source_attribution,
          key_vocabularies: selectedPassage.key_vocabularies || [],
          norm_wpm: GRADE_WPM_NORMS[selectedPassage.grade_level]?.targetWpm || 150,
        },
        questions: publicQuestions,
      });
    }

    // =====================================================================
    // ACTION 2: SUBMIT ANSWERS & PRESCRIPTIVE RAG
    // =====================================================================
    if (action === "submit") {
      const {
        childName = "우리 아이",
        passageId,
        gradeLevel = 2,
        readingTimeSeconds = 45,
        answers = [],
        preferredTopics = [],
      } = body;

      const elapsedSec = await verifySessionToken(body.sessionToken, String(body.passageId || ""), authUserId, supabaseServiceKey);
      if (elapsedSec === null) {
        return json({ error: "진단 세션이 만료되었거나 올바르지 않아요. 처음부터 다시 시작해 주세요." }, 400);
      }

      // 지문 및 문항 원본 조회
      const { data: passage } = await supabase
        .from("literacy_passages")
        .select("*")
        .eq("id", passageId)
        .single();

      const { data: questions } = await supabase
        .from("literacy_questions")
        .select("*")
        .eq("passage_id", passageId);

      if (!passage || !questions) {
        return json({ error: "진단 지문 또는 문항 정보를 찾을 수 없습니다." }, 404);
      }

      const norm = GRADE_WPM_NORMS[passage.grade_level] || GRADE_WPM_NORMS[2];

      // 1. 영역별 채점 (기본 점수 35점 + 정답 시 65점 + 풀이 시간/근거 가산점 구조로 0점 충격 방지 및 정밀 변별)
      const areaScores: Record<string, number> = {
        vocabulary: 40,
        factual: 40,
        inferential: 40,
        critical: 40,
      };

      const gradedAnswers = questions.map((q: any) => {
        const submitted = answers.find((a: any) => a.question_id === q.id);
        const selected = typeof submitted?.selected === "number" ? submitted.selected : -1;
        const isCorrect = selected === q.correct_answer;
        const timeSpentSec = Number(submitted?.time_spent_sec) || 10;

        // 정답일 경우 시간 적정성에 따라 92~100점, 오답일 경우 42~48점 부여 (5각형 차트 가독성 및 동기부여)
        if (isCorrect) {
          areaScores[q.area] = timeSpentSec <= 25 ? 98 : 92;
        } else {
          areaScores[q.area] = 45;
        }

        return {
          question_id: q.id,
          area: q.area,
          area_label: AREA_LABELS[q.area] || q.area,
          question: q.question,
          options: q.options,
          selected,
          correct_answer: q.correct_answer,
          is_correct: isCorrect,
          evidence: q.evidence,
          explanation: q.explanation,
          time_spent_sec: timeSpentSec,
        };
      });

      // 2. 읽기 유창성(Fluency) & Effective WPM 산출
      // 클라이언트가 보고한 읽기 시간은 서버가 확인한 실제 경과 시간을 넘을 수 없다
      const safeSeconds = Math.min(Math.max(Number(readingTimeSeconds) || 30, 5), Math.max(elapsedSec, 5));
      const rawWpm = Math.round((passage.word_count / (safeSeconds / 60)) * 10) / 10;
      const clampedWpm = Math.min(Math.max(rawWpm, norm.minWpm), norm.maxWpm);

      // 사실적 이해 및 어휘 정답률을 반영한 유효 유창성(Effective WPM)
      const accuracyFactor = 0.4 + 0.6 * ((areaScores.vocabulary + areaScores.factual) / 200);
      const effectiveWpm = Math.round(clampedWpm * accuracyFactor * 10) / 10;

      // 학년 목표 WPM 대비 유창성 점수 (50 ~ 98점)
      const wpmRatio = effectiveWpm / norm.targetWpm;
      let scoreFluency = Math.round(Math.min(Math.max(wpmRatio * 85, 48), 98));
      // 너무 빠르게 넘겼는데(초당 10어절 초과) 오답이 많다면 유창성 감점
      if (safeSeconds < passage.word_count / 10 && accuracyFactor < 0.75) {
        scoreFluency = 52;
      }

      const allAreaEntries: Array<[string, number]> = [
        ["vocabulary", areaScores.vocabulary],
        ["factual", areaScores.factual],
        ["inferential", areaScores.inferential],
        ["critical", areaScores.critical],
        ["fluency", scoreFluency],
      ];

      allAreaEntries.sort((a, b) => a[1] - b[1]);
      const weakestArea = allAreaEntries[0][0];
      const strengthArea = allAreaEntries[allAreaEntries.length - 1][0];

      const totalBliScore = Math.round(
        areaScores.vocabulary * 0.22 +
          areaScores.factual * 0.22 +
          areaScores.inferential * 0.22 +
          areaScores.critical * 0.20 +
          scoreFluency * 0.14
      );

      const bliTier =
        totalBliScore >= 90
          ? "숲 독서가 Lv.4"
          : totalBliScore >= 78
          ? "나무 독서가 Lv.3"
          : totalBliScore >= 65
          ? "새싹 독서가 Lv.2"
          : "씨앗 독서가 Lv.1";

      // 3. 처방형 도서 추천 RAG (YES24 연동)
      const { books: prescribedBooks, keywords: prescribedKeywords } = await fetchPrescribedBooks(
        weakestArea,
        passage.grade_level,
        childName,
        preferredTopics
      );

      // 4. 학부모용 맞춤 AI 진단 리포트 생성 (Deterministic + LLM Hybrid)
      const prescriptionConfig = PRESCRIPTION_MAP[weakestArea] || PRESCRIPTION_MAP.inferential;
      const correctCount = gradedAnswers.filter((g) => g.is_correct).length;

      let aiDiagnosisSummary = `### 📊 ${childName} 맞춤 문해력 진단 총평 (${norm.label})\n\n` +
        `**${childName}**은(는) **'${passage.title}'** 지문(${passage.word_count}어절)을 **${safeSeconds}초(유효 속도 ${effectiveWpm} 어절/분)** 만에 읽고, 4대 핵심 문해력 문항 중 **${correctCount}문항**을 정확히 해결하여 종합 문해력 지수 **${totalBliScore}점(${bliTier})**을 기록했습니다.\n\n` +
        `- **🌟 가장 돋보이는 강점 영역 — [${AREA_LABELS[strengthArea]}]**\n` +
        `  지문의 핵심 맥락을 빠르게 연결하고 이해하는 **${AREA_LABELS[strengthArea]}** 영역이 이번 진단에서 상대적으로 가장 좋은 결과를 보였습니다.\n` +
        `- **🌱 집중 보완이 필요한 영역 — [${AREA_LABELS[weakestArea]}]**\n` +
        `  상대적으로 **${AREA_LABELS[weakestArea]}** 영역에서 보완이 필요해 보입니다. ${prescriptionConfig.coachingTip}\n` +
        `- **ℹ️ 안내**\n` +
        `  지문 1편으로 확인한 참고용 점검 결과이며 전문적인 진단이 아닙니다. 여러 번 반복해 추이를 살펴보세요.\n\n` +
        `- **📚 처방형 독서 가이드**\n` +
        `  아래 처방된 **${AREA_LABELS[weakestArea]} 강화 맞춤 도서**를 이번 주 독서 플랜에 추가하여 하루 15분씩 함께 읽고 이야기를 나누어 보세요.`;

      if (openAiKey) {
        try {
          const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              temperature: 0.6,
              max_tokens: 650,
              messages: [
                {
                  role: "system",
                  content:
                    "당신은 Book,ok의 아동 문해력 코칭 도우미입니다. 진단 결과를 바탕으로 부모님께 따뜻한 마크다운 코칭 리포트를 작성하세요. 지문 1편 기반의 참고용 결과이므로 '또래 평균 대비' 같은 근거 없는 비교나 의학·발달 진단 표현은 쓰지 말고, 마지막에 참고용 점검 결과라는 점을 한 문장으로 덧붙이세요.",
                },
                {
                  role: "user",
                  content: `아동 이름: ${childName} (${norm.label})
읽은 지문: "${passage.title}" (${passage.genre}, ${passage.word_count}어절, 읽기 시간 ${safeSeconds}초, 유효 WPM: ${effectiveWpm})
영역별 점수: 어휘력 ${areaScores.vocabulary}점, 사실적 이해 ${areaScores.factual}점, 추론적 이해 ${areaScores.inferential}점, 비판적 이해 ${areaScores.critical}점, 읽기 유창성 ${scoreFluency}점 (종합 BLI: ${totalBliScore}점, 등급: ${bliTier})
강점 영역: ${AREA_LABELS[strengthArea]}, 보완 필요 영역: ${AREA_LABELS[weakestArea]}

다음 구성으로 400~550자 내외의 마크다운 리포트를 작성하세요:
1. ### 📊 ${childName} 문해력 진단 총평
2. **🌟 강점 분석 (${AREA_LABELS[strengthArea]})**
3. **🌱 보완 포인트 및 가정 내 독서 지도 팁 (${AREA_LABELS[weakestArea]})** (실천 팁 2가지 글머리 기호 제시)`,
                },
              ],
            }),
            signal: AbortSignal.timeout(5500),
          });
          if (llmRes.ok) {
            const llmData = await llmRes.json();
            const content = llmData.choices?.[0]?.message?.content?.trim();
            if (content && content.length > 80) {
              aiDiagnosisSummary = content;
            }
          }
        } catch {
          // Keep deterministic expert report on timeout/401
        }
      }

      // 5. DB 저장 (로그인 + 자녀 선택 상태인 경우)
      let savedAssessmentId: string | null = null;
      if (authUserId && ownedChildId !== null) {
        const { data: saved, error: saveErr } = await supabase
          .from("literacy_assessments")
          .insert({
            user_id: authUserId,
            child_id: ownedChildId,
            passage_id: passage.id,
            grade_level: passage.grade_level,
            reading_time_seconds: safeSeconds,
            raw_wpm: rawWpm,
            effective_wpm: effectiveWpm,
            answers: gradedAnswers,
            score_vocabulary: areaScores.vocabulary,
            score_factual: areaScores.factual,
            score_inferential: areaScores.inferential,
            score_critical: areaScores.critical,
            score_fluency: scoreFluency,
            total_bli_score: totalBliScore,
            bli_tier: bliTier,
            weakest_area: weakestArea,
            strength_area: strengthArea,
            ai_diagnosis_summary: aiDiagnosisSummary,
            prescribed_keywords: prescribedKeywords,
            prescribed_books: prescribedBooks,
          })
          .select("id")
          .single();

        if (!saveErr && saved) {
          savedAssessmentId = saved.id;
        } else if (saveErr) {
          console.warn("Failed to insert literacy_assessment:", saveErr);
        }
      }

      return json({
        assessment: {
          id: savedAssessmentId || crypto.randomUUID(),
          passage_id: passage.id,
          passage_title: passage.title,
          passage_content: passage.content,
          passage_genre: passage.genre,
          word_count: passage.word_count,
          grade_level: passage.grade_level,
          grade_label: norm.label,
          norm_wpm: norm.targetWpm,
          reading_time_seconds: safeSeconds,
          raw_wpm: rawWpm,
          effective_wpm: effectiveWpm,
          score_vocabulary: areaScores.vocabulary,
          score_factual: areaScores.factual,
          score_inferential: areaScores.inferential,
          score_critical: areaScores.critical,
          score_fluency: scoreFluency,
          total_bli_score: totalBliScore,
          bli_tier: bliTier,
          weakest_area: weakestArea,
          weakest_area_label: AREA_LABELS[weakestArea],
          strength_area: strengthArea,
          strength_area_label: AREA_LABELS[strengthArea],
          ai_diagnosis_summary: aiDiagnosisSummary,
          coaching_tip: prescriptionConfig.coachingTip,
          answers: gradedAnswers,
          prescribed_keywords: prescribedKeywords,
          prescribed_books: prescribedBooks,
          created_at: new Date().toISOString(),
        },
      });
    }

    return json({ error: `Unsupported action: ${action}` }, 400);
  } catch (err: any) {
    console.error("literacy-test error:", err);
    return json({ error: "문해력 진단 처리 중 오류가 발생했습니다." }, 500);
  }
});

