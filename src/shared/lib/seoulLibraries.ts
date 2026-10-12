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

// 서울이 아닌 지역명이 포함된 도서관은 구 포털 폴백 대상에서 제외
const NON_SEOUL_REGEX = /부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|수원|성남|고양|용인|부천|안양|안산|화성|평택|시흥|파주|김포|의정부|남양주|창원|청주|천안|전주|포항/;

/**
 * 외부에서 받은 URL을 안전한 https/http 절대 URL로 정규화. 유효하지 않으면 null.
 * (스킴 누락 시 https 보정, javascript: 등 비-http(s) 스킴 차단)
 */
export function toSafeHttpUrl(raw?: string | null): string | null {
    const input = (raw || '').trim();
    if (!input) return null;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input.replace(/^\/+/, '')}`;
    try {
        const u = new URL(candidate);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
        return u.hostname.includes('.') ? u.toString() : null;
    } catch {
        return null;
    }
}

function normalize(str: string): string {
    // 교육청 도서관은 구립 도서관과 별개 기관이므로 '교육청' 표식을 남겨 구분한다
    return str
        .replace(/\s+/g, '')
        .replace(/서울특별시교육청|서울시교육청/g, '교육청')
        .replace(/구립|시립|서울특별시|서울시/g, '');
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

    // 타 지역 도서관은 부분 일치/구 포털 폴백 대상에서 제외 (정확 일치까지만 허용)
    if (NON_SEOUL_REGEX.test(trimmed)) return null;

    // 3. 부분 일치 (Fuzzy match - 3글자 이상)
    //    같은 종류(교육청 여부)끼리만 비교하고, 이름 길이 차이가 가장 작은 후보를 선택한다
    const qIsEdu = qClean.includes('교육청');
    let best: SeoulLibraryInfo | null = null;
    let bestDiff = Infinity;
    for (const [name, info] of Object.entries(seoulLibraryData)) {
        const nClean = normalize(name);
        if (nClean.includes('교육청') !== qIsEdu) continue;
        if (nClean.length < 3 || qClean.length < 3) continue;
        if (qClean.includes(nClean) || nClean.includes(qClean)) {
            const diff = Math.abs(nClean.length - qClean.length);
            if (diff < bestDiff) {
                best = info;
                bestDiff = diff;
            }
        }
    }
    if (best) return { ...best, matchType: 'fuzzy' };

    // 4. 서울시 자치구 구립도서관 통합 포털 매칭 Fallback
    //    - 타 지역 도서관(부산 강서, 수원 중앙 등)이 오매칭되지 않도록 제외
    //    - 약칭이 2글자 미만(예: '중구' -> '중')이면 풀네임만 허용
    for (const [gu, portalUrl] of Object.entries(GU_PORTAL_MAP)) {
        const guShort = gu.slice(0, -1);
        const matched = trimmed.includes(gu) || (guShort.length >= 2 && trimmed.includes(guShort));
        if (matched) {
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

