// 낱말 퀴즈 문항 검사·반영
//
//   node scripts/literacy/words.mjs --in scripts/literacy/data/words.json                  # 검사만
//   node scripts/literacy/words.mjs --in scripts/literacy/data/words.json --seed --dry-run  # DB 반영 미리보기
//   node scripts/literacy/words.mjs --in scripts/literacy/data/words.json --seed            # 반영
//
// - status가 "approved"인 문항만 is_verified=true(출제됨). "pending"은 false로 저장되어 출제되지 않는다.
// - --approve-pending: 사람이 검수를 마친 pending 문항을 이번 실행에서 승인으로 취급한다.
// - 같은 (학년, 유형, 질문)이 이미 있으면 새로 만들지 않고, 승인만 올린다. 이미 출제 중인 문항의 내용은 바꾸지 않는다.
import { createClient } from "@supabase/supabase-js";
import { buildWordOptions, checkWordItem, loadEnv, parseArgs, readJson } from "./lib.mjs";

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.in) {
        console.error("사용법: node scripts/literacy/words.mjs --in <words.json> [--seed] [--dry-run] [--approve-pending]");
        process.exit(1);
    }
    const items = readJson(args.in);
    let failed = 0;
    const perGrade = {};
    const valid = [];
    for (const [i, item] of items.entries()) {
        const { errors, warnings } = checkWordItem(item);
        const label = `#${i + 1} [${item?.grade_level}학년/${item?.question_type}] ${String(item?.question ?? "").split("\n")[0].slice(0, 30)}`;
        if (errors.length) {
            failed++;
            console.error(`✗ ${label}: ${errors.join("; ")}`);
            continue;
        }
        for (const w of warnings) console.warn(`! ${label}: ${w}`);
        valid.push(item);
        perGrade[item.grade_level] = (perGrade[item.grade_level] || 0) + 1;
    }
    console.log(`검사: ${valid.length}개 통과, ${failed}개 오류`);
    console.log("학년별 문항 수:", JSON.stringify(perGrade));
    const hist = [0, 0, 0, 0];
    for (const it of valid) hist[buildWordOptions(it).correct_answer]++;
    console.log("저장 시 정답 위치 분포(출제 때 세션마다 다시 섞임):", hist.join(" / "));
    if (failed) process.exit(1);
    if (!args.seed) return;

    loadEnv();
    const dry = !!args["dry-run"];
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env.local)");
        process.exit(1);
    }
    const supabase = createClient(url, key);
    const { data: existingRows, error: loadErr } = await supabase
        .from("literacy_questions")
        .select("id, grade_level, question_type, question, is_verified")
        .is("passage_id", null);
    if (loadErr) throw loadErr;
    const byKey = new Map((existingRows || []).map((r) => [`${r.grade_level}|${r.question_type}|${r.question}`, r]));

    const summary = { inserted: 0, promoted: 0, unchanged: 0 };
    for (const item of valid) {
        const verified = item.status === "approved" || (!!args["approve-pending"] && item.status === "pending");
        const found = byKey.get(`${item.grade_level}|${item.question_type}|${item.question}`);
        if (found) {
            if (verified && !found.is_verified) {
                if (!dry) {
                    const { error } = await supabase.from("literacy_questions").update({ is_verified: true, critic_score: 100 }).eq("id", found.id);
                    if (error) throw error;
                }
                summary.promoted++;
            } else summary.unchanged++;
            continue;
        }
        const { options, correct_answer } = buildWordOptions(item);
        if (!dry) {
            const { error } = await supabase.from("literacy_questions").insert({
                passage_id: null,
                grade_level: item.grade_level,
                question_type: item.question_type,
                area: "vocabulary",
                question: item.question,
                options,
                correct_answer,
                evidence: null,
                explanation: item.explanation,
                critic_score: verified ? 100 : 0, // 모델 점수가 아니라 사람 검수 여부를 반영
                is_verified: verified,
            });
            if (error) throw error;
        }
        summary.inserted++;
    }
    console.log(`${dry ? "(dry-run) " : ""}새로 저장 ${summary.inserted} · 승인 승격 ${summary.promoted} · 변경 없음 ${summary.unchanged}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
