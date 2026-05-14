import { NextResponse } from 'next/server';
import { z } from 'zod';

// ──────────────────────────────────────────────
// Zod v4 스키마: 요청 바디 유효성 검증
// ──────────────────────────────────────────────
const OpenAIRequestSchema = z.object({
    prompt: z.string().min(1, 'prompt는 비어있을 수 없습니다.'),
});

export async function POST(req: Request) {
    try {
        // 1. JSON 파싱
        let rawBody: unknown;
        try {
            rawBody = await req.json();
        } catch {
            return NextResponse.json(
                { error: '요청 바디가 올바른 JSON 형식이 아닙니다.' },
                { status: 400 }
            );
        }

        // 2. Zod 스키마 검증 (safeParse)
        const parsed = OpenAIRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
            // Zod v4: issues 프로퍼티 사용
            const errorMessages = parsed.error.issues.map(
                (issue) => `[${issue.path.join('.')}] ${issue.message}`
            );
            return NextResponse.json(
                { error: '입력값이 유효하지 않습니다.', details: errorMessages },
                { status: 422 }
            );
        }

        const { prompt } = parsed.data;
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API Key not configured.' }, { status: 500 });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: "system", content: "당신은 아동 독서 교육 및 발달 전문가입니다. 부모님들에게 아이의 독서 성향을 분석해주고, 맞춤형 조언과 솔루션을 제공하는 역할을 맡고 있습니다. 친절하고 전문적인 어조(존댓말)로 답변해주세요." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'OpenAI API Error');
        }

        const result = data.choices[0].message.content;
        return NextResponse.json({ result });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch response';
        console.error('OpenAI API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
