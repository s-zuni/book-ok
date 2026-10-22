import test from "node:test";
import assert from "node:assert/strict";
import {
    checkPassage, checkQuestion, checkQuestionSet, shuffleOptions, statusFromFlags, answerPositionHistogram, countWords,
} from "../literacy/lib.mjs";
import { generateQuestionsForPassage } from "../literacy/generate.mjs";
import { validateQuestion, renderReviewMarkdown } from "../literacy/validate.mjs";
import { selectServedQuestions } from "../../supabase/functions/literacy-test/scoring.ts";

const PASSAGE = {
    title: "테스트 지문",
    grade_level: 2,
    genre: "동화",
    interest_tags: ["animal"],
    content:
        "아기 다람쥐는 가을 숲에서 상수리를 모았어요. 겨울에 먹을 것이 없을까 봐 걱정이 되었거든요. 친구 고슴도치가 함께 도와주었어요. 둘은 참나무 아래에 상수리를 숨겨 두었어요. 다람쥐는 고마운 마음에 가장 큰 상수리를 선물했어요.",
};

const goodQuestion = (over = {}) => ({
    area: "factual",
    question: "다람쥐가 상수리를 숨겨 둔 곳은 어디인가요?",
    options: ["참나무 아래", "시냇물 바위 밑", "소나무 꼭대기", "고슴도치 집 앞"],
    correct_answer: 0,
    evidence: "둘은 참나무 아래에 상수리를 숨겨 두었어요.",
    explanation: "지문에서 참나무 아래에 숨겼다고 했어요.",
    ...over,
});

test("정상 문항은 플래그가 없다", () => {
    assert.deepEqual(checkQuestion(goodQuestion(), PASSAGE.content), []);
});

test("구조 오류·근거 불일치·중복 보기를 잡는다", () => {
    assert.ok(checkQuestion(goodQuestion({ options: ["a", "b", "c"] }), PASSAGE.content).includes("bad_structure"));
    assert.ok(checkQuestion(goodQuestion({ correct_answer: 4 }), PASSAGE.content).includes("bad_structure"));
    assert.ok(checkQuestion(goodQuestion({ area: "other" }), PASSAGE.content).includes("bad_structure"));
    assert.ok(checkQuestion(goodQuestion({ evidence: "지문에 없는 문장이에요." }), PASSAGE.content).includes("evidence_not_found"));
    assert.ok(
        checkQuestion(goodQuestion({ options: ["참나무 아래", "참나무  아래", "소나무 꼭대기", "집 앞"] }), PASSAGE.content).includes("duplicate_options")
    );
});

test("근거 문장은 공백 차이를 무시하고 비교한다", () => {
    assert.ok(!checkQuestion(goodQuestion({ evidence: "둘은 참나무 아래에   상수리를 숨겨 두었어요." }), PASSAGE.content).includes("evidence_not_found"));
});

test("정답만 유난히 길면 경고, 모두 맞다 보기는 경고", () => {
    const longCorrect = goodQuestion({
        options: ["참나무 아래에 상수리를 정성껏 숨겨 두었다고 지문에 나와 있는 곳", "바위 밑", "소나무", "집 앞"],
    });
    const flags = checkQuestion(longCorrect, PASSAGE.content);
    assert.ok(flags.includes("length_cue") && flags.includes("correct_longest"));
    assert.ok(checkQuestion(goodQuestion({ options: ["참나무 아래", "바위 밑", "소나무 꼭대기", "위 보기 모두 맞다"] }), PASSAGE.content).includes("all_of_above"));
});

test("같은 지문의 중복 질문을 잡는다", () => {
    const a = goodQuestion();
    const b = goodQuestion({ evidence: "겨울에 먹을 것이 없을까 봐 걱정이 되었거든요." });
    assert.ok(checkQuestion(a, PASSAGE.content, [a, b]).includes("duplicate_question"));
});

test("상태: 차단 플래그가 있으면 자동 탈락, 경고만이면 검수 대기", () => {
    assert.equal(statusFromFlags(["key_mismatch"]), "auto_rejected");
    assert.equal(statusFromFlags(["length_cue", "blind_solvable"]), "pending");
    assert.equal(statusFromFlags([]), "pending");
});

test("보기 섞기는 정답 인덱스를 따라간다", () => {
    for (let i = 0; i < 50; i++) {
        const s = shuffleOptions(goodQuestion());
        assert.equal(s.options[s.correct_answer], "참나무 아래");
    }
});

test("지문 검사: 분량 경고와 필수 필드 오류", () => {
    assert.ok(checkPassage({ ...PASSAGE, grade_level: 9 }).errors.length > 0);
    const short = checkPassage(PASSAGE);
    assert.equal(short.errors.length, 0);
    assert.ok(short.warnings.some((w) => w.includes("분량")));
    assert.equal(countWords("가 나  다"), 3);
});

test("영역별 문항 수 점검과 정답 위치 분포", () => {
    const qs = [goodQuestion(), goodQuestion({ area: "vocabulary" })];
    assert.equal(checkQuestionSet(qs, 1).length, 2); // inferential, critical 누락
    assert.deepEqual(answerPositionHistogram([{ correct_answer: 0 }, { correct_answer: 3 }, { correct_answer: 3 }]), [1, 0, 0, 2]);
});

/** 정해진 응답을 돌려주는 가짜 모델 */
const fakeGenerator = (questionsFor) => async () => ({ questions: questionsFor(), key_vocabularies: [{ word: "상수리", meaning: "도토리 비슷한 열매", level: "초등2" }] });

const fullSet = (perArea) =>
    ["vocabulary", "factual", "inferential", "critical"].flatMap((area) =>
        Array.from({ length: perArea }, (_, i) =>
            goodQuestion({
                area,
                question: `${area} 질문 ${i}?`,
                evidence: ["아기 다람쥐는 가을 숲에서 상수리를 모았어요.", "친구 고슴도치가 함께 도와주었어요.", "둘은 참나무 아래에 상수리를 숨겨 두었어요."][i],
            })
        )
    );

test("생성: 영역당 문항 수를 맞추고 item_order·uid를 부여한다", async () => {
    const out = await generateQuestionsForPassage({ llm: fakeGenerator(() => fullSet(3)), model: "m", passage: PASSAGE, perArea: 3 });
    assert.equal(out.questions.length, 12);
    const vocab = out.questions.filter((q) => q.area === "vocabulary");
    assert.deepEqual(vocab.map((q) => q.item_order), [0, 1, 2]);
    assert.equal(new Set(out.questions.map((q) => q.uid)).size, 12);
    assert.equal(out.key_vocabularies.length, 1);
    for (const q of out.questions) assert.equal(q.options[q.correct_answer], "참나무 아래"); // 섞은 뒤에도 정답 유지
});

test("생성: 규칙을 못 지키면 재시도하다 실패한다", async () => {
    let calls = 0;
    const llm = async () => { calls++; return { questions: fullSet(2), key_vocabularies: [] }; }; // 기대 3개인데 2개
    await assert.rejects(() => generateQuestionsForPassage({ llm, model: "m", passage: PASSAGE, perArea: 3, attempts: 2 }), /문항 생성 실패/);
    assert.equal(calls, 2);
});

test("검수: 지문 보고 푼 답이 다르면 key_mismatch, 지문 없이 확신 있게 맞히면 blind_solvable", async () => {
    const q = goodQuestion();
    const siblings = [q];
    const mismatch = await validateQuestion({
        llm: async (req) => (req.user.includes("[지문]") ? { answer: 1, confidence: 5 } : { answer: 2, confidence: 1 }),
        solverModel: "m", passage: PASSAGE, q, siblings,
    });
    assert.ok(mismatch.flags.includes("key_mismatch"));
    assert.ok(!mismatch.flags.includes("blind_solvable"));

    const blind = await validateQuestion({
        llm: async (req) => (req.user.includes("[지문]") ? { answer: 0, confidence: 5 } : { answer: 0, confidence: 5 }),
        solverModel: "m", passage: PASSAGE, q, siblings,
    });
    assert.ok(blind.flags.includes("blind_solvable"));
    assert.ok(!blind.flags.includes("key_mismatch"));
});

test("검수: 구조가 깨진 문항은 모델을 호출하지 않는다", async () => {
    let calls = 0;
    const r = await validateQuestion({
        llm: async () => { calls++; return { answer: 0, confidence: 1 }; },
        solverModel: "m", passage: PASSAGE, q: goodQuestion({ options: ["a"] }), siblings: [],
    });
    assert.ok(r.flags.includes("bad_structure"));
    assert.equal(calls, 0);
});

test("검수: 모델 호출이 실패하면 llm_check_failed 로 표시하고 계속 진행한다", async () => {
    const r = await validateQuestion({
        llm: async () => { throw new Error("boom"); },
        solverModel: "m", passage: PASSAGE, q: goodQuestion(), siblings: [],
    });
    assert.ok(r.flags.includes("llm_check_failed"));
});

test("검수 문서에 uid·상태·플래그가 나온다", () => {
    const md = renderReviewMarkdown([
        { ...PASSAGE, questions: [{ ...goodQuestion(), uid: "abc123", item_order: 0, status: "pending", checks: { flags: ["length_cue"], blind: null, informed: null } }] },
    ]);
    assert.ok(md.includes("abc123") && md.includes("pending") && md.includes("length_cue"));
});

test("출제: 영역당 최대 3개, item_order 순, 영역 순서 고정", () => {
    const qs = [];
    for (const area of ["critical", "vocabulary", "factual", "inferential"]) {
        for (const order of [4, 0, 2, 1, 3]) qs.push({ id: `${area}-${order}`, area, item_order: order });
    }
    const served = selectServedQuestions(qs);
    assert.equal(served.length, 12);
    assert.deepEqual(served.slice(0, 3).map((q) => q.id), ["vocabulary-0", "vocabulary-1", "vocabulary-2"]);
    assert.deepEqual([...new Set(served.map((q) => q.area))], ["vocabulary", "factual", "inferential", "critical"]);
    // 같은 입력이면 출제(start)와 채점(submit)에서 같은 문항이 선택된다
    assert.deepEqual(selectServedQuestions([...qs].reverse()).map((q) => q.id), served.map((q) => q.id));
});
