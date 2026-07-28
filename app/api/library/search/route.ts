import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const dtl_region = searchParams.get('dtl_region');

    const API_KEY = process.env.DATA4LIBRARY_API_KEY;
    if (!API_KEY) {
        return NextResponse.json({ error: 'DATA4LIBRARY_API_KEY is not configured' }, { status: 500 });
    }

    try {
        let apiUrl = `http://data4library.kr/api/libSrch?authKey=${API_KEY}&format=json&pageSize=150`;
        if (region) {
            apiUrl += `&region=${region}`;
        }
        if (dtl_region) {
            apiUrl += `&dtl_region=${dtl_region}`;
        }

        console.log(`Fetching libraries from Data4Library: ${apiUrl}`);

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Data4Library API failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Extract libraries
        const libsData = (data.response?.libs || []) as Record<string, unknown>[];
        const libraries = libsData.map((item) => {
            const lib = (item.doc || item.lib || {}) as Record<string, unknown>;
            return {
                libCode: String(lib.libCode || ''),
                libName: String(lib.libName || ''),
                address: String(lib.address || '')
            };
        }).filter((lib) => lib.libCode && lib.libName);

        return NextResponse.json({ libraries });
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Error fetching libraries:', error);
        return NextResponse.json({ error: '도서관 목록을 불러오는 중 오류가 발생했습니다.', details: errMsg }, { status: 500 });
    }
}
