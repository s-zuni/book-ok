import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ──────────────────────────────────────────────
// Zod v4 스키마: 요청 바디 유효성 검증
// ──────────────────────────────────────────────
const ReadBookSchema = z.object({
    title: z.string().min(1, '책 제목은 필수입니다.'),
    category: z.string().optional(),
    // rating은 1~5 사이의 정수 또는 미입력(undefined)
    rating: z.number().int().min(1).max(5).optional(),
    difficulty: z.string().optional(),
    readDate: z.string().min(1, '독서 날짜는 필수입니다.'),
});

const ReadingPlanRequestSchema = z.object({
    childName: z.string().min(1, '자녀 이름은 필수입니다.'),
    // 나이: 정수, 0세 이상 20세 이하
    childAge: z
        .number()
        .int('childAge는 정수여야 합니다.')
        .min(0, '나이는 0세 이상이어야 합니다.')
        .max(20, '나이는 20세 이하여야 합니다.'),
    // 읽은 책 목록: 배열이어야 하고, 각 항목은 ReadBookSchema를 따름
    readBooks: z.array(ReadBookSchema).min(0),
    analysisResult: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    missingGenres: z.array(z.string()).optional(),
});

interface WeeklyPlan {
    week: number;
    theme: string;
    goals: string[];
    recommendedBooks: {
        genre: string;
        suggestion: string;
        reason: string;
    }[];
    activities: string[];
}

interface ReadingPlan {
    summary: string;
    monthlyGoal: number;
    weeklyPlans: WeeklyPlan[];
    tips: string[];
    strengthAreas: string[];
    improvementAreas: string[];
}

export async function POST(request: NextRequest) {
    try {
        // 1. JSON 파싱
        let rawBody: unknown;
        try {
            rawBody = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: '요청 바디가 올바른 JSON 형식이 아닙니다.' },
                { status: 400 }
            );
        }

        // 2. Zod 스키마 검증 (safeParse)
        const parsed = ReadingPlanRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
            // Zod v4: issues 프로퍼티 사용
            const errorMessages = parsed.error.issues.map(
                (issue) => `[${issue.path.join('.')}] ${issue.message}`
            );
            return NextResponse.json(
                { success: false, error: '입력값이 유효하지 않습니다.', details: errorMessages },
                { status: 422 }
            );
        }

        const { childName, childAge, readBooks, keywords = [], missingGenres = [] } = parsed.data;

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'OpenAI API Key not configured' }, { status: 500 });
        }

        // 월간 읽은 책 계산
        const monthlyReadCount = readBooks.filter(book => {
            const readDate = new Date(book.readDate);
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            return readDate >= oneMonthAgo;
        }).length;

        // 평균 난이도 계산
        const difficultyMap: Record<string, number> = { '쉬움': 1, '적당': 2, '어려움': 3 };
        const avgDifficulty = readBooks.reduce((sum, book) =>
            sum + (difficultyMap[book.difficulty || '적당'] || 2), 0
        ) / (readBooks.length || 1);

        // 평균 별점 계산
        const avgRating = readBooks.reduce((sum, book) =>
            sum + (book.rating || 3), 0
        ) / (readBooks.length || 1);

        const prompt = `당신은 아동 독서 전문가입니다. 아래 정보를 바탕으로 개인화된 4주 독서 계획을 JSON 형식으로 생성해주세요.\n\n## 아이 정보\n- 이름: ${childName}\n- 나이: ${childAge}세\n- 최근 읽은 책 수: ${readBooks.length}권\n- 월간 독서량: ${monthlyReadCount}권\n- 평균 난이도: ${avgDifficulty.toFixed(1)} (1:쉬움, 2:적당, 3:어려움)\n- 평균 별점: ${avgRating.toFixed(1)}/5\n\n## 읽은 책 목록 (최근 10권)\n${readBooks.slice(-10).map(b => `- ${b.title} (${b.category || '장르미상'}, 별점: ${b.rating || '미평가'}, 난이도: ${b.difficulty || '미평가'})`).join('\n')}\n\n## AI 분석 키워드\n${keywords.join(', ') || '정보 없음'}\n\n## 부족한 장르\n${missingGenres.join(', ') || '정보 없음'}\n\n## 생성할 JSON 구조\n{\n  "summary": "전체 계획 요약 (2-3문장)",\n  "monthlyGoal": 목표 권수(숫자),\n  "weeklyPlans": [\n    {\n      "week": 1,\n      "theme": "주간 테마",\n      "goals": ["구체적 목표 1", "구체적 목표 2"],\n      "recommendedBooks": [\n        {\n          "genre": "장르",\n          "suggestion": "추천 도서 유형",\n          "reason": "추천 이유"\n        }\n      ],\n      "activities": ["독후 활동 1", "독후 활동 2"]\n    }\n  ],\n  "tips": ["부모님 팁 1", "부모님 팁 2"],\n  "strengthAreas": ["강점 분야 1", "강점 분야 2"],\n  "improvementAreas": ["개선 필요 분야 1"]\n}\n\n중요 지침:\n1. 아이의 나이(${childAge}세)에 적합한 계획을 세워주세요.\n2. 부족한 장르를 자연스럽게 포함시켜 균형 있는 독서를 유도해주세요.\n3. 별점이 높았던 책 유형을 활용하고, 난이도가 적절하도록 조절해주세요.\n4. 독후 활동은 창의적이고 실행 가능해야 합니다.\n5. 반드시 유효한 JSON만 반환하세요. 다른 텍스트 없이 JSON만 출력하세요.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: '당신은 아동 독서 교육 전문가입니다. 항상 유효한 JSON 형식으로만 응답합니다.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: "json_object" }
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'OpenAI API Error');
        }

        const responseText = data.choices[0]?.message?.content || '{}';

        let plan: ReadingPlan;
        try {
            plan = JSON.parse(responseText) as ReadingPlan;
        } catch {
            // 기본 계획 생성
            plan = {
                summary: "개인화된 독서 계획을 생성하는 중 오류가 발생했습니다.",
                monthlyGoal: Math.max(4, monthlyReadCount + 2),
                weeklyPlans: [],
                tips: ["꾸준한 독서 습관이 중요합니다", "아이와 함께 책을 읽어보세요"],
                strengthAreas: [],
                improvementAreas: missingGenres.slice(0, 2)
            };
        }

        return NextResponse.json({ success: true, plan });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to generate reading plan';
        console.error('Reading plan generation error:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
