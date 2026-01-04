
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
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

    } catch (error: any) {
        console.error('OpenAI API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch response' }, { status: 500 });
    }
}
