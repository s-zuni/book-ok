
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

다음 원칙을 지켜주세요:
1. **친절하고 전문적인 어조**: 부모님께 조언하듯 정중하면서도 따뜻하게, 아이에게 말하듯 쉽고 친절하게 상황에 맞춰 답변하세요.
2. **구체적인 추천**: 질문에 대해 단순히 장르만 말하지 말고, 실제 존재하는 인기 도서나 스테디셀러의 **제목, 저자, 간단한 줄거리**를 포함하여 3권 내외로 추천해주세요.
3. **독서 교육 조언**: 책 추천과 함께, 해당 책을 어떻게 읽어주면 좋은지 또는 아이의 독서 습관에 대한 짧은 팁을 덧붙여주면 좋습니다.
4. **범위 제한**: 유아/아동 도서 및 육아 관련 질문에만 집중하세요. 그 외의 질문에는 명확한 답을 주기 어렵다고 정중히 거절하고 책 이야기로 유도하세요.
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
