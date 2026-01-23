import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const drCode = searchParams.get('drCode') || '11'; // Default: Literature (11)
    const page = searchParams.get('page') || '1';

    // Default to strict search for 2025? Or just latest? 
    // The API seems to just return latest recommendations.

    const API_KEY = process.env.NATIONAL_LIBRARY_API_KEY;
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

        // Simple XML parsing (since we might not have a parser installed yet)
        // Ideally we should use fast-xml-parser, but for now let's try to extract basic info with Regex 
        // or check if we can interpret it. 
        // Actually, let's just return the raw XML/Text for now so the frontend or a utility can parse it, 
        // OR better, let's do a basic parse here to return JSON.

        const items = [];
        const itemRegex = /<list>([\s\S]*?)<\/list>/g;
        let match;

        while ((match = itemRegex.exec(textData)) !== null) {
            const itemContent = match[1];

            const extract = (tag: string) => {
                const regex = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, 's');
                const m = itemContent.match(regex);
                return m ? m[1] : '';
            };

            // Sometimes CDATA is not used for simple fields
            const extractSimple = (tag: string) => {
                const regex = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 's');
                const m = itemContent.match(regex);
                return m ? m[1] : '';
            };

            const title = extract('title_info') || extractSimple('title_info');
            const author = extract('author_info') || extractSimple('author_info');
            const publisher = extract('pub_info') || extractSimple('pub_info');
            const pubYear = extract('pub_year_info') || extractSimple('pub_year_info');
            const imageUrl = extract('file_url') || extractSimple('file_url') || `https://image.aladin.co.kr/product/placeholder.jpg`; // Fallback
            const link = extract('link_url') || extractSimple('link_url');

            // Clean up title (sometimes includes volume info)
            const cleanTitle = title.replace(/\s*\(.*?\)\s*$/, '');

            if (title) {
                items.push({
                    id: link || Math.random().toString(36).substr(2, 9),
                    title: cleanTitle,
                    author: author,
                    cover: imageUrl.startsWith('http') ? imageUrl : `https://www.nl.go.kr${imageUrl}`,
                    description: `${publisher} | ${pubYear}`, // Using description field for pub info
                    publisher: publisher,
                    pubDate: pubYear,
                    link: link,
                    category: { id: '0', name: '사서추천' }
                });
            }
        }

        return NextResponse.json({
            items,
            totalResult: items.length // API doesn't seem to give total quickly in this view 
        });

    } catch (error) {
        console.error('NLK API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
