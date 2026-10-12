// 서울 열린데이터 광장 (Seoul Public Library Info) 기반 도서관 공식 정보 매퍼
import seoulLibraryDataRaw from "./seoulLibraryData.json";

export interface SeoulLibraryInfo {
    name: string;
    gu: string;
    address?: string;
    tel?: string;
    homepage: string;
    opTime?: string;
    closeDate?: string;
    matchType?: 'exact' | 'normalized_exact' | 'fuzzy' | 'gu_portal';
}

const seoulLibraryData: Record<string, SeoulLibraryInfo> = seoulLibraryDataRaw as unknown as Record<string, SeoulLibraryInfo>;

// 서울시 25개 구별 통합 도서관 포털
const GU_PORTAL_MAP: Record<string, string> = {
    '강남구': 'https://library.gangnam.go.kr',
    '강동구': 'https://www.gdlibrary.or.kr',
    '강북구': 'https://www.gangbuklib.seoul.kr',
    '강서구': 'https://lib.gangseo.seoul.kr',
    '관악구': 'https://www.gwanak.go.kr/site/library',
    '광진구': 'https://www.gwangjinlib.seoul.kr',
    '구로구': 'https://lib.guro.go.kr',
    '금천구': 'https://geumcheonlib.seoul.kr',
    '노원구': 'https://www.nowonlib.kr',
    '도봉구': 'https://www.unilib.dobong.kr',
    '동대문구': 'https://www.l4d.or.kr',
    '동작구': 'https://lib.dongjak.go.kr',
    '마포구': 'https://mplib.mapo.go.kr',
    '서대문구': 'https://lib.sdm.go.kr',
    '서초구': 'https://seocholib.or.kr',
    '성동구': 'https://www.sdlib.or.kr',
    '성북구': 'https://www.sblib.seoul.kr',
    '송파구': 'https://www.splib.or.kr',
    '양천구': 'https://yangcheonlib.korbis.kr',
    '영등포구': 'https://www.ydplib.or.kr',
    '용산구': 'https://yslibrary.or.kr',
    '은평구': 'https://www.eplib.or.kr',
    '종로구': 'https://lib.jongno.go.kr',
    '중구': 'https://www.e-junggu.or.kr',
    '중랑구': 'https://www.junglanglib.seoul.kr'
};

function normalize(str: string): string {
    return str.replace(/\s+/g, '').replace(/구립|시립|서울특별시교육청|서울특별시|서울시/g, '');
}

/**
 * 도서관 이름으로 서울 열린데이터 광장의 공식 도서관 정보 매칭
 */
export function findSeoulLibrary(queryName: string): SeoulLibraryInfo | null {
    if (!queryName) return null;
    const trimmed = queryName.trim();
    const qClean = normalize(trimmed);

    // 1. 정확 일치 (Exact match)
    if (seoulLibraryData[trimmed]) {
        return { ...seoulLibraryData[trimmed], matchType: 'exact' };
    }

    // 2. 정규화 일치 (Normalized match)
    for (const [name, info] of Object.entries(seoulLibraryData)) {
        if (normalize(name) === qClean) {
            return { ...info, matchType: 'normalized_exact' };
        }
    }

    // 3. 부분 일치 (Fuzzy match - 3글자 이상)
    for (const [name, info] of Object.entries(seoulLibraryData)) {
        const nClean = normalize(name);
        if (nClean.length >= 3 && (qClean.includes(nClean) || nClean.includes(qClean))) {
            return { ...info, matchType: 'fuzzy' };
        }
    }

    // 4. 서울시 자치구 구립도서관 통합 포털 매칭 Fallback
    for (const [gu, portalUrl] of Object.entries(GU_PORTAL_MAP)) {
        const guShort = gu.replace('구', '');
        if (trimmed.includes(gu) || trimmed.includes(guShort)) {
            return {
                name: trimmed,
                gu: gu,
                homepage: portalUrl,
                matchType: 'gu_portal'
            };
        }
    }

    return null;
}

