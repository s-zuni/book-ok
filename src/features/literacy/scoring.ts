import { Child, LiteracyAssessment } from "@shared/types";

export interface GradeLevelConfig {
    grade: number;
    label: string;
    shortLabel: string;
    ageRange: string;
    targetWpm: number;
    description: string;
    isParentGuided?: boolean;
}

export const GRADE_LEVEL_OPTIONS: readonly GradeLevelConfig[] = [
    {
        grade: 0,
        label: "유아 (만 5~6세)",
        shortLabel: "유아 5~6세",
        ageRange: "만 5~6세",
        targetWpm: 65,
        description: "부모님과 함께 읽으며 기초 어휘와 이야기 흐름을 파악해요",
        isParentGuided: true,
    },
    {
        grade: 1,
        label: "초등 1학년",
        shortLabel: "초등 1학년",
        ageRange: "만 7세",
        targetWpm: 105,
        description: "짧은 동화와 자연 이야기 속 낱말과 중심 내용을 이해해요",
    },
    {
        grade: 2,
        label: "초등 2학년",
        shortLabel: "초등 2학년",
        ageRange: "만 8세",
        targetWpm: 135,
        description: "인물의 마음과 원리를 설명하는 글을 스스로 읽고 추론해요",
    },
    {
        grade: 3,
        label: "초등 3학년",
        shortLabel: "초등 3학년",
        ageRange: "만 9세",
        targetWpm: 165,
        description: "교과 연계 비문학 지문의 중심 문장과 인과관계를 파악해요",
    },
    {
        grade: 4,
        label: "초등 4학년",
        shortLabel: "초등 4학년",
        ageRange: "만 10세",
        targetWpm: 195,
        description: "역사·철학 지문 속 관용 표현과 글쓴이의 의도를 깊이 이해해요",
    },
    {
        grade: 5,
        label: "초등 5학년",
        shortLabel: "초등 5학년",
        ageRange: "만 11세",
        targetWpm: 225,
        description: "사회·과학 논설문의 근거를 분석하고 타당성을 판단해요",
    },
    {
        grade: 6,
        label: "초등 6학년",
        shortLabel: "초등 6학년",
        ageRange: "만 12세",
        targetWpm: 250,
        description: "복합 텍스트와 추상적 개념을 비판적·통합적으로 독해해요",
    },
] as const;

export const AREA_METADATA: Record<
    string,
    {
        label: string;
        shortLabel: string;
        badgeColor: string;
        description: string;
        coachingGuide: string;
    }
> = {
    vocabulary: {
        label: "어휘력",
        shortLabel: "어휘력",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        description: "문맥을 고려한 낱말의 정확한 뜻, 다의어, 관용 표현 이해도",
        coachingGuide:
            "모르는 단어를 만났을 때 앞뒤 문장을 단서로 삼아 뜻을 먼저 추측해 보는 '문맥 추리 대화'를 나누어 보세요.",
    },
    factual: {
        label: "사실적 이해",
        shortLabel: "사실 이해",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        description: "육하원칙, 중심 사건, 글에 명시된 세부 정보의 정확한 파악",
        coachingGuide:
            "글을 읽은 후 '누가, 왜, 어떻게 했는지' 핵심 내용을 세 가지 키워드로 꼽아 보는 습관을 길러 주세요.",
    },
    inferential: {
        label: "추론적 이해",
        shortLabel: "추론 이해",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        description: "등장인물의 속마음·감정 짐작 및 생략된 원인과 결과 유추",
        coachingGuide:
            "'만약 주인공이라면 왜 그렇게 행동했을까?', '다음에 어떤 일이 벌어질까?'처럼 열린 질문을 던져 주세요.",
    },
    critical: {
        label: "비판적 이해",
        shortLabel: "비판 이해",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        description: "글쓴이의 주장과 의도 파악, 근거의 타당성 평가 및 가치 판단",
        coachingGuide:
            "글쓴이의 생각에 동의하는지 물어보고, '나는 왜 그렇게 생각하는지' 이유를 덧붙여 말하는 연습을 해보세요.",
    },
    fluency: {
        label: "읽기 유창성",
        shortLabel: "유창성",
        badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
        description: "학년 권장 속도 대비 정확하고 막힘없이 글을 읽어 내려가는 능력",
        coachingGuide:
            "부모님과 한 문단씩 번갈아 소리 내어 읽는 '교대 낭독'을 통해 의미 단위로 끊어 읽는 리듬감을 키워 주세요.",
    },
};

export function getGradeConfig(grade: number): GradeLevelConfig {
    return GRADE_LEVEL_OPTIONS.find((g) => g.grade === grade) || GRADE_LEVEL_OPTIONS[2];
}

export function mapChildToDefaultGrade(child?: Child | null): number {
    if (!child) return 2;
    let age = child.age || 0;
    if (!age && child.birthdate) {
        age = Math.floor((Date.now() - new Date(child.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
    if (age <= 6 || child.type === "유아" || child.type === "영아") return 0;
    if (age === 7) return 1;
    if (age === 8) return 2;
    if (age === 9) return 3;
    if (age === 10) return 4;
    if (age === 11) return 5;
    return 6;
}

export interface RadarAxisPoint {
    subject: string;
    key: string;
    childScore: number;
    fullMark: number;
}

export function buildRadarChartData(assessment: LiteracyAssessment): RadarAxisPoint[] {
    return [
        {
            subject: "어휘력",
            key: "vocabulary",
            childScore: assessment.score_vocabulary,
            fullMark: 100,
        },
        {
            subject: "사실적 이해",
            key: "factual",
            childScore: assessment.score_factual,
            fullMark: 100,
        },
        {
            subject: "추론적 이해",
            key: "inferential",
            childScore: assessment.score_inferential,
            fullMark: 100,
        },
        {
            subject: "비판적 이해",
            key: "critical",
            childScore: assessment.score_critical,
            fullMark: 100,
        },
        {
            subject: "읽기 유창성",
            key: "fluency",
            childScore: assessment.score_fluency,
            fullMark: 100,
        },
    ];
}

