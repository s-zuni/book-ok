# 문해력 지문·문항 확충 파이프라인

AI가 문항 초안을 만들고, 규칙 검사와 독립 모델 풀이로 걸러낸 뒤, **사람이 승인한 문항만** 서비스에 출제합니다.
모든 명령은 저장소 루트에서 실행하며 `.env.local`에 `OPENAI_API_KEY`(1·2단계), `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`(3단계)가 필요합니다.

```
passages.json ──generate──▶ drafts.json ──validate──▶ validated.json ──(사람 검수)──▶ seed ──▶ DB
                                                    └▶ review.md
```

## 사전 준비 (한 번)
`supabase/migrations/20261022130000_literacy_question_item_order.sql`을 먼저 적용하세요(`supabase db push`). 이전 마이그레이션(`20261022120000`)과 함께 순서대로 적용됩니다. 이 마이그레이션이 있어야 영역당 문항을 여러 개 저장할 수 있습니다.

## 1. 지문 작성
`scripts/literacy/data/passages.json`에 지문을 씁니다.

```json
[
  {
    "title": "지문 제목",
    "grade_level": 3,
    "genre": "과학",
    "interest_tags": ["science", "animal"],
    "content": "지문 본문 …",
    "source_attribution": "Book,ok 자체 제작 지문"
  }
]
```
- 저작권 문제가 없는 자체 제작 글만 넣으세요. 분량은 학년별 권장 범위를 벗어나면 경고가 나옵니다(예: 5·6학년 140~340어절).
- 이미 서비스 중인 지문(제목이 같은 지문)에 문항만 더하려면 같은 `title`로 적습니다. 기존 문항은 `item_order 0`이라 새로 만든 0번은 건너뛰고 1번 이후만 추가됩니다.

## 2. 문항 초안 생성
```bash
npm run literacy:generate -- --in scripts/literacy/data/passages.json --out scripts/literacy/data/drafts.json --per-area 3
```
- 영역(어휘·사실·추론·비판)마다 `--per-area`개씩 만듭니다. 규칙(영역별 개수, 근거 문장 원문 일치 등)을 못 지키면 최대 3번 다시 시도합니다.
- 모델이 정답을 특정 번호에 몰아 쓰므로 저장 전에 보기를 섞습니다. (출제 때도 세션마다 다시 섞입니다.)
- `--model`(기본 `gpt-4o`), `--limit N`(처음 N편만, 비용 확인용)을 쓸 수 있습니다. 이미 문항이 있는 지문은 건너뜁니다.

## 3. 자동 검수
```bash
npm run literacy:validate -- --in scripts/literacy/data/drafts.json --out scripts/literacy/data/validated.json --review-md scripts/literacy/data/review.md
```
| 플래그 | 의미 | 처리 |
|---|---|---|
| `bad_structure` | 보기 4개·정답 범위·영역 등 형식 오류 | 자동 탈락 |
| `evidence_not_found` | 근거 문장이 지문에 그대로 없음 | 자동 탈락 |
| `duplicate_options` / `duplicate_question` | 보기·질문 중복 | 자동 탈락 |
| `key_mismatch` | 지문을 보고 푼 모델의 답이 정답과 다름(정답이 틀렸거나 모호) | 자동 탈락 |
| `blind_solvable` | 지문 없이도 확신 있게 맞힘(지문 의존성 낮음) | 경고, 사람이 판단 |
| `length_cue` / `correct_longest` | 보기 길이로 정답이 드러남 | 경고 |
| `all_of_above` | "모두 맞다" 류 보기 | 경고 |
| `evidence_short` | 근거 문장이 너무 짧음 | 경고 |
| `llm_check_failed` | 모델 호출 실패 | 경고(다시 실행) |

- `--no-llm`이면 규칙 검사만 합니다. 같은 문서를 다시 실행해도 사람이 정한 `approved`/`rejected`는 유지됩니다.
- 풀이 검사에 쓰는 `--solver-model`(기본 `gpt-4o-mini`)이 출제 모델과 같은 계열이라 **완전히 독립적이지 않습니다.** 자동 검수는 걸러내는 장치이고, 승인은 사람이 합니다.

## 4. 사람 검수
`review.md`를 보고 지문당 문항을 확인합니다. 확인할 것: 정답이 정말 하나인가 · 학년에 맞는 낱말인가 · 영역 분류가 맞는가 · 해설이 정확한가 · 편향·부적절한 내용이 없는가.
```bash
npm run literacy:approve -- --in scripts/literacy/data/validated.json --approve-pending --reject <uid>,<uid>
npm run literacy:approve -- --in scripts/literacy/data/validated.json --approve <uid>   # 자동 탈락 문항을 사람이 살리는 경우
```
문구를 고치려면 `validated.json`을 직접 수정한 뒤 3단계를 다시 실행하세요.

## 5. DB 반영
```bash
npm run literacy:seed -- --in scripts/literacy/data/validated.json --dry-run   # 먼저 확인
npm run literacy:seed -- --in scripts/literacy/data/validated.json
```
- `approved`는 `is_verified=true`(출제됨), `pending`은 `false`(출제 안 됨), 반려·자동 탈락은 저장하지 않습니다.
- 지문은 **4개 영역 모두에 승인 문항이 있을 때만** 활성화됩니다. 이미 있는 문항은 덮어쓰지 않습니다.

## 출제 규칙
한 번의 점검에서 영역당 최대 3문항(`MAX_QUESTIONS_PER_AREA`), 영역 순서 → `item_order` 순으로 출제합니다. 출제와 채점이 같은 선택 함수를 쓰므로 출제하지 않은 문항이 오답 처리되지 않습니다.

## 낱말 퀴즈 (지문 없이 바로 푸는 어휘 문항)
점검은 **낱말 퀴즈(6문제, 문제마다 바로 정답·해설 확인) → 지문 읽기 → 지문 문제(사실·추론·비판)** 순서로 진행됩니다. 어휘력 점수는 낱말 퀴즈로만 계산합니다. 연속 정답·별은 재미 요소이며 점수에 반영하지 않습니다.

- 유형: `cloze`(빈칸) · `synonym`(비슷한말) · `antonym`(반대말) · `meaning`(뜻) · `spelling`(맞춤법) · `odd_one_out`(다른 낱말 찾기)
- 학년별 **검수 완료 문항이 6개 이상**일 때만 그 학년에서 낱말 퀴즈가 열립니다. 그보다 적으면 기존처럼 지문의 어휘 문항을 씁니다.
- 한 번에 6문제를 세션마다 다르게 고르며, 가능한 한 유형이 겹치지 않게 뽑습니다.
- 문항별 확인(`check`)은 서버가 **첫 답을 고정**합니다. 같은 문항을 다시 눌러도 첫 답으로 채점됩니다.

### 문항 파일 `scripts/literacy/data/words.json`
```json
{ "grade_level": 3, "question_type": "antonym", "question": "'찬성'의 반대말은 무엇일까요?",
  "correct": "반대", "wrong": ["동의", "승낙", "허락"], "explanation": "…", "status": "pending" }
```
정답과 오답을 나눠 적으면 스크립트가 보기를 섞습니다. 빈칸 문항은 질문에 `___`를 넣습니다.

### 명령
```bash
npm run literacy:words -- --in scripts/literacy/data/words.json                      # 규칙 검사만
npm run literacy:words -- --in scripts/literacy/data/words.json --seed --dry-run     # 반영 미리보기
npm run literacy:words -- --in scripts/literacy/data/words.json --seed               # 저장 (pending은 출제 안 됨)
npm run literacy:words -- --in scripts/literacy/data/words.json --seed --approve-pending   # 사람이 검수한 문항을 승인으로 저장·승격
```
- 정답이 하나인지, 학년에 맞는 낱말인지, 비슷한말·반대말이 정확한지는 **사람이 확인**한 뒤 승인합니다. 규칙 검사는 구조·중복·빈칸·길이 단서만 봅니다.
- 이미 출제 중인 문항의 내용은 이 명령으로 바뀌지 않습니다. 고치려면 해당 행을 먼저 `is_verified=false`로 내린 뒤 수정하세요.
- 마이그레이션 `20261024120000_literacy_word_quiz.sql`이 필요합니다(지문에 묶이지 않는 문항, 첫 답 고정 테이블).
