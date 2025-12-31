
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  // Accept both 'q' and 'query' parameters for compatibility
  const query = searchParams.get('q') || searchParams.get('query')
  const page = searchParams.get('page') || '1'

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter (q or query) is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ALADIN_KEY = process.env.ALADIN_API_KEY;

  if (!ALADIN_KEY) {
    console.error('ALADIN_API_KEY is not set in environment variables');
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_KEY}&Query=${encodeURIComponent(query)}&QueryType=Title&MaxResults=10&start=${page}&SearchTarget=Book&output=js&Version=20131101&CategoryId=13789`;

  console.log(`Searching Aladin API for: "${query}" (page ${page})`);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
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
    return new Response(JSON.stringify({ error: 'Failed to fetch data from Aladin API.', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
