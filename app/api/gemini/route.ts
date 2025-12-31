import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

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

    } catch (error) {
        console.error('Gemini API Handler Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
