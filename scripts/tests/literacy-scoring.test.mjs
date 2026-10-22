import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  optionOrder, gradeAnswers, computeAreaScores, computeFluency, computeTotal, tierFor, pickExtremes,
  GRADE_WPM_NORMS, QUESTION_AREAS,
} from "../../supabase/functions/literacy-test/scoring.ts";

const makeQuestions = () =>
  QUESTION_AREAS.map((area, i) => ({
    id: `q-${area}`, area, question: `${area}?`, options: ["a", "b", "c", "d"],
    correct_answer: 1, evidence: "e", explanation: "x",
  }));

/** 섞인 화면 기준으로 정답/오답을 고르는 응답 생성 */
function answersFor(questions, nonce, pickCorrect) {
  return questions.map((q) => {
    const order = optionOrder(nonce, q.id, 4);
    const correctIdx = order.indexOf(q.correct_answer);
    const selected = pickCorrect(q) ? correctIdx : (correctIdx + 1) % 4;
    return { question_id: q.id, selected, time_spent_sec: 10 };
  });
}

test("보기 순서는 같은 입력이면 같고 순열이다", () => {
  const a = optionOrder("n1", "q1", 4);
  assert.deepEqual(a, optionOrder("n1", "q1", 4));
  assert.deepEqual([...a].sort(), [0, 1, 2, 3]);
});

test("정답 위치가 한 번호에 쏠리지 않는다", () => {
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 2000; i++) counts[optionOrder(`n${i}`, "q", 4).indexOf(1)]++;
  for (const c of counts) assert.ok(c > 400 && c < 600, `분포 편향: ${counts}`);
});

test("전부 정답이면 100점·balanced", () => {
  const qs = makeQuestions();
  const graded = gradeAnswers(qs, answersFor(qs, "n", () => true), "n");
  const scores = computeAreaScores(graded);
  assert.equal(computeTotal(scores), 100);
  assert.equal(tierFor(100), "숲 독서가 Lv.4");
  assert.deepEqual(pickExtremes(scores), { weakest: "balanced", strength: "balanced" });
});

test("전부 오답이면 0점이고 하한을 두지 않는다", () => {
  const qs = makeQuestions();
  const graded = gradeAnswers(qs, answersFor(qs, "n", () => false), "n");
  assert.equal(computeTotal(computeAreaScores(graded)), 0);
});

test("항상 같은 번호만 찍어도 기대 정답률은 25% 근처다 (원본 정답이 2번에 쏠려 있어도)", () => {
  let correct = 0, total = 0;
  for (let i = 0; i < 500; i++) {
    const qs = makeQuestions();
    const answers = qs.map((q) => ({ question_id: q.id, selected: 1 }));
    for (const g of gradeAnswers(qs, answers, `nonce-${i}`)) { total++; if (g.is_correct) correct++; }
  }
  const rate = correct / total;
  assert.ok(rate > 0.2 && rate < 0.3, `rate=${rate}`);
});

test("미응답·범위 밖 선택은 오답, 풀이 시간은 점수에 영향 없음", () => {
  const qs = makeQuestions();
  const fast = gradeAnswers(qs, answersFor(qs, "n", () => true).map((a) => ({ ...a, time_spent_sec: 1 })), "n");
  const slow = gradeAnswers(qs, answersFor(qs, "n", () => true).map((a) => ({ ...a, time_spent_sec: 999 })), "n");
  assert.equal(computeTotal(computeAreaScores(fast)), computeTotal(computeAreaScores(slow)));
  const bad = gradeAnswers(qs, [{ question_id: qs[0].id, selected: 9 }, { question_id: qs[1].id, selected: "1" }], "n");
  assert.ok(bad.every((g) => !g.is_correct && g.selected === -1));
});

test("영역에 문항이 여러 개면 정답 비율로 집계한다", () => {
  const graded = [
    { area: "vocabulary", is_correct: true }, { area: "vocabulary", is_correct: false },
    { area: "factual", is_correct: true },
  ];
  const s = computeAreaScores(graded);
  assert.equal(s.vocabulary, 50);
  assert.equal(s.factual, 100);
  assert.equal(s.inferential, null);
  assert.equal(computeTotal(s), 75);
});

test("가장 낮은/높은 영역 선택", () => {
  assert.deepEqual(
    pickExtremes({ vocabulary: 100, factual: 0, inferential: 100, critical: 100 }),
    { weakest: "factual", strength: "vocabulary" }
  );
});

test("읽기 속도: 유아·비정상 속도는 미산정, 정상은 권장 대비 %", () => {
  assert.equal(computeFluency(80, 60, 0).score, null);
  assert.equal(computeFluency(120, 5, 6).reason, "too_fast");
  const ok = computeFluency(135, 60, 2);
  assert.equal(ok.rawWpm, 135);
  assert.equal(ok.score, 100);
  assert.equal(computeFluency(135, 120, 2).score, 50);
});

test("서버 규준과 클라이언트 규준(src/features/literacy/scoring.ts)이 일치한다", () => {
  const client = fs.readFileSync(new URL("../../src/features/literacy/scoring.ts", import.meta.url), "utf8");
  const found = [...client.matchAll(/grade: (\d),[\s\S]*?targetWpm: (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.equal(found.length, 7);
  for (const [grade, wpm] of found) assert.equal(GRADE_WPM_NORMS[grade].targetWpm, wpm, `grade ${grade}`);
});
