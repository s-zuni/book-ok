
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId');

    if (!itemId) {
        return new Response(JSON.stringify({ error: 'ItemId is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const ALADIN_KEY = process.env.ALADIN_API_KEY;

    if (!ALADIN_KEY) {
        return new Response(JSON.stringify({ error: 'API key not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Use ItemLookUp to get details
    const url = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ALADIN_KEY}&itemIdType=ISBN13&ItemId=${itemId}&output=js&Version=20131101&OptResult=toc,description`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Aladin API error: ${res.status}`);
        const data = await res.json();

        // Return relevant data
        const item = data.item?.[0];
        if (!item) {
            return new Response(JSON.stringify({ error: 'Book not found' }), { status: 404 });
        }

        return new Response(JSON.stringify({
            description: item.description || '',
            toc: item.toc || '' // Table of Contents
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Aladin Detail API Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch details' }), {
            status: 500,
        });
    }
}
