
import { type NextRequest } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function GET(request: NextRequest) {
  const API_KEY = process.env.NLCF_API_KEY;
  const url = `https://api.kcisa.kr/openapi/service/rest/meta2/NLCFsase?serviceKey=${API_KEY}&numOfRows=20`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`NLCF API call failed with status: ${res.status}`);
    }
    
    const xmlData = await res.text();
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const jsonData = parser.parse(xmlData);

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
