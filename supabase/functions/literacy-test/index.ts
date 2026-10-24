import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import {
  AREA_LABELS,
  GRADE_WPM_NORMS,
  QUESTION_AREAS,
  SCORING_VERSION,
  computeAreaScores,
  computeFluency,
  computeTotal,
  gradeAnswers,
  gradeWordQuestion,
  MIN_WORD_POOL,
  optionOrder,
  pickWordQuestions,
  servedPassageQuestions,
  pickExtremes,
  tierFor,
} from "./scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const YES24_BASE_URL = "https://apis.yes24.com/v1";
const SET_PATTERN = /전집|세트|\bset\b|전\s*\d+\s*권|\d+\s*권\s*(?:세트|전집)|\d+\s*[~\-]\s*\d+\s*권/i;
// 전집/세트와 학습서(문제집·워크북 등)는 처방 도서에서 제외한다
const WORKBOOK_PATTERN = /문제집|워크북|학습지|교재|기출|해설집|독해력?s*(?:훈련|평가|테스트)|받아쓰기|연습장|쓰기s*노트|한자s*급수/;
const isStoryOrKnowledgeBook = (raw: any) => {
  const text = `${raw.title || ""} ${raw.goodsSortNm || ""}`;
  return !SET_PATTERN.test(text) && !WORKBOOK_PATTERN.test(text);
};

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
  balanced: {
    keywordsByGrade: {
      toddler: ["유아 인기 그림책", "유아 창작 그림책"],
      lower: ["초등 저학년 창작동화", "초등 저학년 그림책"],
      upper: ["초등 고학년 창작동화", "초등 청소년 소설"],
    },
    reasonTemplate: (_name, gradeLabel) =>
      `${gradeLabel} 아이가 흥미를 느끼며 다양한 글을 접해 볼 수 있는 도서예요.`,
    coachingTip: "이번 결과에서는 영역별 차이가 뚜렷하지 않았어요. 아이가 좋아하는 책을 함께 읽고 이야기를 나누며 꾸준히 읽는 습관을 이어 가 보세요.",
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

/** 호출 제한: DB RPC(literacy_rate_limit_hit)를 우선 사용하고, RPC 실패 시 인스턴스 메모리로 대체 */
const RATE_WINDOW_SECONDS = 10 * 60;
const RATE_LIMITS: Record<string, number> = { start: 20, submit: 10, check: 120 };
const localBuckets = new Map<string, number[]>();

function isRateLimitedLocal(key: string, action: string): boolean {
  const limit = RATE_LIMITS[action] ?? 10;
  const now = Date.now();
  const bucketKey = `${action}:${key}`;
  const recent = (localBuckets.get(bucketKey) || []).filter((t) => now - t < RATE_WINDOW_SECONDS * 1000);
  const limited = recent.length >= limit;
  if (!limited) recent.push(now);
  localBuckets.set(bucketKey, recent);
  if (localBuckets.size > 5000) {
    for (const [k, v] of localBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_SECONDS * 1000)) localBuckets.delete(k);
    }
  }
  return limited;
}

async function isRateLimited(supabase: any, key: string, action: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("literacy_rate_limit_hit", {
      p_key: key,
      p_action: action,
      p_limit: RATE_LIMITS[action] ?? 10,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (!error && typeof data === "boolean") return data;
    console.warn("literacy_rate_limit_hit unavailable, using local limiter:", error?.message);
  } catch (e) {
    console.warn("literacy_rate_limit_hit failed, using local limiter:", e);
  }
  return isRateLimitedLocal(key, action);
}

/**
 * 진단 세션 토큰: passageId|user|issuedAt|nonce|wordIds(쉼표 구분, 없으면 빈 값)|sig
 * - 서버가 지문 인출 시각을 서명해 두고, 제출 시 실제 경과 시간으로 읽기 시간을 검증
 * - nonce는 보기 섞기 시드이자 1회용 제출 식별자
 */
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signSession(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

async function issueSessionToken(
  passageId: string,
  userId: string | null,
  nonce: string,
  secret: string,
  wordIds: string[] = []
): Promise<string> {
  const payload = `${passageId}|${userId || "guest"}|${Date.now()}|${nonce}|${wordIds.join(",")}`;
  return `${payload}|${await signSession(payload, secret)}`;
}

/** 유효하면 경과 시간(초)과 nonce, 아니면 null */
async function verifySessionToken(
  token: unknown,
  passageId: string,
  userId: string | null,
  secret: string
): Promise<{ elapsedSec: number; nonce: string; wordIds: string[] } | null> {
  if (typeof token !== "string") return null;
  const parts = token.split("|");
  if (parts.length !== 6) return null;
  const [pid, uid, issuedAt, nonce, wordField, sig] = parts;
  if (pid !== passageId || uid !== (userId || "guest")) return null;
  const expected = await signSession(`${pid}|${uid}|${issuedAt}|${nonce}|${wordField}`, secret);
  if (expected !== sig) return null;
  const elapsedMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > SESSION_TTL_MS) return null;
  return { elapsedSec: Math.floor(elapsedMs / 1000), nonce, wordIds: wordField ? wordField.split(",") : [] };
}

/** 이름은 화면·프롬프트에 그대로 들어가므로 마크업·제어 문자를 제거하고 길이를 제한한다 */
function sanitizeName(name: unknown): string {
  const cleaned = String(name ?? "")
    .replace(/[\u0000-\u001f\u007f<>&"'`[\]()*_#|\\]/g, "")
    .trim()
    .slice(0, 20);
  return cleaned || "우리 아이";
}

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

/** YES24 도서 검색으로 보완 영역 관련 도서 3권 인출 (키워드별 검색은 병렬 실행) */
async function fetchPrescribedBooks(
  weakestArea: string,
  gradeLevel: number,
  childName: string
): Promise<{ books: any[]; keywords: string[] }> {
  const gradeBucket = gradeLevel === 0 ? "toddler" : gradeLevel <= 2 ? "lower" : "upper";
  const gradeLabel = GRADE_WPM_NORMS[gradeLevel]?.label || `초등 ${gradeLevel}학년`;
  const config = PRESCRIPTION_MAP[weakestArea] || PRESCRIPTION_MAP.balanced;
  const searchQueries = [...(config.keywordsByGrade[gradeBucket] || ["초등 추천 동화"])];

  const rawKey = (Deno.env.get("YES24_API_KEY") || Deno.env.get("yes24_api_key"))
    ?.trim()
    .replace(/^["']|["']$/g, "");
  if (!rawKey) {
    return { books: [], keywords: searchQueries };
  }
  const apiKey = rawKey.startsWith("yk_") ? rawKey : `yk_${rawKey}`;

  const perQuery = await Promise.all(
    searchQueries.map(async (query) => {
      try {
        const url = `${YES24_BASE_URL}/goods/itemList?query=${encodeURIComponent(query)}&page=1&pageSize=12&category=BOOK&detail=Y`;
        const res = await fetch(url, {
          headers: { "X-Api-Key": apiKey, "Accept": "application/json" },
          signal: AbortSignal.timeout(3500),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return ((data.data?.items || []) as any[]).filter(isStoryOrKnowledgeBook).map((raw) => ({ raw, query }));
      } catch (e) {
        console.warn("YES24 prescription search error:", e);
        return [];
      }
    })
  );

  const books: any[] = [];
  const seenIsbn = new Set<string>();
  for (const { raw, query } of perQuery.flat()) {
    if (books.length >= 3) break;
    const isbn = raw.isbn13 || raw.isbn10 || String(raw.itemId || "");
    if (!isbn || !raw.cover || seenIsbn.has(isbn)) continue;
    seenIsbn.add(isbn);
    books.push({
      id: isbn,
      bookid: isbn,
      isbn13: isbn,
      title: raw.title?.split(" - ")?.[0]?.trim() || raw.title || "추천 도서",
      author: cleanAuthor(raw.author),
      publisher: raw.publisher || "",
      imgsrc: raw.cover,
      coverUrl: raw.cover,
      category: raw.goodsSortNm || "어린이 도서",
      description:
        raw.contentDetail?.bookIntroduction ||
        raw.contentDetail?.bookSummary ||
        config.reasonTemplate(childName, gradeLabel),
      // 평점 정보가 없으면 비워 둔다 (임의 값 표시 금지)
      rating: raw.starScore > 0 ? Math.round(raw.starScore * 5) / 10 : undefined,
      purchaseUrl: raw.addOnLink || raw.link || "",
      prescriptionArea: AREA_LABELS[weakestArea] || AREA_LABELS.balanced,
      prescriptionReason: config.reasonTemplate(childName, gradeLabel),
      prescriptionKeyword: query,
    });
  }

  return { books, keywords: searchQueries };
}

/** 낱말 퀴즈가 어휘 영역을 대신할 때는 지문 문항에서 어휘 영역을 요구하지 않는다 */
const PASSAGE_AREAS_WORD_MODE = QUESTION_AREAS.filter((a) => a !== "vocabulary");

/** 검수된 문항이 필요한 영역을 모두 갖췄는지 */
function coversAllAreas(questions: any[] | null | undefined, wordMode = false): boolean {
  const areas = wordMode ? PASSAGE_AREAS_WORD_MODE : QUESTION_AREAS;
  return !!questions && areas.every((a) => questions.some((q: any) => q.area === a));
}

const WORD_COLUMNS = "id, question_type, area, question, options, correct_answer, explanation";

const QUESTION_COLUMNS = "id, passage_id, area, item_order, question, options, correct_answer, evidence, explanation, critic_score";

/** 이 학년의 검수 완료 낱말 퀴즈 풀. 충분하지 않으면 빈 배열(= 지문 어휘 문항 사용) */
async function loadWordPool(supabase: any, grade: number): Promise<any[]> {
  const { data, error } = await supabase
    .from("literacy_questions")
    .select(WORD_COLUMNS)
    .is("passage_id", null)
    .eq("grade_level", grade)
    .eq("is_verified", true);
  if (error) {
    console.warn("literacy word pool unavailable:", error.message);
    return [];
  }
  return data && data.length >= MIN_WORD_POOL ? data : [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let consumedNonce: string | null = null;
  let supabase: any = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openAiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("openai_api_key") || "";
    // 사람 검수 없는 런타임 문항 생성은 기본 비활성 (명시적으로 켠 경우에만)
    const allowRuntimeGeneration = Deno.env.get("LITERACY_ALLOW_RUNTIME_GENERATION") === "true";

    supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || "start";

    // 인증: 클라이언트가 보낸 userId는 신뢰하지 않고 JWT에서 직접 확인한다 (게스트는 null)
    const authUserId = await resolveUserId(req, supabaseUrl, supabaseAnonKey);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(supabase, authUserId || `ip:${clientIp}`, action)) {
      return json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429);
    }

    // 자녀 소유권 검증: 로그인한 부모의 자녀만 인정. 이름도 클라이언트가 아닌 DB 값을 쓴다.
    let ownedChildId: number | null = null;
    let ownedChildName = "우리 아이";
    const requestedChildId = body.childId ? Number(body.childId) : NaN;
    if (authUserId && Number.isInteger(requestedChildId)) {
      const { data: ownedChild } = await supabase
        .from("children")
        .select("id, name")
        .eq("id", requestedChildId)
        .eq("parent_id", authUserId)
        .maybeSingle();
      if (ownedChild) {
        ownedChildId = ownedChild.id;
        ownedChildName = sanitizeName(ownedChild.name);
      }
    }

    // =====================================================================
    // ACTION 1: START — 지문 인출 + 검수 완료 문항 제공 (보기는 세션마다 섞음)
    // =====================================================================
    if (action === "start") {
      const targetGrade = mapAgeToGrade(body.childAge, body.gradeLevel);
      const preferredTopics: string[] = Array.isArray(body.preferredTopics) ? body.preferredTopics.map(String) : [];
      const preferredGenre: string | undefined = typeof body.preferredGenre === "string" ? body.preferredGenre : undefined;

      // 1. 최근에 푼 지문은 제외 (중복 출제 방지)
      let excludedIds: string[] = [];
      if (ownedChildId !== null) {
        const { data: pastAssessments } = await supabase
          .from("literacy_assessments")
          .select("passage_id")
          .eq("child_id", ownedChildId)
          .order("created_at", { ascending: false })
          .limit(10);
        excludedIds = (pastAssessments || []).map((a: any) => a.passage_id).filter(Boolean);
      }

      // 2. 학년 일치 지문 중 미응시 지문 우선, 관심사 태그·장르 일치 가중
      const { data: candidates } = await supabase
        .from("literacy_passages")
        .select("*")
        .eq("is_active", true)
        .eq("grade_level", targetGrade);

      let selectedPassage: any = null;
      if (candidates && candidates.length > 0) {
        const unvisited = candidates.filter((p: any) => !excludedIds.includes(p.id));
        const pool = unvisited.length > 0 ? unvisited : candidates;
        const scored = pool.map((p: any) => {
          const tags: string[] = Array.isArray(p.interest_tags) ? p.interest_tags : [];
          const overlap = preferredTopics.filter((t) => tags.includes(t)).length;
          const genreMatch = preferredGenre && p.genre === preferredGenre ? 2 : 0;
          return { passage: p, score: overlap + genreMatch + Math.random() * 0.5 };
        });
        scored.sort((a: any, b: any) => b.score - a.score);
        selectedPassage = scored[0].passage;
      }

      if (!selectedPassage) {
        return json({ error: "해당 학년의 문해력 진단 지문을 찾을 수 없습니다." }, 404);
      }

      // 3. 검수 완료 문항 (4개 영역 모두 필요)
      const { data: existingQuestions } = await supabase
        .from("literacy_questions")
        .select(QUESTION_COLUMNS)
        .eq("passage_id", selectedPassage.id)
        .eq("is_verified", true);
      let finalQuestions: any[] = existingQuestions || [];

      // 낱말 퀴즈를 풀 수 있다고 알린 클라이언트에게만 연다. 구버전 앱은 낱말 문항을 풀 수 없어 어휘 점수가 0이 되므로 기존 방식을 쓴다.
      const clientSupportsWords = body.wordQuiz === true;
      const wordPool = clientSupportsWords ? await loadWordPool(supabase, selectedPassage.grade_level) : [];
      const wordMode = wordPool.length > 0;

      if (!coversAllAreas(finalQuestions, wordMode) && allowRuntimeGeneration && openAiKey) {
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
          const { data: inserted, error: insertErr } = await supabase
            .from("literacy_questions")
            .insert(toInsert)
            .select(QUESTION_COLUMNS);
          if (!insertErr && inserted) {
            finalQuestions = inserted;
          } else {
            // 동시 요청이 먼저 저장했다면 (passage_id, area) 유니크 충돌 → 저장된 문항 재조회
            const { data: refetched } = await supabase
              .from("literacy_questions")
              .select(QUESTION_COLUMNS)
              .eq("passage_id", selectedPassage.id)
              .eq("is_verified", true);
            finalQuestions = refetched || [];
          }
        }
      }

      // 영역이 빠진 채로 진단을 시작하면 측정하지 않은 영역이 점수처럼 보이므로 시작하지 않는다
      if (!coversAllAreas(finalQuestions, wordMode)) {
        console.error("literacy-test: incomplete question set for passage", selectedPassage.id);
        return json({ error: "이 지문의 문항을 준비하는 중이에요. 잠시 후 다시 시도해 주세요." }, 503);
      }

      const nonce = crypto.randomUUID();
      // 정답·근거·해설은 채점 결과(submit)에서만 공개. 보기는 세션 nonce로 섞는다.
      const publicQuestions = servedPassageQuestions(finalQuestions, wordMode).map((q: any) => {
        const order = optionOrder(nonce, q.id, q.options.length);
        return {
          id: q.id,
          passage_id: q.passage_id,
          area: q.area,
          question: q.question,
          options: order.map((i: number) => q.options[i]),
        };
      });
      // 낱말 퀴즈: 지문 없이 바로 푸는 어휘 문항 (정답은 문항별 확인(check)·최종 채점에서만 공개)
      const servedWords = wordMode ? pickWordQuestions(wordPool, nonce) : [];
      const publicWordQuestions = servedWords.map((q: any) => {
        const order = optionOrder(nonce, q.id, q.options.length);
        return {
          id: q.id,
          passage_id: null,
          area: q.area,
          question_type: q.question_type,
          question: q.question,
          options: order.map((i: number) => q.options[i]),
        };
      });
      const sessionToken = await issueSessionToken(
        selectedPassage.id,
        authUserId,
        nonce,
        supabaseServiceKey,
        servedWords.map((q: any) => q.id)
      );

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
        word_questions: publicWordQuestions,
      });
    }

    // =====================================================================
    // ACTION 1.5: CHECK — 낱말 퀴즈 문항별 즉시 확인 (첫 답을 서버가 고정, 정답은 이 응답에서만 공개)
    // =====================================================================
    if (action === "check") {
      const passageId = String(body.passageId || "");
      const questionId = String(body.questionId || "");
      const selected = Number(body.selected);
      const session = await verifySessionToken(body.sessionToken, passageId, authUserId, supabaseServiceKey);
      if (session === null || !session.wordIds.includes(questionId) || !Number.isInteger(selected) || selected < 0 || selected > 3) {
        return json({ error: "낱말 퀴즈 세션이 올바르지 않아요. 처음부터 다시 시작해 주세요." }, 400);
      }

      const { data: wordQ } = await supabase
        .from("literacy_questions")
        .select(WORD_COLUMNS)
        .eq("id", questionId)
        .is("passage_id", null)
        .maybeSingle();
      if (!wordQ) return json({ error: "문항을 찾을 수 없어요." }, 404);

      // 첫 답만 인정: 이미 답한 문항이면 저장된 첫 답으로 다시 알려 준다
      let lockedSelected = selected;
      const { error: lockErr } = await supabase
        .from("literacy_word_answers")
        .insert({ nonce: session.nonce, question_id: questionId, selected });
      if (lockErr) {
        if (lockErr.code !== "23505") {
          console.error("literacy word answer insert failed:", lockErr);
          return json({ error: "답을 확인할 수 없어요. 잠시 후 다시 시도해 주세요." }, 503);
        }
        const { data: prev } = await supabase
          .from("literacy_word_answers")
          .select("selected")
          .eq("nonce", session.nonce)
          .eq("question_id", questionId)
          .maybeSingle();
        if (prev && Number.isInteger(prev.selected)) lockedSelected = prev.selected;
      }

      const graded = gradeWordQuestion(wordQ, lockedSelected, session.nonce);
      return json({
        question_id: questionId,
        selected: graded.selected,
        is_correct: graded.is_correct,
        correct_answer: graded.correct_answer,
        explanation: graded.explanation,
      });
    }

    // =====================================================================
    // ACTION 2: SUBMIT — 채점, 저장, 보완 도서 추천
    // =====================================================================
    if (action === "submit") {
      const readingTimeSeconds = body.readingTimeSeconds;
      const answers: any[] = Array.isArray(body.answers) ? body.answers : [];
      const passageId = String(body.passageId || "");

      const session = await verifySessionToken(body.sessionToken, passageId, authUserId, supabaseServiceKey);
      if (session === null) {
        return json({ error: "진단 세션이 만료되었거나 올바르지 않아요. 처음부터 다시 시작해 주세요." }, 400);
      }

      const { data: passage } = await supabase.from("literacy_passages").select("*").eq("id", passageId).single();
      const { data: questions } = await supabase
        .from("literacy_questions")
        .select("*")
        .eq("passage_id", passageId)
        .eq("is_verified", true);

      const wordMode = session.wordIds.length > 0;
      if (!passage || !coversAllAreas(questions, wordMode)) {
        return json({ error: "진단 지문 또는 문항 정보를 찾을 수 없습니다." }, 404);
      }

      // 같은 세션 토큰으로는 한 번만 제출할 수 있다. 이후 처리가 실패하면 catch에서 되돌린다.
      const { error: nonceErr } = await supabase.from("literacy_session_nonces").insert({ nonce: session.nonce });
      if (nonceErr) {
        const duplicated = nonceErr.code === "23505";
        if (!duplicated) console.error("literacy nonce insert failed:", nonceErr);
        return json(
          { error: duplicated ? "이미 제출된 진단이에요. 새로 시작해 주세요." : "진단을 처리할 수 없어요. 잠시 후 다시 시도해 주세요." },
          duplicated ? 409 : 503
        );
      }
      consumedNonce = session.nonce;

      const childName = ownedChildName;
      const norm = GRADE_WPM_NORMS[passage.grade_level] || GRADE_WPM_NORMS[2];

      // 1. 채점: 영역 점수 = 정답 비율. 풀이 시간·찍기 방지용 가산/하한 없음.
      const gradedPassage = gradeAnswers(servedPassageQuestions(questions, wordMode), answers, session.nonce);
      // 낱말 퀴즈는 클라이언트가 보낸 답이 아니라 서버가 고정한 첫 답으로 채점한다 (못 푼 문항은 오답)
      let gradedWords: ReturnType<typeof gradeWordQuestion>[] = [];
      if (wordMode) {
        const [{ data: wordRows }, { data: lockedRows }] = await Promise.all([
          supabase.from("literacy_questions").select(WORD_COLUMNS).in("id", session.wordIds),
          supabase.from("literacy_word_answers").select("question_id, selected").eq("nonce", session.nonce),
        ]);
        const byId = new Map<string, any>((wordRows || []).map((r: any) => [r.id, r]));
        const lockedById = new Map<string, number>((lockedRows || []).map((r: any) => [r.question_id, r.selected]));
        gradedWords = session.wordIds
          .filter((id) => byId.has(id))
          .map((id) => gradeWordQuestion(byId.get(id), lockedById.get(id) ?? null, session.nonce));
        if (gradedWords.length !== session.wordIds.length) {
          console.error("literacy-test: word questions missing at submit", session.wordIds);
        }
      }
      const gradedAnswers = [...gradedWords, ...gradedPassage];
      const areaScores = computeAreaScores(gradedAnswers);
      const totalScore = computeTotal(areaScores);
      const tier = tierFor(totalScore);
      const { weakest: weakestArea, strength: strengthArea } = pickExtremes(areaScores);
      const correctCount = gradedAnswers.filter((g) => g.is_correct).length;

      // 2. 읽기 속도(참고): 클라이언트 보고 시간은 서버가 확인한 경과 시간을 넘을 수 없다
      const safeSeconds = Math.min(Math.max(Number(readingTimeSeconds) || 30, 5), Math.max(session.elapsedSec, 5));
      const fluency = computeFluency(passage.word_count, safeSeconds, passage.grade_level);
      const effectiveWpm = Math.min(fluency.rawWpm, norm.maxWpm);

      // 3. 보완 도서 + AI 총평은 서로 독립이므로 병렬로 가져온다
      const prescriptionConfig = PRESCRIPTION_MAP[weakestArea] || PRESCRIPTION_MAP.balanced;
      const allCorrect = correctCount === gradedAnswers.length;
      const noneCorrect = correctCount === 0;

      let aiDiagnosisSummary =
        `### ${childName}의 문해력 점검 결과 (${norm.label})\n\n` +
        `**'${passage.title}'** ${wordMode ? "지문과 낱말 퀴즈를 합해" : "지문을 읽고"} ${gradedAnswers.length}문항 중 **${correctCount}문항**을 맞혔어요.\n\n` +
        (weakestArea === "balanced"
          ? allCorrect
            ? `- **🌟 이번 결과**: 모든 영역의 문항을 맞혔어요. 한 단계 높은 지문에도 도전해 보세요.\n`
            : noneCorrect
            ? `- **🌱 이번 결과**: 이번 지문은 조금 어려웠을 수 있어요. 아이가 좋아하는 짧은 글부터 함께 읽어 보세요.\n`
            : `- **이번 결과**: 영역별 차이가 뚜렷하지 않았어요.\n`
          : `- **🌟 상대적으로 잘한 영역 — ${AREA_LABELS[strengthArea]}**\n` +
            `- **🌱 더 살펴볼 영역 — ${AREA_LABELS[weakestArea]}**: ${prescriptionConfig.coachingTip}\n`) +
        `\n> 지문 1편, 영역당 문항 수가 적은 참고용 점검이에요. 전문적인 진단이 아니며, 여러 번 반복해 추이를 살펴보세요.`;

      const llmSummaryPromise = (async (): Promise<string | null> => {
        if (!openAiKey) return null;
        try {
          const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openAiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              temperature: 0.5,
              max_tokens: 650,
              messages: [
                {
                  role: "system",
                  content:
                    "당신은 Book,ok의 아동 문해력 코칭 도우미입니다. 점검 결과를 바탕으로 부모님께 따뜻한 마크다운 코칭 리포트를 작성하세요. 아이의 이름은 알 수 없으니 반드시 '{아이}'라는 표기로만 지칭하세요. 지문 1편·영역당 소수 문항 기반의 참고용 결과이므로 '또래 평균 대비' 같은 근거 없는 비교, 정확한 수준·등급 단정, 의학·발달 진단 표현은 쓰지 말고, 마지막에 참고용 점검 결과라는 점을 한 문장으로 덧붙이세요. HTML 태그와 링크는 쓰지 마세요.",
                },
                {
                  role: "user",
                  content: `대상: {아이} (${norm.label})
읽은 지문: "${passage.title}" (${passage.genre}, ${passage.word_count}어절)
문항 결과: ${gradedAnswers.length}문항 중 ${correctCount}문항 정답
영역별 정답률: 어휘력 ${areaScores.vocabulary}%, 사실적 이해 ${areaScores.factual}%, 추론적 이해 ${areaScores.inferential}%, 비판적 이해 ${areaScores.critical}%
상대적으로 잘한 영역: ${AREA_LABELS[strengthArea]}, 더 살펴볼 영역: ${AREA_LABELS[weakestArea]}

400~550자 내외의 마크다운 리포트를 작성하세요:
1. ### 📊 {아이}의 문해력 점검 총평
2. **🌟 잘한 점**
3. **🌱 가정에서 해볼 수 있는 독서 지도 팁** (실천 팁 2가지 글머리 기호)`,
                },
              ],
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (!llmRes.ok) return null;
          const llmData = await llmRes.json();
          const content: string | undefined = llmData.choices?.[0]?.message?.content?.trim();
          if (!content || content.length <= 80) return null;
          return content.replace(/<[^>]*>/g, "").replaceAll("{아이}", childName);
        } catch {
          return null; // 시간 초과/오류 시 기본 총평 유지
        }
      })();

      const [{ books: prescribedBooks, keywords: prescribedKeywords }, llmSummary] = await Promise.all([
        fetchPrescribedBooks(weakestArea, passage.grade_level, childName),
        llmSummaryPromise,
      ]);
      if (llmSummary) aiDiagnosisSummary = llmSummary;

      // 4. DB 저장 (로그인 + 본인 자녀인 경우에만)
      const passageSnapshot = {
        title: passage.title,
        content: passage.content,
        genre: passage.genre,
        word_count: passage.word_count,
      };
      let savedAssessmentId: string | null = null;
      let saveStatus: "saved" | "guest" | "no_child" | "failed" = authUserId ? "no_child" : "guest";
      if (authUserId && ownedChildId !== null) {
        const { data: saved, error: saveErr } = await supabase
          .from("literacy_assessments")
          .insert({
            user_id: authUserId,
            child_id: ownedChildId,
            passage_id: passage.id,
            grade_level: passage.grade_level,
            reading_time_seconds: safeSeconds,
            raw_wpm: fluency.rawWpm,
            effective_wpm: effectiveWpm,
            answers: gradedAnswers,
            score_vocabulary: areaScores.vocabulary ?? 0,
            score_factual: areaScores.factual ?? 0,
            score_inferential: areaScores.inferential ?? 0,
            score_critical: areaScores.critical ?? 0,
            score_fluency: fluency.score,
            total_bli_score: totalScore,
            bli_tier: tier,
            weakest_area: weakestArea,
            strength_area: strengthArea,
            ai_diagnosis_summary: aiDiagnosisSummary,
            prescribed_keywords: prescribedKeywords,
            prescribed_books: prescribedBooks,
            scoring_version: SCORING_VERSION,
            passage_snapshot: passageSnapshot,
            session_nonce: session.nonce,
          })
          .select("id")
          .single();

        if (!saveErr && saved) {
          savedAssessmentId = saved.id;
          saveStatus = "saved";
        } else {
          saveStatus = "failed";
          console.warn("Failed to insert literacy_assessment:", saveErr);
        }
      }

      return json({
        assessment: {
          id: savedAssessmentId || crypto.randomUUID(),
          saved: saveStatus === "saved",
          save_status: saveStatus,
          scoring_version: SCORING_VERSION,
          passage_id: passage.id,
          passage_title: passage.title,
          passage_content: passage.content,
          passage_genre: passage.genre,
          word_count: passage.word_count,
          grade_level: passage.grade_level,
          grade_label: norm.label,
          norm_wpm: norm.targetWpm,
          reading_time_seconds: safeSeconds,
          raw_wpm: fluency.rawWpm,
          effective_wpm: effectiveWpm,
          fluency_reason: fluency.reason,
          score_vocabulary: areaScores.vocabulary ?? 0,
          score_factual: areaScores.factual ?? 0,
          score_inferential: areaScores.inferential ?? 0,
          score_critical: areaScores.critical ?? 0,
          score_fluency: fluency.score,
          total_bli_score: totalScore,
          bli_tier: tier,
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
    // 처리에 실패했다면 사용자가 같은 세션으로 다시 제출할 수 있게 nonce를 되돌린다
    if (consumedNonce && supabase) {
      try {
        await supabase.from("literacy_session_nonces").delete().eq("nonce", consumedNonce);
      } catch {
        // best-effort
      }
    }
    return json({ error: "문해력 진단 처리 중 오류가 발생했습니다." }, 500);
  }
});
