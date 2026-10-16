import { supabase, supabaseUrl, supabaseAnonKey } from "@shared/lib/supabase";
import { safeFetch } from "@shared/lib/api";
import { LiteracyAssessment, LiteracyPassage, LiteracyQuestion } from "@shared/types";
import { AREA_METADATA, getGradeConfig } from "./scoring";

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
    /** 서버가 발급한 진단 세션 토큰 (읽기 시간 검증용) */
    session_token?: string;
}

export interface SubmitLiteracyAnswerItem {
    question_id: string;
    area: string;
    selected: number;
    time_spent_sec: number;
}

export interface SubmitLiteracyTestParams {
    childId?: string | number | null;
    childName?: string;
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

/**
 * Step 3 & 4: 답안 제출, BLI 5각형 점수 산출 및 처방형 도서 추천 RAG 실행
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
        throw new Error(errData.error || "문해력 채점 중 오류가 발생했습니다.");
    }

    const data = await res.json();
    return data.assessment as LiteracyAssessment;
}

type LiteracyHistoryRow = LiteracyAssessment & {
    literacy_passages?:
        | { title?: string; content?: string; genre?: string; word_count?: number }
        | { title?: string; content?: string; genre?: string; word_count?: number }[]
        | null;
};

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
        const joinedPassage = Array.isArray(row.literacy_passages)
            ? row.literacy_passages[0]
            : row.literacy_passages;
        const gradeConfig = getGradeConfig(row.grade_level);
        return {
            ...row,
            passage_title: joinedPassage?.title || "문해력 진단 지문",
            passage_content: joinedPassage?.content || "",
            passage_genre: joinedPassage?.genre || "공통",
            word_count: joinedPassage?.word_count || 90,
            grade_label: gradeConfig.label,
            norm_wpm: gradeConfig.targetWpm,
            weakest_area_label: AREA_METADATA[row.weakest_area]?.label || row.weakest_area,
            strength_area_label: AREA_METADATA[row.strength_area]?.label || row.strength_area,
            coaching_tip: AREA_METADATA[row.weakest_area]?.coachingGuide || "",
        } as LiteracyAssessment;
    });
}

