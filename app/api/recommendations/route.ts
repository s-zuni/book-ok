
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query');
    const categoryId = searchParams.get('categoryId');

    if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Use the specific TTBKey provided in the requirements
    const TTBKey = "ttbzxzx7290920001";

    // Default to Children (1108) if not specified, but usually we pass what we want
    // The user requirement says "focused on Children/Infant categories".
    // Passing a specific categoryId is best.

    const targetCategory = categoryId || '1108'; // Default to 1108 (Children) if not provided

    // Construct Aladin API URL
    const url = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${TTBKey}&Query=${encodeURIComponent(query)}&Output=js&Version=20131101&SearchTarget=Book&CategoryId=${targetCategory}&MaxResults=10`;

    console.log(`Fetching recommendations from Aladin: Query="${query}", CategoryId=${targetCategory}`);

    try {
        const res = await fetch(url, {
            method: 'GET',
        });

        if (!res.ok) {
            throw new Error(`Aladin API call failed with status: ${res.status}`);
        }

        const data = await res.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Aladin API request error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return new Response(JSON.stringify({ error: 'Failed to fetch recommendations.', details: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
