
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query');
    const categoryId = searchParams.get('categoryId');
    const sort = searchParams.get('sort') || 'Accuracy'; // Default to Accuracy
    const requestType = searchParams.get('type') || 'Search'; // 'Search' or 'List'

    // Use the specific TTBKey
    const TTBKey = "ttbzxzx7290920001";

    // Default to Children (1108) if not specified
    const targetCategory = categoryId || '1108';

    let url = '';

    // If query is explicitly valid for search, OR type is Search
    if (requestType === 'Search' && query && query !== 'ItemList') {
        // Sort options for ItemSearch: Accuracy, PublishTime, SalesPoint, CustomerRating
        url = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${TTBKey}&Query=${encodeURIComponent(query)}&Output=js&Version=20131101&SearchTarget=Book&CategoryId=${targetCategory}&MaxResults=50&Cover=Big&Sort=${sort}`;
        console.log(`Fetching Search from Aladin: Query="${query}", CategoryId=${targetCategory}`);
    } else {
        // Use ItemList for category-based recommendations (Bestseller/New)
        // QueryType: Bestseller, ItemNewAll, ItemNewSpecial, ItemEditorChoice
        // When using ItemList, 'Sort' param is not used in the same way, usually determined by QueryType.
        const queryType = 'Bestseller';
        url = `https://www.aladin.co.kr/ttb/api/ItemList.aspx?ttbkey=${TTBKey}&QueryType=${queryType}&MaxResults=50&start=1&SearchTarget=Book&Output=js&Version=20131101&Cover=Big&CategoryId=${targetCategory}`;
        console.log(`Fetching List from Aladin: QueryType="${queryType}", CategoryId=${targetCategory}`);
    }

    try {
        const res = await fetch(url, {
            method: 'GET',
        });

        if (!res.ok) {
            throw new Error(`Aladin API call failed with status: ${res.status}`);
        }

        const data = await res.json();

        // Check for Aladin Error Code in JSON body
        if (data.errorCode) {
            throw new Error(`Aladin API Error: ${data.errorMessage}`);
        }

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
