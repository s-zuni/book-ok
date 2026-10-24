// 1단계: 지문 초안 파일 → 문항 초안 생성 (오프라인)
//
//   node scripts/literacy/generate.mjs --in scripts/literacy/data/passages.json --out scripts/literacy/data/drafts.json
//        [--per-area 3] [--model gpt-4o] [--limit 5]
//
// 입력(passages.json): [{ title, grade_level, genre, interest_tags, content, key_vocabularies? }]
// 출력: 같은 배열 + questions[] (area, item_order, uid, question, options, correct_answer, evidence, explanation)
import path from "path";
import { pathToFileURL } from "url";
import {
    AREAS, AREA_GUIDE, GRADE_LABEL, checkPassage, checkQuestion, checkQuestionSet,
    createLlm, loadEnv, parseArgs, questionUid, readJson, shuffleOptions, writeJson, BLOCKING_FLAGS,
} from "./lib.mjs";

const QUESTION_SCHEMA = (perArea, needVocab) => ({
    type: "object",
    properties: {
        questions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    area: { type: "string", enum: AREAS },
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
        key_vocabularies: {
            type: "array",
            items: {
                type: "object",
                properties: { word: { type: "string" }, meaning: { type: "string" }, level: { type: "string" } },
                required: ["word", "meaning", "level"],
                additionalProperties: false,
            },
        },
    },
    required: ["questions", "key_vocabularies"],
    additionalProperties: false,
});

function buildPrompt(passage, perArea, needVocab) {
    const grade = GRADE_LABEL[passage.grade_level];
    const system = `당신은 초등 국어 문해력 문항 개발자입니다. 주어진 지문으로 ${grade} 아이를 위한 4지선다 문항을 만듭니다.

[영역별 출제 방향]
${AREAS.map((a) => `- ${a}: ${AREA_GUIDE[a]}`).join("\n")}

[반드시 지킬 규칙]
1. 영역마다 정확히 ${perArea}문항, 총 ${perArea * AREAS.length}문항을 만든다.
2. 정답은 하나뿐이고, 오답은 그럴듯하지만 지문에 비추어 분명히 틀려야 한다.
3. evidence는 지문 본문에 있는 문장을 한 글자도 바꾸지 말고 그대로 복사한다.
4. 같은 영역의 문항들은 서로 다른 문장·내용을 묻고, evidence도 서로 달라야 한다.
5. 지문을 읽지 않으면 풀 수 없게 만든다. 상식이나 보기의 말투만으로 정답이 드러나면 안 된다.
6. 네 보기의 길이와 문체를 비슷하게 맞춘다. "모두 맞다", "해당 없음" 같은 보기는 쓰지 않는다.
7. ${grade} 수준을 넘는 한자어·어려운 낱말을 쓰지 않는다. 유아는 문장을 짧게 쓴다.
8. explanation은 아이와 부모가 읽는 짧은 해설(1~2문장)로, 왜 그 보기가 정답인지 지문 근거와 함께 쓴다.
9. correct_answer는 0~3 정수(0이 첫 번째 보기)이다.
${needVocab ? "10. key_vocabularies에 지문의 핵심 낱말 3개를 word/meaning(아이용 쉬운 풀이)/level(예: 초등2)로 적는다." : "10. key_vocabularies는 빈 배열로 둔다."}`;
    const user = `[지문 제목] ${passage.title}\n[장르] ${passage.genre}\n[지문]\n${passage.content}`;
    return { system, user };
}

/**
 * 지문 하나에 대한 문항 초안을 만든다. 규칙 검사를 통과하지 못하면 최대 attempts번 다시 시도한다.
 * @returns {{questions: object[], key_vocabularies: object[]}}
 */
export async function generateQuestionsForPassage({ llm, model, passage, perArea, rand = Math.random, attempts = 3 }) {
    const needVocab = !Array.isArray(passage.key_vocabularies) || passage.key_vocabularies.length === 0;
    const { system, user } = buildPrompt(passage, perArea, needVocab);
    let lastIssue = "";
    for (let attempt = 1; attempt <= attempts; attempt++) {
        const out = await llm({
            model, system, user, temperature: 0.5, schema: QUESTION_SCHEMA(perArea, needVocab),
            timeoutMs: 120000,
        });
        const raw = Array.isArray(out?.questions) ? out.questions : [];
        const counters = Object.fromEntries(AREAS.map((a) => [a, 0]));
        const questions = raw
            .filter((q) => AREAS.includes(q?.area))
            .map((q) => {
                // 모델이 정답을 특정 번호에 몰아 쓰는 경향이 있어 저장 전에 한 번 섞는다
                const shuffled = shuffleOptions(q, rand);
                const itemOrder = counters[q.area]++;
                return { ...shuffled, item_order: itemOrder, uid: questionUid(passage.title, q.area, itemOrder) };
            });

        const setIssues = checkQuestionSet(questions, perArea);
        const blocked = questions.filter((q) =>
            checkQuestion(q, passage.content, questions).some((f) => BLOCKING_FLAGS.has(f))
        );
        if (setIssues.length === 0 && blocked.length === 0) {
            return { questions, key_vocabularies: needVocab ? out.key_vocabularies || [] : passage.key_vocabularies };
        }
        lastIssue = [...setIssues, blocked.length ? `규칙 위반 문항 ${blocked.length}개` : ""].filter(Boolean).join(", ");
        console.warn(`  ↻ 재시도 ${attempt}/${attempts}: ${lastIssue}`);
    }
    throw new Error(`문항 생성 실패 (${lastIssue})`);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.in || !args.out) {
        console.error("사용법: node scripts/literacy/generate.mjs --in <passages.json> --out <drafts.json> [--per-area 3] [--model gpt-4o] [--limit N]");
        process.exit(1);
    }
    loadEnv();
    const perArea = Number(args["per-area"] || 3);
    const model = String(args.model || "gpt-4o");
    const llm = createLlm(process.env.OPENAI_API_KEY);

    const passages = readJson(args.in);
    const results = [];
    let processed = 0;
    for (const passage of passages) {
        const { errors, warnings } = checkPassage(passage);
        if (errors.length) {
            console.error(`✗ [${passage?.title ?? "?"}] 지문 오류: ${errors.join("; ")}`);
            continue;
        }
        warnings.forEach((w) => console.warn(`  ⚠ [${passage.title}] ${w}`));

        if (Array.isArray(passage.questions) && passage.questions.length > 0) {
            results.push(passage); // 이미 문항이 있는 지문은 그대로 둔다
            continue;
        }
        if (args.limit && processed >= Number(args.limit)) {
            results.push(passage);
            continue;
        }
        process.stdout.write(`… [${passage.title}] 생성 중\n`);
        try {
            const { questions, key_vocabularies } = await generateQuestionsForPassage({ llm, model, passage, perArea });
            results.push({ ...passage, key_vocabularies, questions });
            processed++;
            console.log(`✓ [${passage.title}] ${questions.length}문항`);
        } catch (err) {
            console.error(`✗ [${passage.title}] ${err.message}`);
            results.push(passage);
        }
        writeJson(args.out, results); // 중간 저장
    }
    writeJson(args.out, results);
    console.log(`\n완료: ${path.resolve(args.out)} (새로 생성 ${processed}편)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
