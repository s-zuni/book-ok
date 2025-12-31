
import { type NextRequest } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function GET(request: NextRequest) {
  const API_KEY = process.env.NLCF_API_KEY;
  const url = `https://api.kcisa.kr/openapi/service/rest/meta2/NLCFsase?serviceKey=${API_KEY}&numOfRows=20`;

  console.log('Fetching Librarian Books from:', url.replace(API_KEY || '', '***'));

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`NLCF API failed: ${res.status} ${res.statusText}`);
      throw new Error(`NLCF API call failed with status: ${res.status}`);
    }

    const xmlData = await res.text();
    // console.log('Raw XML (partial):', xmlData.substring(0, 200));

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => name === 'item', // Force 'item' to always be an array
    });
    const jsonData = parser.parse(xmlData);

    // console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2).substring(0, 500));

    // Check if we have a valid response structure
    if (!jsonData.response?.body?.items?.item) {
      console.warn('Unexpected API response structure:', JSON.stringify(jsonData, null, 2));
    }

    return new Response(JSON.stringify(jsonData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('NLCF API request error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: 'Failed to fetch data from NLCF API.', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
