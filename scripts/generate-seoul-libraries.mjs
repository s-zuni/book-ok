import fs from 'fs';

const key = '7a436b7561646c743634716d754678';

async function generateSeoulLibraryMap() {
  const url = `http://openapi.seoul.go.kr:8088/${key}/json/SeoulPublicLibraryInfo/1/300/`;
  const res = await fetch(url);
  const data = await res.json();
  const list = data.SeoulPublicLibraryInfo.row;

  const libraryMap = {};
  
  for (const item of list) {
    const rawName = item.LBRRY_NAME.trim();
    let homepage = (item.HMPG_URL || '').trim();
    
    // HTTP -> HTTPS 프로토콜 보정 (브라우저 Mixed Content 차단 방지)
    if (homepage.startsWith('http://')) {
      homepage = homepage.replace('http://', 'https://');
    }
    
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

