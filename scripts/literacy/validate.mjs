// 2단계: 문항 초안 자동 검수 (규칙 검사 + 독립 모델의 풀이 검사) 후 사람 검수용 파일 생성
//
//   node scripts/literacy/validate.mjs --in scripts/literacy/data/drafts.json --out scripts/literacy/data/validated.json
//        [--review-md scripts/literacy/data/review.md] [--solver-model gpt-4o-mini] [--no-llm]
//
// 각 문항에 checks.flags 와 status(pending | auto_rejected)를 기록한다.
// 이미 사람이 approved / rejected 로 바꾼 문항의 status 는 다시 실행해도 유지한다.
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import {
    AREAS, answerPositionHistogram, checkPassage, checkQuestion, createLlm, loadEnv, mapLimit,
    parseArgs, readJson, statusFromFlags, writeJson,
} from "./lib.mjs";

const ANSWER_SCHEMA = {
    type: "object",
    properties: { answer: { type: "integer" }, confidence: { type: "integer" } },
    required: ["answer", "confidence"],
    additionalProperties: false,
};

const formatQuestion = (q) =>
    `${q.question}\n${q.options.map((o, i) => `${i}. ${o}`).join("\n")}`;

/** 지문 없이 풀기: 확신도가 높은데 맞히면 지문을 읽지 않아도 풀리는 문항일 수 있다 */
async function solveBlind({ llm, model, q }) {
    return llm({
        model,
        temperature: 0,
        schema: ANSWER_SCHEMA,
        system: "초등학생용 4지선다 문제입니다. 지문은 주어지지 않습니다. 상식과 보기의 단서만으로 가장 알맞은 보기 번호(0~3)를 고르고, 확신도(1=찍음 ~ 5=확실)를 함께 답하세요.",
        user: formatQuestion(q),
    });
}

/** 지문 보고 풀기: 출제자가 정한 정답과 다르면 정답이 모호하거나 틀린 문항이다 */
async function solveInformed({ llm, model, passage, q }) {
    return llm({
        model,
        temperature: 0,
        schema: ANSWER_SCHEMA,
        system: "아래 지문을 읽고 4지선다 문제의 정답 보기 번호(0~3)를 고르세요. 확신도(1~5)도 함께 답하세요.",
        user: `[지문]\n${passage.content}\n\n[문제]\n${formatQuestion(q)}`,
    });
}

/**
 * 문항 하나를 검수해 { flags, blind, informed } 를 돌려준다. llm이 null이면 규칙 검사만 한다.
 */
export async function validateQuestion({ llm, solverModel, passage, q, siblings }) {
    const flags = checkQuestion(q, passage.content, siblings);
    let blind = null;
    let informed = null;

    // 구조가 깨진 문항은 모델 호출 비용을 쓰지 않는다
    if (llm && !flags.includes("bad_structure")) {
        try {
            [blind, informed] = await Promise.all([
                solveBlind({ llm, model: solverModel, q }),
                solveInformed({ llm, model: solverModel, passage, q }),
            ]);
            if (informed.answer !== q.correct_answer) flags.push("key_mismatch");
            if (blind.answer === q.correct_answer && blind.confidence >= 4) flags.push("blind_solvable");
        } catch (err) {
            flags.push("llm_check_failed");
            console.warn(`  ⚠ 모델 검사 실패 (${q.uid}): ${err.message}`);
        }
    }
    return { flags, blind, informed };
}

function renderReviewMarkdown(passages) {
    const lines = ["# 문해력 문항 검수\n", "상태를 바꾸려면 `node scripts/literacy/approve.mjs`를 쓰세요. (uid 기준)\n"];
    for (const p of passages) {
        lines.push(`\n---\n\n## [${p.grade_level}학년/${p.genre}] ${p.title}\n`);
        if (p._warnings?.length) lines.push(...p._warnings.map((w) => `> ⚠ ${w}`), "");
        lines.push(p.content, "");
        const hist = answerPositionHistogram(p.questions || []);
        lines.push(`정답 위치 분포(1~4번): ${hist.join(" / ")}\n`);
        for (const q of p.questions || []) {
            const flags = q.checks?.flags || [];
            lines.push(`### \`${q.uid}\` · ${q.area} #${q.item_order} · **${q.status}**`);
            lines.push(`**${q.question}**`);
            q.options.forEach((o, i) => lines.push(`${i === q.correct_answer ? "- ✅" : "- ◻️"} ${i + 1}. ${o}`));
            lines.push(`- 근거: “${q.evidence}”`);
            lines.push(`- 해설: ${q.explanation}`);
            if (flags.length) lines.push(`- 🚩 플래그: ${flags.join(", ")}`);
            if (q.checks?.blind) lines.push(`- 지문 없이 풀기: ${q.checks.blind.answer + 1}번 (확신 ${q.checks.blind.confidence})`);
            if (q.checks?.informed) lines.push(`- 지문 보고 풀기: ${q.checks.informed.answer + 1}번`);
            lines.push("");
        }
    }
    return lines.join("\n");
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.in || !args.out) {
        console.error("사용법: node scripts/literacy/validate.mjs --in <drafts.json> --out <validated.json> [--review-md <file>] [--solver-model gpt-4o-mini] [--no-llm]");
        process.exit(1);
    }
    loadEnv();
    const solverModel = String(args["solver-model"] || "gpt-4o-mini");
    const llm = args["no-llm"] ? null : createLlm(process.env.OPENAI_API_KEY);

    const passages = readJson(args.in);
    const out = [];
    const tally = { pending: 0, auto_rejected: 0, approved: 0, rejected: 0 };

    for (const passage of passages) {
        const { errors, warnings } = checkPassage(passage);
        if (errors.length) {
            console.error(`✗ [${passage?.title ?? "?"}] 지문 오류: ${errors.join("; ")}`);
            continue;
        }
        const questions = passage.questions || [];
        const checked = await mapLimit(questions, 4, async (q) => {
            const result = await validateQuestion({ llm, solverModel, passage, q, siblings: questions });
            const kept = q.status === "approved" || q.status === "rejected";
            return {
                ...q,
                checks: { flags: result.flags, blind: result.blind, informed: result.informed },
                status: kept ? q.status : statusFromFlags(result.flags),
            };
        });
        checked.forEach((q) => tally[q.status] = (tally[q.status] || 0) + 1);
        out.push({ ...passage, _warnings: warnings, questions: checked });
        console.log(`✓ [${passage.title}] ${checked.map((q) => q.status[0]).join("")}`);
    }

    writeJson(args.out, out);
    if (args["review-md"]) {
        fs.mkdirSync(path.dirname(path.resolve(args["review-md"])), { recursive: true });
        fs.writeFileSync(args["review-md"], renderReviewMarkdown(out), "utf-8");
        console.log(`검수 문서: ${path.resolve(args["review-md"])}`);
    }
    console.log(`\n결과: 검수 대기 ${tally.pending} · 자동 탈락 ${tally.auto_rejected} · 승인 ${tally.approved} · 반려 ${tally.rejected}`);
    console.log(`저장: ${path.resolve(args.out)}`);
}

export { renderReviewMarkdown, AREAS };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
