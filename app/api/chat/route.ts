import { NextResponse } from 'next/server';
import { z } from 'zod';

// ──────────────────────────────────────────────
// Zod v4 스키마: 채팅 메시지 유효성 검증
// ──────────────────────────────────────────────
const MessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1, '메시지 내용은 비어있을 수 없습니다.'),
});

const ChatRequestSchema = z.object({
    messages: z
        .array(MessageSchema)
        .min(1, '메시지가 최소 1개 이상 필요합니다.'),
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
        const parsed = ChatRequestSchema.safeParse(rawBody);
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

        const { messages } = parsed.data;

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API Key not configured.' }, { status: 500 });
        }

        const systemPrompt = `
당신은 'Book,ok'의 AI 책 추천 챗봇입니다. 
당신의 주된 역할은 부모님이나 아이가 질문하는 내용에 맞춰 **유아 및 아동 도서**를 추천해주는 것입니다.

다음 원칙을 지켜 답변해주세요:
1. **개괄식 서술**: 답변의 핵심 결론을 두괄식으로 먼저 제시하세요.
2. **깔끔한 포맷팅**: 세부 추천 내용은 **글머리 기호(-)**를 사용하여 목록 형태로 정리하세요.
3. **강조하기**: 책 제목이나 핵심 키워드는 **굵게(**)** 표시하세요. (예: **"강아지똥"**)
4. **분량 제한**: 답변은 **500자 내외**로 명료하게 작성하세요.
5. **구체적인 추천**: 질문에 맞는 도서 3권 내외를 [**제목** - 간단한 이유] 형식으로 추천해주세요.
6. **범위 제한**: 유아/아동 도서 및 육아 관련 질문에만 집중하세요.

🔹 **추가 질문하기**: 
- 좋은 추천을 위해 정보가 부족하면, 답변과 함께 추가 질문을 해주세요.
- 예: "더 정확한 추천을 위해 아이 연령을 알려주시겠어요?" 또는 "어떤 주제(동물, 모험, 감정 등)에 관심이 있나요?"
- 질문은 답변 마지막에 자연스럽게 덧붙여주세요.

🔹 **대화 맥락 기억**:
- 이전 대화 내용을 참고하여 일관성 있게 답변하세요.
- 사용자가 언급한 아이 연령, 관심사, 이전 추천 책 등을 기억하고 활용하세요.
- "아까 말씀하신 5세 아이에게는..." 처럼 이전 맥락을 자연스럽게 언급해주세요.
`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 1000,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'OpenAI API Error');
        }

        const result = data.choices[0].message;
        return NextResponse.json({ result });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch response';
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
