import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ──────────────────────────────────────────────
// Zod v4 스키마: 요청 바디 유효성 검증
// ──────────────────────────────────────────────
const GeminiRequestSchema = z.object({
    prompt: z.string().min(1, 'prompt는 비어있을 수 없습니다.'),
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req: NextRequest) {
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
        const parsed = GeminiRequestSchema.safeParse(rawBody);
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

        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const { prompt } = parsed.data;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.error?.message || 'Gemini API Error' }, { status: response.status });
        }

        const solutionText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return NextResponse.json({ result: solutionText });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Gemini API Handler Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
