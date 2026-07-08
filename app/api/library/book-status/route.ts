import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');
    const libCodesStr = searchParams.get('libCodes');

    const API_KEY = process.env.DATA4LIBRARY_API_KEY;
    if (!API_KEY) {
        return NextResponse.json({ error: 'DATA4LIBRARY_API_KEY is not configured' }, { status: 500 });
    }

    if (!isbn) {
        return NextResponse.json({ error: 'isbn parameter is required' }, { status: 400 });
    }

    if (!libCodesStr) {
        return NextResponse.json({ results: [] });
    }

    const libCodes = libCodesStr.split(',').map(code => code.trim()).filter(Boolean);

    try {
        const fetchPromises = libCodes.map(async (libCode) => {
            const apiUrl = `http://data4library.kr/api/bookExist?authKey=${API_KEY}&libCode=${libCode}&isbn13=${isbn}&format=json`;
            console.log(`Checking book status at library ${libCode} for ISBN ${isbn}: ${apiUrl}`);

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`Status check failed with status ${response.status}`);
                }
                const data = await response.json();
                const result = data.response?.result || {};
                
                return {
                    libCode,
                    hasBook: result.hasBook || 'N',
                    loanAvailable: result.loanAvailable || 'N'
                };
            } catch (err: any) {
                console.error(`Error checking library ${libCode}:`, err);
                return {
                    libCode,
                    hasBook: 'N',
                    loanAvailable: 'N',
                    error: err.message
                };
            }
        });

        const results = await Promise.all(fetchPromises);
        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('Error fetching book status:', error);
        return NextResponse.json({ error: '도서 소장 정보 조회 중 오류가 발생했습니다.', details: error.message }, { status: 500 });
    }
}
