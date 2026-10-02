import fs from 'fs';
import path from 'path';

// 1. Load YES24_API_KEY from .env.local safely
function getApiKey() {
  if (process.env.YES24_API_KEY) return process.env.YES24_API_KEY;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/YES24_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match) return match[1].trim();
    }
  } catch (e) {
    console.error('Failed to read .env.local:', e.message);
  }
  return null;
}

const rawKey = getApiKey();
// YES24 API는 'yk_' 접두사가 필요 (앱 코드의 getYes24ApiKey와 동일 규칙)
const apiKey = rawKey && !rawKey.startsWith('yk_') ? `yk_${rawKey}` : rawKey;
if (!apiKey) {
  console.error('❌ Error: YES24_API_KEY not found in environment or .env.local');
  process.exit(1);
}

const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
console.log(`🔐 Found YES24_API_KEY: ${maskedKey}`);

const BASE_URL = 'https://apis.yes24.com/v1';

async function testEndpoint(name, url) {
  console.log(`\n-----------------------------------------`);
  console.log(`🧪 Testing [${name}]`);
  console.log(`📍 URL: ${url}`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    console.log(`📡 Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log(`✨ Success: ${data.success}, Message: "${data.message}", ErrorCode: ${data.errorCode}`);

    if (data.success && data.data) {
      if (data.data.items && data.data.items.length > 0) {
        console.log(`📚 Returned items count: ${data.data.items.length}`);
        const sample = data.data.items[0];
        console.log(`   - Sample Item ID: ${sample.itemId}`);
        console.log(`   - Title: ${sample.title}`);
        console.log(`   - Author: ${sample.author}`);
        console.log(`   - Publisher: ${sample.publisher}`);
        console.log(`   - Cover: ${sample.cover}`);
        console.log(`   - Has SideCover: ${Boolean(sample.sideCover)}`);
        console.log(`   - Has BackCover: ${Boolean(sample.backCover)}`);
        console.log(`   - Has TableOfContents: ${Boolean(sample.contentDetail?.tableOfContents)}`);
        console.log(`   - Has BookIntroduction: ${Boolean(sample.contentDetail?.bookIntroduction)}`);
        if (sample.contentDetail?.tableOfContents) {
          const tocPreview = sample.contentDetail.tableOfContents.slice(0, 100).replace(/\n/g, ' ');
          console.log(`   - TOC Preview: "${tocPreview}..."`);
        }
      } else if (data.data.data && Array.isArray(data.data.data)) {
        console.log(`📁 Returned categories count: ${data.data.data.length}`);
        console.log(`   - Sample Category:`, data.data.data[0]);
      }
    } else {
      console.warn(`⚠️ API returned non-success data:`, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(`❌ Request failed:`, err.message);
  }
}

async function runAll() {
  // Test 1: Item Detail (using a well-known children's book: 백희나 '알사탕' 9791197473531 or Clean Code)
  await testEndpoint(
    'Goods Item Detail (ISBN13)',
    `${BASE_URL}/goods/itemDetail?searchType=ISBN13&query=9791197473531&detail=Y`
  );

  // Test 2: Goods Search ('구름빵')
  await testEndpoint(
    'Goods Item Search (Keyword: 구름빵)',
    `${BASE_URL}/goods/itemList?query=${encodeURIComponent('구름빵')}&page=1&pageSize=2&detail=Y`
  );

  // Test 3: Category Bestseller ('001' 국내도서)
  await testEndpoint(
    'Category Bestseller (001)',
    `${BASE_URL}/category/bestseller?categoryId=001&page=1&pageSize=2&detail=Y`
  );

  // Test 4: Category List
  await testEndpoint(
    'Category List',
    `${BASE_URL}/category/list`
  );

  console.log(`\n-----------------------------------------`);
  console.log(`🎉 YES24 API verification complete.`);
}

runAll();
