// 3단계: 검수 결과를 DB에 반영
//
//   node scripts/literacy/seed.mjs --in scripts/literacy/data/validated.json [--dry-run]
//
// - approved  → literacy_questions 에 is_verified=true 로 저장 (서비스에 출제됨)
// - pending   → is_verified=false 로 저장 (출제되지 않음, 나중에 승인 후 다시 실행하면 승격)
// - rejected / auto_rejected → 저장하지 않음
// - 지문은 제목으로 찾고 없으면 만든다. 4개 영역 모두 승인 문항이 있을 때만 is_active=true 가 된다.
// 이미 있는 (지문, 영역, item_order) 문항은 덮어쓰지 않고, 승인 상태만 올린다.
import { createClient } from "@supabase/supabase-js";
import { AREAS, checkPassage, countWords, loadEnv, parseArgs, readJson } from "./lib.mjs";

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.in) {
        console.error("사용법: node scripts/literacy/seed.mjs --in <validated.json> [--dry-run]");
        process.exit(1);
    }
    loadEnv();
    const dry = !!args["dry-run"];
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env.local)");
        process.exit(1);
    }
    const supabase = createClient(url, key);
    const passages = readJson(args.in);
    const summary = { passagesCreated: 0, questionsInserted: 0, questionsPromoted: 0, skipped: 0, activated: 0 };

    for (const p of passages) {
        const { errors } = checkPassage(p);
        if (errors.length) {
            console.error(`✗ [${p?.title ?? "?"}] ${errors.join("; ")}`);
            continue;
        }
        const wanted = (p.questions || []).filter((q) => q.status === "approved" || q.status === "pending");
        if (wanted.length === 0) {
            summary.skipped++;
            console.log(`- [${p.title}] 저장할 문항 없음`);
            continue;
        }

        // 지문 찾기/만들기
        let { data: existing, error: findErr } = await supabase
            .from("literacy_passages").select("id, is_active").eq("title", p.title).maybeSingle();
        if (findErr) throw findErr;

        if (!existing) {
            if (dry) {
                console.log(`(dry) 지문 생성: [${p.grade_level}학년] ${p.title}`);
                existing = { id: "dry-run", is_active: false };
            } else {
                const { data: created, error } = await supabase.from("literacy_passages").insert({
                    title: p.title,
                    content: p.content,
                    grade_level: p.grade_level,
                    genre: p.genre,
                    interest_tags: p.interest_tags || [],
                    word_count: countWords(p.content),
                    char_count: p.content.trim().length,
                    source_attribution: p.source_attribution || "Book,ok 자체 제작 지문",
                    key_vocabularies: p.key_vocabularies || [],
                    is_active: false, // 승인 문항이 갖춰질 때까지 비활성
                }).select("id, is_active").single();
                if (error) throw error;
                existing = created;
            }
            summary.passagesCreated++;
        }

        // 기존 문항 조회
        const { data: current } = dry && existing.id === "dry-run"
            ? { data: [] }
            : await supabase.from("literacy_questions").select("id, area, item_order, is_verified").eq("passage_id", existing.id);
        const byKey = new Map((current || []).map((r) => [`${r.area}|${r.item_order}`, r]));

        for (const q of wanted) {
            const verified = q.status === "approved";
            const found = byKey.get(`${q.area}|${q.item_order}`);
            if (found) {
                if (verified && !found.is_verified) {
                    if (!dry) {
                        const { error } = await supabase.from("literacy_questions").update({ is_verified: true }).eq("id", found.id);
                        if (error) throw error;
                    }
                    summary.questionsPromoted++;
                }
                continue;
            }
            if (!dry) {
                const { error } = await supabase.from("literacy_questions").insert({
                    passage_id: existing.id,
                    area: q.area,
                    item_order: q.item_order,
                    question: q.question,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    evidence: q.evidence,
                    explanation: q.explanation,
                    // 모델이 매긴 점수가 아니라 사람 검수 여부를 반영: 승인 100, 대기 0
                    critic_score: verified ? 100 : 0,
                    is_verified: verified,
                    review_note: q.review_note ?? null,
                });
                if (error) throw error;
            }
            summary.questionsInserted++;
        }

        // 4개 영역 모두 승인 문항이 있으면 지문을 활성화
        if (!dry && existing.id !== "dry-run") {
            const { data: verifiedRows } = await supabase
                .from("literacy_questions").select("area").eq("passage_id", existing.id).eq("is_verified", true);
            const covered = AREAS.every((a) => (verifiedRows || []).some((r) => r.area === a));
            if (covered && !existing.is_active) {
                const { error } = await supabase.from("literacy_passages").update({ is_active: true }).eq("id", existing.id);
                if (error) throw error;
                summary.activated++;
            }
            console.log(`✓ [${p.title}] ${covered ? "활성" : "비활성(승인 문항 부족)"}`);
        }
    }

    console.log(`\n${dry ? "(dry-run) " : ""}지문 생성 ${summary.passagesCreated} · 문항 저장 ${summary.questionsInserted} · 승인 승격 ${summary.questionsPromoted} · 활성화 ${summary.activated} · 건너뜀 ${summary.skipped}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
