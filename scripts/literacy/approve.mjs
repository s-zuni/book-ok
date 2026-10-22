// 사람 검수 결과 반영: uid 기준으로 문항 상태를 바꾼다.
//
//   node scripts/literacy/approve.mjs --in validated.json --approve a1b2c3d4e5,f6a7b8c9d0 --reject 1122334455 [--note "보기 3 수정 필요"]
//   node scripts/literacy/approve.mjs --in validated.json --approve-pending     # 자동 탈락이 아닌 대기 문항 전부 승인 (--reject 로 예외 지정)
//
// 문구를 고치려면 JSON 파일에서 question/options/explanation 을 직접 수정한 뒤
// validate.mjs 를 다시 실행하세요. (approved/rejected 상태는 유지되고 플래그만 갱신됩니다)
import { parseArgs, readJson, writeJson } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.in || (!args.approve && !args.reject && !args["approve-pending"])) {
    console.error("사용법: node scripts/literacy/approve.mjs --in <validated.json> [--approve uid,uid] [--reject uid,uid] [--approve-pending] [--note 메모]");
    process.exit(1);
}

const list = (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const approve = new Set(list(args.approve));
const reject = new Set(list(args.reject));
const overlap = [...approve].filter((u) => reject.has(u));
if (overlap.length) {
    console.error(`승인과 반려에 같은 uid가 있습니다: ${overlap.join(", ")}`);
    process.exit(1);
}

const passages = readJson(args.in);
const known = new Set(passages.flatMap((p) => (p.questions || []).map((q) => q.uid)));
const unknown = [...approve, ...reject].filter((u) => !known.has(u));
if (unknown.length) {
    console.error(`알 수 없는 uid: ${unknown.join(", ")}`);
    process.exit(1);
}

const counts = { approved: 0, rejected: 0 };
for (const p of passages) {
    for (const q of p.questions || []) {
        if (reject.has(q.uid)) {
            q.status = "rejected";
            counts.rejected++;
        } else if (approve.has(q.uid) || (args["approve-pending"] && q.status === "pending")) {
            if (q.status === "auto_rejected" && !approve.has(q.uid)) continue;
            q.status = "approved";
            counts.approved++;
        } else continue;
        if (typeof args.note === "string") q.review_note = args.note;
    }
}
writeJson(args.in, passages);
console.log(`승인 ${counts.approved}건, 반려 ${counts.rejected}건 반영`);
