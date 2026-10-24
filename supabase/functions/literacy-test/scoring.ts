// 문해력 점검 채점 순수 로직. Deno/Node 어디서나 import 가능하도록 외부 의존성을 두지 않는다.
// (테스트: scripts/tests/literacy-scoring.test.mjs)

export const SCORING_VERSION = 2;

export const QUESTION_AREAS = ["vocabulary", "factual", "inferential", "critical"] as const;
export type QuestionArea = typeof QUESTION_AREAS[number];

export const AREA_LABELS: Record<string, string> = {
  vocabulary: "어휘력",
  factual: "사실적 이해",
  inferential: "추론적 이해",
  critical: "비판적 이해",
  fluency: "읽기 속도",
  balanced: "고른 영역",
};

/** 학년별 참고 읽기 속도 (어절/분). 공식 규준이 아닌 자체 설정값이므로 '참고'로만 표기한다. */
export const GRADE_WPM_NORMS: Record<number, { targetWpm: number; minWpm: number; maxWpm: number; label: string }> = {
  0: { targetWpm: 65, minWpm: 25, maxWpm: 160, label: "유아 (5~6세)" },
  1: { targetWpm: 105, minWpm: 45, maxWpm: 220, label: "초등 1학년" },
  2: { targetWpm: 135, minWpm: 60, maxWpm: 260, label: "초등 2학년" },
  3: { targetWpm: 165, minWpm: 75, maxWpm: 300, label: "초등 3학년" },
  4: { targetWpm: 195, minWpm: 90, maxWpm: 340, label: "초등 4학년" },
  5: { targetWpm: 225, minWpm: 105, maxWpm: 380, label: "초등 5학년" },
  6: { targetWpm: 250, minWpm: 120, maxWpm: 420, label: "초등 6학년" },
};

/** 문자열 → 32bit 해시 (FNV-1a) */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 세션 nonce + 문항 ID로 결정되는 보기 순서.
 * shuffled[i] = original[order[i]]. start와 submit에서 같은 입력이면 항상 같은 순서가 나온다.
 */
export function optionOrder(nonce: string, questionId: string, optionCount: number): number[] {
  const order = Array.from({ length: optionCount }, (_, i) => i);
  const rand = mulberry32(hashSeed(`${nonce}|${questionId}`));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** 한 번의 점검에서 영역별로 출제하는 최대 문항 수 */
export const MAX_QUESTIONS_PER_AREA = 3;

/**
 * 검수된 문항 중 이번 점검에 출제할 문항을 고른다. (영역 순서 → item_order 순, 영역당 최대 perArea개)
 * start(출제)와 submit(채점)이 같은 함수를 써야 출제하지 않은 문항이 오답으로 채점되지 않는다.
 */
export function selectServedQuestions<T extends { id: string; area: string; item_order?: number | null }>(
  questions: T[],
  perArea: number = MAX_QUESTIONS_PER_AREA
): T[] {
  const served: T[] = [];
  for (const area of QUESTION_AREAS) {
    const inArea = questions
      .filter((q) => q.area === area)
      .sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0) || a.id.localeCompare(b.id));
    served.push(...inArea.slice(0, perArea));
  }
  return served;
}

export interface StoredQuestion {
  id: string;
  area: string;
  question: string;
  options: string[];
  correct_answer: number;
  evidence: string;
  explanation: string;
}

export interface SubmittedAnswer {
  question_id?: string;
  /** 화면에 보인(섞인) 보기 기준 인덱스. 미응답/모르겠어요는 -1 */
  selected?: unknown;
  time_spent_sec?: unknown;
  unsure?: unknown;
}

export interface GradedAnswer {
  question_id: string;
  area: string;
  area_label: string;
  question: string;
  /** 응시자에게 보인(섞인) 순서의 보기 */
  options: string[];
  selected: number;
  /** 섞인 순서 기준 정답 인덱스 */
  correct_answer: number;
  is_correct: boolean;
  unsure: boolean;
  evidence: string;
  explanation: string;
  time_spent_sec: number;
}

export function gradeAnswers(questions: StoredQuestion[], answers: SubmittedAnswer[], nonce: string): GradedAnswer[] {
  return questions.map((q) => {
    const order = optionOrder(nonce, q.id, q.options.length);
    const shuffledOptions = order.map((i) => q.options[i]);
    const shuffledCorrect = order.indexOf(q.correct_answer);
    const submitted = answers.find((a) => a?.question_id === q.id);
    const rawSelected = submitted?.selected;
    const selected =
      typeof rawSelected === "number" && Number.isInteger(rawSelected) && rawSelected >= 0 && rawSelected < q.options.length
        ? rawSelected
        : -1;
    const time = Number(submitted?.time_spent_sec);
    return {
      question_id: q.id,
      area: q.area,
      area_label: AREA_LABELS[q.area] || q.area,
      question: q.question,
      options: shuffledOptions,
      selected,
      correct_answer: shuffledCorrect,
      is_correct: selected !== -1 && selected === shuffledCorrect,
      unsure: submitted?.unsure === true,
      evidence: q.evidence,
      explanation: q.explanation,
      time_spent_sec: Number.isFinite(time) ? Math.min(Math.max(Math.round(time), 0), 3600) : 0,
    };
  });
}

/** 영역 점수 = 정답 비율(0~100). 하한·시간 가산점 없음. 해당 영역 문항이 없으면 null. */
export function computeAreaScores(graded: GradedAnswer[]): Record<QuestionArea, number | null> {
  const result = {} as Record<QuestionArea, number | null>;
  for (const area of QUESTION_AREAS) {
    const items = graded.filter((g) => g.area === area);
    result[area] = items.length === 0 ? null : Math.round((100 * items.filter((g) => g.is_correct).length) / items.length);
  }
  return result;
}

export interface FluencyResult {
  rawWpm: number;
  /** 참고 속도 점수(권장 속도 대비 %, 최대 100). 측정 불가면 null */
  score: number | null;
  reason: "ok" | "toddler" | "too_fast";
}

export function computeFluency(wordCount: number, seconds: number, gradeLevel: number): FluencyResult {
  const norm = GRADE_WPM_NORMS[gradeLevel] || GRADE_WPM_NORMS[2];
  const rawWpm = Math.round((wordCount / (Math.max(seconds, 1) / 60)) * 10) / 10;
  if (gradeLevel === 0) return { rawWpm, score: null, reason: "toddler" };
  if (rawWpm > norm.maxWpm) return { rawWpm, score: null, reason: "too_fast" };
  return { rawWpm, score: Math.min(100, Math.round((rawWpm / norm.targetWpm) * 100)), reason: "ok" };
}

/** 총점 = 이해 영역 점수의 평균(영역 균등). 속도는 총점에 넣지 않는다. */
export function computeTotal(areaScores: Record<QuestionArea, number | null>): number {
  const values = QUESTION_AREAS.map((a) => areaScores[a]).filter((v): v is number => v !== null);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export function tierFor(total: number): string {
  if (total >= 90) return "숲 독서가 Lv.4";
  if (total >= 70) return "나무 독서가 Lv.3";
  if (total >= 45) return "새싹 독서가 Lv.2";
  return "씨앗 독서가 Lv.1";
}

/** 이해 영역 중 가장 낮은/높은 영역. 모든 영역이 같으면 'balanced'. */
export function pickExtremes(areaScores: Record<QuestionArea, number | null>): { weakest: string; strength: string } {
  const entries = QUESTION_AREAS.map((a) => [a, areaScores[a]] as const).filter(
    (e): e is readonly [QuestionArea, number] => e[1] !== null
  );
  if (entries.length === 0) return { weakest: "balanced", strength: "balanced" };
  const min = Math.min(...entries.map((e) => e[1]));
  const max = Math.max(...entries.map((e) => e[1]));
  if (min === max) return { weakest: "balanced", strength: "balanced" };
  return {
    weakest: entries.find((e) => e[1] === min)![0],
    strength: entries.find((e) => e[1] === max)![0],
  };
}
