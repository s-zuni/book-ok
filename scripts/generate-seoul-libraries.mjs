import fs from 'fs';

// API 키는 소스에 하드코딩하지 않고 환경변수(.env.local의 SEOUL_OPEN_DATA)에서 읽는다.
try { process.loadEnvFile('.env.local'); } catch { /* 환경변수가 이미 주입된 경우 */ }
const key = process.env.SEOUL_OPEN_DATA;
if (!key) {
  console.error('SEOUL_OPEN_DATA 환경변수가 필요합니다.');
  process.exit(1);
}

// 홈페이지 URL을 https 절대 URL로 정규화. 유효하지 않으면 빈 문자열.
function normalizeHomepage(raw) {
  let url = (raw || '').trim();
  if (!url) return '';
  if (/^http:\/\//i.test(url)) url = url.replace(/^http:\/\//i, 'https://');
  else if (!/^https:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
  try {
    const u = new URL(url);
    return u.hostname.includes('.') ? url : '';
  } catch {
    return '';
  }
}

async function generateSeoulLibraryMap() {
  const url = `http://openapi.seoul.go.kr:8088/${key}/json/SeoulPublicLibraryInfo/1/300/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Seoul OpenAPI 요청 실패: ${res.status}`);
  const data = await res.json();
  const list = data.SeoulPublicLibraryInfo.row;

  const libraryMap = {};
  
  for (const item of list) {
    const rawName = item.LBRRY_NAME.trim();
    // 스킴 누락/HTTP 보정 (Mixed Content 및 상대경로 해석 방지)
    const homepage = normalizeHomepage(item.HMPG_URL);
    if (!homepage) console.warn(`[경고] 홈페이지 URL 없음/무효: ${rawName}`);
    
    libraryMap[rawName] = {
      name: rawName,
      gu: item.CODE_VALUE,
      address: item.ADRES,
      tel: item.TEL_NO,
      homepage: homepage,
      opTime: item.OP_TIME,
      closeDate: item.FDRM_CLOSE_DATE
    };
  }

  console.log(`Generated map for ${Object.keys(libraryMap).length} libraries.`);
  
  // Test matches for common libraries
  const testNames = [
    '휘경행복도서관',
    '동대문구답십리도서관',
    '이문어린이도서관',
    '강남구립못골도서관',
    '역삼푸른솔도서관',
    '송파글마루도서관',
    '마포중앙도서관',
    '은평구립도서관',
    '정독도서관',
    '남산도서관'
  ];

  console.log('\n--- Test matching ---');
  for (const t of testNames) {
    const direct = libraryMap[t];
    if (direct) {
      console.log(`[Direct Match] ${t} -> ${direct.homepage} (${direct.gu})`);
    } else {
      // Fuzzy match test
      const cleanedT = t.replace(/\s+/g, '').replace('구립', '');
      const found = Object.keys(libraryMap).find(k => {
        const cleanedK = k.replace(/\s+/g, '').replace('구립', '').replace('서울특별시교육청', '');
        return cleanedK.includes(cleanedT) || cleanedT.includes(cleanedK);
      });
      if (found) {
        console.log(`[Fuzzy Match] ${t} ~> ${found} -> ${libraryMap[found].homepage} (${libraryMap[found].gu})`);
      } else {
        console.log(`[Not Found] ${t}`);
      }
    }
  }

  // Save to src/shared/lib/seoulLibraryData.json
  fs.writeFileSync('src/shared/lib/seoulLibraryData.json', JSON.stringify(libraryMap, null, 2), 'utf8');
  console.log('\nSaved to src/shared/lib/seoulLibraryData.json');
}

generateSeoulLibraryMap();

