
import { type NextRequest } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url: string, timeoutMs: number = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const API_KEY = process.env.NLCF_API_KEY;

  if (!API_KEY) {
    console.error('NLCF_API_KEY is not set in environment variables');
    return new Response(JSON.stringify({
      error: 'API key not configured',
      response: { body: { items: { item: [] } } } // Return empty structure for graceful handling
    }), {
      status: 200, // Return 200 to prevent client-side errors
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = `https://api.kcisa.kr/openapi/service/rest/meta2/NLCFsase?serviceKey=${API_KEY}&numOfRows=20`;

  console.log('Fetching Librarian Books from:', url.replace(API_KEY || '', '***'));

  try {
    const res = await fetchWithTimeout(url, 10000); // 10 second timeout

    if (!res.ok) {
      console.error(`NLCF API failed: ${res.status} ${res.statusText}`);
      throw new Error(`NLCF API call failed with status: ${res.status}`);
    }

    const xmlData = await res.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => name === 'item', // Force 'item' to always be an array
    });
    const jsonData = parser.parse(xmlData);

    // Check if we have a valid response structure
    if (!jsonData.response?.body?.items?.item) {
      console.warn('Unexpected API response structure:', JSON.stringify(jsonData, null, 2));
    }

    return new Response(JSON.stringify(jsonData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Detailed error logging
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('NLCF API request timeout after 10 seconds');
      } else if ('code' in error && error.code === 'ENOTFOUND') {
        console.error('DNS resolution failed for api.kcisa.kr - the domain may be unreachable or down');
      } else {
        console.error('NLCF API request error:', error.message);
      }
    } else {
      console.error('NLCF API request error:', error);
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    // Return graceful fallback instead of error
    return new Response(JSON.stringify({
      error: 'Failed to fetch data from NLCF API.',
      details: errorMessage,
      response: { body: { items: { item: [] } } } // Return empty structure for graceful handling
    }), {
      status: 200, // Return 200 to prevent client-side errors
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
