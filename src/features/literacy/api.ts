import { supabase, supabaseUrl, supabaseAnonKey } from "@shared/lib/supabase";
import { safeFetch } from "@shared/lib/api";
import { LiteracyAssessment, LiteracyPassage, LiteracyQuestion } from "@shared/types";
import { AREA_METADATA, getGradeConfig } from "./scoring";

/** 서버가 내려준 HTTP 상태를 함께 전달해, 만료·중복 제출 같은 복구 불가 오류를 구분한다 */
export class LiteracyApiError extends Error {
    constructor(message: string, public status: number) {
        super(message);
        this.name = "LiteracyApiError";
    }
}

export interface StartLiteracyTestParams {
    childId?: string | number | null;
    childAge?: number | null;
    gradeLevel: number;
    preferredTopics?: string[];
    preferredGenre?: string;
}

export interface StartLiteracyTestResponse {
    passage: LiteracyPassage;
    questions: LiteracyQuestion[];
    /** 지문 없이 바로 푸는 낱말 퀴즈 문항. 없으면(문항 준비 전) 빈 배열 */
    word_questions?: LiteracyQuestion[];
    /** 서버가 발급한 진단 세션 토큰 (읽기 시간 검증용) */
    session_token?: string;
}

export interface SubmitLiteracyAnswerItem {
    question_id: string;
    area: string;
    /** 화면에 보인 보기 순서 기준 인덱스. 미응답/모르겠어요는 -1 */
    selected: number;
    time_spent_sec: number;
    /** "잘 모르겠어요"를 직접 고른 경우 */
    unsure?: boolean;
}

export interface SubmitLiteracyTestParams {
    childId?: string | number | null;
    passageId: string;
    sessionToken?: string;
    gradeLevel: number;
    readingTimeSeconds: number;
    answers: SubmitLiteracyAnswerItem[];
    preferredTopics?: string[];
}

/** 로그인 세션 토큰이 있으면 사용하고, 없으면 anon key(게스트)로 호출 */
async function buildEdgeHeaders(): Promise<Record<string, string>> {
    let token = supabaseAnonKey;
    try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) token = data.session.access_token;
    } catch {
        // 세션 조회 실패 시 게스트로 진행
    }
    return {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${token}`,
    };
}

/**
 * Step 1 & 2: 문해력 진단 지문 및 검수 완료 문항 세트 인출
 */
export async function startLiteracyTest(
    params: StartLiteracyTestParams
): Promise<StartLiteracyTestResponse> {
    try {
        const res = await safeFetch(`${supabaseUrl}/functions/v1/literacy-test`, {
            method: "POST",
            headers: await buildEdgeHeaders(),
            body: JSON.stringify({
                action: "start",
                // 낱말 퀴즈 화면을 지원하는 클라이언트임을 알린다 (구버전 앱은 보내지 않아 기존 방식으로 출제됨)
                wordQuiz: true,
                ...params,
            }),
        });

        if (res.ok) {
            const data = await res.json();
            if (data.passage && Array.isArray(data.questions) && data.questions.length > 0) {
                return data as StartLiteracyTestResponse;
            }
        }
    } catch (err) {
        console.warn("startLiteracyTest failed:", err);
    }

    // 문항 테이블은 정답 보호를 위해 클라이언트 직접 조회를 허용하지 않는다 (Edge Function 전용)
    throw new Error("문해력 진단 문항을 불러올 수 없어요. 잠시 후 다시 시도해 주세요.");
}

/** 낱말 퀴즈 한 문항의 즉시 확인 결과 (서버가 첫 답을 고정하고 정답·해설을 알려 준다) */
export interface LiteracyWordCheckResult {
    question_id: string;
    /** 서버에 고정된 첫 답 (섞인 보기 기준) */
    selected: number;
    is_correct: boolean;
    /** 섞인 보기 기준 정답 인덱스 */
    correct_answer: number;
    explanation: string;
}

export async function checkLiteracyWord(params: {
    passageId: string;
    sessionToken?: string;
    questionId: string;
    selected: number;
}): Promise<LiteracyWordCheckResult> {
    const res = await safeFetch(`${supabaseUrl}/functions/v1/literacy-test`, {
        method: "POST",
        headers: await buildEdgeHeaders(),
        body: JSON.stringify({ action: "check", ...params }),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new LiteracyApiError(errData.error || "답을 확인하지 못했어요.", res.status);
    }
    return (await res.json()) as LiteracyWordCheckResult;
}

/**
 * 답안 제출: 정답 비율 채점과 보완 영역 관련 도서 추천
 */
export async function submitLiteracyTest(
    params: SubmitLiteracyTestParams
): Promise<LiteracyAssessment> {
    const res = await safeFetch(`${supabaseUrl}/functions/v1/literacy-test`, {
        method: "POST",
        headers: await buildEdgeHeaders(),
        body: JSON.stringify({
            action: "submit",
            ...params,
        }),
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new LiteracyApiError(errData.error || "문해력 채점 중 오류가 발생했습니다.", res.status);
    }

    const data = await res.json();
    const assessment = data.assessment as LiteracyAssessment;
    // 코칭 팁은 화면 어디서나 같은 문구가 보이도록 클라이언트 상수를 단일 출처로 쓴다
    return { ...assessment, coaching_tip: AREA_METADATA[assessment.weakest_area]?.coachingGuide || assessment.coaching_tip };
}

type LiteracyHistoryRow = LiteracyAssessment & {
    passage_snapshot?: PassageSnapshot | null;
    literacy_passages?: PassageSnapshot | PassageSnapshot[] | null;
};

type PassageSnapshot = { title?: string; content?: string; genre?: string; word_count?: number };

/**
 * 자녀의 과거 문해력 진단 이력 조회 (최신순)
 */
export async function fetchChildLiteracyHistory(
    childId?: string | number | null
): Promise<LiteracyAssessment[]> {
    if (!childId) return [];

    const { data, error } = await supabase
        .from("literacy_assessments")
        .select(`
            *,
            literacy_passages (
                title,
                content,
                genre,
                word_count
            )
        `)
        .eq("child_id", Number(childId))
        .order("created_at", { ascending: false })
        .limit(10);

    if (error || !data) {
        console.warn("fetchChildLiteracyHistory warning:", error);
        return [];
    }

    return (data as LiteracyHistoryRow[]).map((row) => {
        // 저장 시점의 지문 스냅샷을 우선 사용한다 (지문이 수정·비활성화되어도 과거 해설이 어긋나지 않게)
        const joinedPassage =
            row.passage_snapshot ||
            (Array.isArray(row.literacy_passages) ? row.literacy_passages[0] : row.literacy_passages);
        const gradeConfig = getGradeConfig(row.grade_level);
        return {
            ...row,
            passage_title: joinedPassage?.title || "문해력 진단 지문",
            passage_content: joinedPassage?.content || "",
            passage_genre: joinedPassage?.genre || "공통",
            word_count: joinedPassage?.word_count || 0,
            saved: true,
            grade_label: gradeConfig.label,
            norm_wpm: gradeConfig.targetWpm,
            weakest_area_label: AREA_METADATA[row.weakest_area]?.label || row.weakest_area,
            strength_area_label: AREA_METADATA[row.strength_area]?.label || row.strength_area,
            coaching_tip: AREA_METADATA[row.weakest_area]?.coachingGuide || "",
        } as LiteracyAssessment;
    });
}

