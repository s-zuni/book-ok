
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const isbn = searchParams.get('isbn') || searchParams.get('id');

    if (!isbn) {
        return new Response(JSON.stringify({ error: 'ISBN or ID is required' }), {
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

    // Aladin ItemLookUp API
    // ItemIdType: ISBN13 (usually safe) or ISBN
    const url = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ALADIN_KEY}&ItemId=${isbn}&ItemIdType=ISBN13&output=js&Version=20131101&Cover=Big&OptResult=ebookList,usedList,reviewList`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.errorCode) {
            // Try ISBN if ISBN13 failed?
            const url2 = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ALADIN_KEY}&ItemId=${isbn}&ItemIdType=ISBN&output=js&Version=20131101&Cover=Big`;
            const res2 = await fetch(url2);
            const data2 = await res2.json();

            if (data2.errorCode) {
                return new Response(JSON.stringify({ error: data2.errorMessage }), { status: 404 });
            }
            return new Response(JSON.stringify(data2), { status: 200 });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: 'Failed to fetch from Aladin', details: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
