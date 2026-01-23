
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API Key not configured.' }, { status: 500 });
        }

        const systemPrompt = `
당신은 'Book,ok'의 AI 책 추천 챗봇입니다. 
당신의 주된 역할은 부모님이나 아이가 질문하는 내용에 맞춰 **유아 및 아동 도서**를 추천해주는 것입니다.

다음 원칙을 지켜 답변해주세요:
1. **개괄식 서술**: 답변의 핵심 결론을 두괄식으로 먼저 제시하세요.
2. **깔끔한 포맷팅**: 세부 추천 내용은 **글머리 기호(-)**를 사용하여 목록 형태로 정리하세요. 줄글로 늘어놓지 마세요.
3. **강조하기**: 책 제목이나 핵심 키워드는 **굵게(**)** 표시하여 눈에 띄게 해주세요. (예: **"강아지똥"**)
4. **분량 제한**: 답변은 **500자 내외**로 명료하게 작성하세요. 지나친 서론은 생략합니다.
5. **구체적인 추천**: 질문에 맞는 도서 3권 내외를 선정하여 [**제목** - 간단한 이유/줄거리] 형식으로 추천해주세요.
6. **범위 제한**: 유아/아동 도서 및 육아 관련 질문에만 집중하세요.
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

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch response' }, { status: 500 });
    }
}
