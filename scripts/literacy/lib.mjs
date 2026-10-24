// 문해력 지문·문항 콘텐츠 파이프라인 공통 모듈 (오프라인 개발용 스크립트 전용).
// 순수 함수는 scripts/tests/literacy-content.test.mjs 에서 테스트한다.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

export const AREAS = ["vocabulary", "factual", "inferential", "critical"];

export const AREA_GUIDE = {
    vocabulary: "문맥 속 낱말·표현의 뜻을 묻는다. 사전 뜻 암기가 아니라 이 지문의 문맥에서 어떤 뜻인지 고르게 한다.",
    factual: "지문에 분명하게 쓰여 있는 사실(누가·언제·어디서·무엇을·왜)을 묻는다.",
    inferential: "지문에 직접 쓰이지 않은 인물의 마음, 원인, 결과를 앞뒤 단서로 짐작하게 한다. evidence는 추론의 근거가 되는 문장이다.",
    critical: "글쓴이의 의도·주장, 근거의 알맞음, 글의 내용에 대한 판단을 묻는다. 정답이 하나로 판정되도록 '지문의 내용에 비추어 가장 알맞은 것'을 고르는 형태로 쓴다.",
};

/** 학년별 지문 분량(어절) 권장 범위. 벗어나면 경고만 한다. */
export const GRADE_WORD_RANGE = {
    0: [50, 110],
    1: [60, 130],
    2: [70, 160],
    3: [90, 200],
    4: [110, 240],
    5: [140, 300],
    6: [160, 340],
};

export const GRADE_LABEL = {
    0: "유아 (만 5~6세, 부모와 함께 읽음)",
    1: "초등 1학년",
    2: "초등 2학년",
    3: "초등 3학년",
    4: "초등 4학년",
    5: "초등 5학년",
    6: "초등 6학년",
};

/** 이 플래그가 하나라도 있으면 자동 탈락 */
export const BLOCKING_FLAGS = new Set([
    "bad_structure",
    "evidence_not_found",
    "duplicate_options",
    "duplicate_question",
    "key_mismatch",
]);

// ---------------------------------------------------------------------------
// 파일·환경
// ---------------------------------------------------------------------------
export function loadEnv() {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const envPath = path.join(root, ".env.local");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
    }
}

export function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function writeJson(file, data) {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** --key value / --flag 형태의 인자를 파싱한다 */
export function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith("--")) continue;
        const key = argv[i].slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("--")) args[key] = true;
        else {
            args[key] = next;
            i++;
        }
    }
    return args;
}

// ---------------------------------------------------------------------------
// 텍스트 도구
// ---------------------------------------------------------------------------
export const compact = (s) => String(s ?? "").replace(/\s+/g, "");
export const countWords = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;

export function questionUid(title, area, itemOrder) {
    return crypto.createHash("sha1").update(`${title}|${area}|${itemOrder}`).digest("hex").slice(0, 10);
}

/** 보기를 섞고 정답 인덱스를 따라 옮긴다. rand는 0~1 난수 함수(테스트에서 주입). */
export function shuffleOptions(question, rand = Math.random) {
    const order = question.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return {
        ...question,
        options: order.map((i) => question.options[i]),
        correct_answer: order.indexOf(question.correct_answer),
    };
}

// ---------------------------------------------------------------------------
// 검수: 지문
// ---------------------------------------------------------------------------
/** @returns {{errors: string[], warnings: string[]}} */
export function checkPassage(p) {
    const errors = [];
    const warnings = [];
    if (!p || typeof p !== "object") return { errors: ["지문 객체가 아닙니다"], warnings };
    if (!String(p.title || "").trim()) errors.push("title이 비어 있습니다");
    if (!Number.isInteger(p.grade_level) || p.grade_level < 0 || p.grade_level > 6) errors.push("grade_level은 0~6 정수여야 합니다");
    if (!String(p.genre || "").trim()) errors.push("genre가 비어 있습니다");
    if (!String(p.content || "").trim()) errors.push("content가 비어 있습니다");
    if (errors.length) return { errors, warnings };

    const words = countWords(p.content);
    const [min, max] = GRADE_WORD_RANGE[p.grade_level];
    if (words < min || words > max) warnings.push(`분량 ${words}어절: 학년 권장 범위(${min}~${max}) 밖입니다`);
    if (/<[a-z][\s\S]*>|\[[^\]]+\]\([^)]+\)/i.test(p.content)) warnings.push("HTML/마크다운 링크로 보이는 문자열이 있습니다");
    if (!Array.isArray(p.interest_tags) || p.interest_tags.length === 0) warnings.push("interest_tags가 없어 관심사 매칭에 쓰이지 않습니다");
    return { errors, warnings };
}

// ---------------------------------------------------------------------------
// 검수: 문항 (LLM 없이 가능한 규칙 검사)
// ---------------------------------------------------------------------------
const ALL_OF_ABOVE = /모두\s*(맞|정답|옳)|위\s*(의\s*)?(보기\s*)?(모두|전부)|정답\s*없음|해당\s*없음|(?:^|\s)모두$/;

/**
 * @param q 문항 {area, question, options, correct_answer, evidence, explanation}
 * @param passageContent 지문 본문
 * @param siblings 같은 지문의 다른 문항들(중복 질문 검사용)
 * @returns {string[]} 플래그 목록
 */
export function checkQuestion(q, passageContent, siblings = []) {
    const flags = [];
    const bad = () => flags.push("bad_structure");

    if (!AREAS.includes(q?.area)) bad();
    if (typeof q?.question !== "string" || !q.question.trim()) bad();
    if (typeof q?.explanation !== "string" || !q.explanation.trim()) bad();
    const optionsOk = Array.isArray(q?.options) && q.options.length === 4 && q.options.every((o) => typeof o === "string" && o.trim());
    if (!optionsOk) bad();
    if (!Number.isInteger(q?.correct_answer) || q.correct_answer < 0 || q.correct_answer > 3) bad();
    if (flags.includes("bad_structure")) return flags;

    const options = q.options.map((o) => o.trim());
    if (new Set(options.map(compact)).size !== 4) flags.push("duplicate_options");

    const evidence = String(q.evidence ?? "");
    if (!evidence.trim() || !compact(passageContent).includes(compact(evidence))) flags.push("evidence_not_found");
    else if (compact(evidence).length < 8) flags.push("evidence_short");

    const text = compact(q.question);
    if (siblings.some((s) => s !== q && compact(s.question) === text)) flags.push("duplicate_question");

    // 정답을 길이만으로 찍을 수 있는지
    const lengths = options.map((o) => compact(o).length);
    const sorted = [...lengths].sort((a, b) => a - b);
    const median = (sorted[1] + sorted[2]) / 2;
    const correctLen = lengths[q.correct_answer];
    if (Math.max(...lengths) > median * 2.2 || (median > 0 && Math.min(...lengths) < median / 2.2)) flags.push("length_cue");
    if (correctLen === Math.max(...lengths) && lengths.filter((l) => l === correctLen).length === 1 && correctLen > median * 1.5) {
        flags.push("correct_longest");
    }
    if (options.some((o) => ALL_OF_ABOVE.test(o))) flags.push("all_of_above");

    return flags;
}

/** 지문 단위: 영역별 문항 수·정답 위치 분포 점검 */
export function checkQuestionSet(questions, perArea) {
    const issues = [];
    for (const area of AREAS) {
        const n = questions.filter((q) => q.area === area).length;
        if (n !== perArea) issues.push(`${area} 문항 ${n}개 (기대 ${perArea}개)`);
    }
    return issues;
}

export function answerPositionHistogram(questions) {
    const hist = [0, 0, 0, 0];
    for (const q of questions) if (Number.isInteger(q.correct_answer)) hist[q.correct_answer]++;
    return hist;
}

/** 플래그로부터 상태 결정: 차단 플래그가 있으면 auto_rejected, 없으면 사람 검수 대기(pending) */
export function statusFromFlags(flags) {
    return flags.some((f) => BLOCKING_FLAGS.has(f)) ? "auto_rejected" : "pending";
}

// ---------------------------------------------------------------------------
// LLM 호출 (OpenAI chat completions, JSON 출력). 테스트에서는 fake를 주입한다.
// ---------------------------------------------------------------------------
export function createLlm(apiKey) {
    if (!apiKey) throw new Error("OPENAI_API_KEY가 필요합니다 (.env.local 또는 환경변수)");
    return async function chatJson({ model, system, user, temperature = 0.2, schema, timeoutMs = 60000 }) {
        const body = {
            model,
            temperature,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            response_format: schema
                ? { type: "json_schema", json_schema: { name: "result", strict: true, schema } }
                : { type: "json_object" },
        };
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const res = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(timeoutMs),
                });
                if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
                if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
                const data = await res.json();
                return JSON.parse(data.choices?.[0]?.message?.content || "{}");
            } catch (err) {
                if (attempt === 2) throw err;
                await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
            }
        }
    };
}

/** 동시 실행 수를 제한한 map */
export async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (next < items.length) {
                const i = next++;
                results[i] = await fn(items[i], i);
            }
        })
    );
    return results;
}

// ---------------------------------------------------------------------------
// 낱말 퀴즈 (지문 없이 바로 푸는 어휘 문항)
// ---------------------------------------------------------------------------
export const WORD_TYPES = ["cloze", "synonym", "antonym", "meaning", "spelling", "odd_one_out"];

/** 서버가 출제 때 세션마다 다시 섞으므로 저장 순서는 큰 의미가 없다. 파일을 고쳐도 순서가 흔들리지 않게 질문 글로 결정한다. */
export function buildWordOptions(item) {
    const all = [item.correct, ...item.wrong];
    const order = all
        .map((text, i) => ({ text, i, key: crypto.createHash("sha1").update(`${item.question}|${text}`).digest("hex") }))
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    return { options: order.map((o) => o.text), correct_answer: order.findIndex((o) => o.i === 0) };
}

/**
 * 낱말 문항 파일의 한 항목 검사. 규칙으로 걸러낼 수 있는 것만 본다(정답의 옳음은 사람이 확인한다).
 * @returns {{errors: string[], warnings: string[]}}
 */
export function checkWordItem(item) {
    const errors = [];
    const warnings = [];
    if (!item || typeof item !== "object") return { errors: ["항목이 객체가 아닙니다"], warnings };
    if (!Number.isInteger(item.grade_level) || item.grade_level < 0 || item.grade_level > 6) errors.push("grade_level은 0~6 정수여야 합니다");
    if (!WORD_TYPES.includes(item.question_type)) errors.push(`question_type은 ${WORD_TYPES.join("/")} 중 하나여야 합니다`);
    if (typeof item.question !== "string" || !item.question.trim()) errors.push("question이 비어 있습니다");
    if (typeof item.explanation !== "string" || !item.explanation.trim()) errors.push("explanation이 비어 있습니다");
    if (typeof item.correct !== "string" || !item.correct.trim()) errors.push("correct가 비어 있습니다");
    if (!Array.isArray(item.wrong) || item.wrong.length !== 3 || item.wrong.some((w) => typeof w !== "string" || !w.trim())) {
        errors.push("wrong은 비어 있지 않은 문자열 3개여야 합니다");
    }
    if (errors.length) return { errors, warnings };

    const all = [item.correct, ...item.wrong].map((o) => compact(o));
    if (new Set(all).size !== 4) errors.push("보기 4개가 서로 달라야 합니다 (정답과 같은 오답 포함)");
    if (/<[a-z][\s\S]*>/i.test(item.question + item.correct + item.wrong.join(""))) warnings.push("HTML로 보이는 문자열이 있습니다");

    // 정답이 길이로 드러나는지 (보기 길이 차이가 크고 정답이 가장 긴 경우)
    const lengths = [item.correct, ...item.wrong].map((o) => compact(o).length);
    const wrongMax = Math.max(...lengths.slice(1));
    if (item.question_type === "meaning" && lengths[0] > wrongMax * 1.8) warnings.push("정답이 오답보다 훨씬 깁니다(길이로 찍을 수 있음)");
    if (item.question_type === "cloze" && !/_{2,}/.test(item.question)) warnings.push("cloze 문항인데 빈칸(___)이 없습니다");
    if (/모두\s*(맞|정답)|해당\s*없음|정답\s*없음/.test(item.wrong.join(" ") + item.correct)) warnings.push("'모두 맞다' 류 보기");
    return { errors, warnings };
}
