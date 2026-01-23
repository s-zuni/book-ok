import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const drCode = searchParams.get('drCode') || '11'; // Default: Literature (11)
    const page = searchParams.get('page') || '1';

    const API_KEY = process.env.NLCF_API_KEY;
    const ENDPOINT = 'https://www.nl.go.kr/NL/search/openApi/saseoApi.do';

    if (!API_KEY) {
        return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    try {
        const startRow = (parseInt(page) - 1) * 10 + 1;
        const endRow = startRow + 9;

        const apiUrl = `${ENDPOINT}?key=${API_KEY}&startRowNumApi=${startRow}&endRowNumApi=${endRow}&drCode=${drCode}`;

        console.log(`Fetching from NLK API: ${apiUrl}`);

        const response = await fetch(apiUrl);
        const textData = await response.text();

        const parser = new XMLParser();
        const parsed = parser.parse(textData);

        // Check for error response
        // Expected format on error: <error><msg>...</msg><error_code>...</error_code></error>
        if (parsed.error) {
            console.error('NLK API returned error:', parsed.error);
            return NextResponse.json({
                error: parsed.error.msg || 'National Library API Error',
                code: parsed.error.error_code
            }, { status: 400 });
        }

        // Expected format on success: <channel><list>...</list><totalCount>...</totalCount></channel> 
        // OR directly <list>... if root is different. Based on debug log, it seems OK.
        // Let's inspect the structure. The debug output showed <error> at root.
        // Likely <channel> or <root> is the success root. 
        // The regex code was looking for <list>.

        let lists = parsed.channel?.list || parsed.list || [];
        if (!Array.isArray(lists)) {
            lists = [lists]; // Handle single item case
        }

        const items = lists.map((item: any) => {
            const getField = (field: any) => (typeof field === 'string' ? field : field?.['#text'] || '');

            const title = getField(item.title_info);
            const author = getField(item.author_info);
            const publisher = getField(item.pub_info);
            const pubYear = getField(item.pub_year_info);
            const imageUrl = getField(item.file_url) || `https://image.aladin.co.kr/product/placeholder.jpg`;
            const link = getField(item.link_url);

            const cleanTitle = title.replace(/\s*\(.*?\)\s*$/, '');

            return {
                id: link || Math.random().toString(36).substr(2, 9),
                title: cleanTitle,
                author: author,
                cover: imageUrl.startsWith('http') ? imageUrl : `https://www.nl.go.kr${imageUrl}`,
                description: `${publisher} | ${pubYear}`,
                publisher: publisher,
                pubDate: pubYear,
                link: link,
                category: { id: '0', name: '사서추천' }
            };
        }).filter((item: any) => item.title);

        return NextResponse.json({
            items,
            totalResult: items.length
        });

    } catch (error) {
        console.error('NLK API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
