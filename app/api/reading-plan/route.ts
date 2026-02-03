import { NextRequest, NextResponse } from 'next/server';

interface ReadingPlanRequest {
    childName: string;
    childAge: number;
    readBooks: {
        title: string;
        category?: string;
        rating?: number;
        difficulty?: string;
        readDate: string;
    }[];
    analysisResult?: string;
    keywords?: string[];
    missingGenres?: string[];
}

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
        const body: ReadingPlanRequest = await request.json();
        const { childName, childAge, readBooks, keywords = [], missingGenres = [] } = body;

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

        const prompt = `당신은 아동 독서 전문가입니다. 아래 정보를 바탕으로 개인화된 4주 독서 계획을 JSON 형식으로 생성해주세요.

## 아이 정보
- 이름: ${childName}
- 나이: ${childAge}세
- 최근 읽은 책 수: ${readBooks.length}권
- 월간 독서량: ${monthlyReadCount}권
- 평균 난이도: ${avgDifficulty.toFixed(1)} (1:쉬움, 2:적당, 3:어려움)
- 평균 별점: ${avgRating.toFixed(1)}/5

## 읽은 책 목록 (최근 10권)
${readBooks.slice(-10).map(b => `- ${b.title} (${b.category || '장르미상'}, 별점: ${b.rating || '미평가'}, 난이도: ${b.difficulty || '미평가'})`).join('\n')}

## AI 분석 키워드
${keywords.join(', ') || '정보 없음'}

## 부족한 장르
${missingGenres.join(', ') || '정보 없음'}

## 생성할 JSON 구조
{
  "summary": "전체 계획 요약 (2-3문장)",
  "monthlyGoal": 목표 권수(숫자),
  "weeklyPlans": [
    {
      "week": 1,
      "theme": "주간 테마",
      "goals": ["구체적 목표 1", "구체적 목표 2"],
      "recommendedBooks": [
        {
          "genre": "장르",
          "suggestion": "추천 도서 유형",
          "reason": "추천 이유"
        }
      ],
      "activities": ["독후 활동 1", "독후 활동 2"]
    }
  ],
  "tips": ["부모님 팁 1", "부모님 팁 2"],
  "strengthAreas": ["강점 분야 1", "강점 분야 2"],
  "improvementAreas": ["개선 필요 분야 1"]
}

중요 지침:
1. 아이의 나이(${childAge}세)에 적합한 계획을 세워주세요.
2. 부족한 장르를 자연스럽게 포함시켜 균형 있는 독서를 유도해주세요.
3. 별점이 높았던 책 유형을 활용하고, 난이도가 적절하도록 조절해주세요.
4. 독후 활동은 창의적이고 실행 가능해야 합니다.
5. 반드시 유효한 JSON만 반환하세요. 다른 텍스트 없이 JSON만 출력하세요.`;

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

    } catch (error: any) {
        console.error('Reading plan generation error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate reading plan' },
            { status: 500 }
        );
    }
}
