const https = require('https');
const fs = require('fs');

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', (err) => reject(err));
    });
}

function log(message) {
    console.log(message);
    try {
        fs.appendFileSync('api_debug_log.txt', message + '\n');
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
}

async function testAladin() {
    const TTBKey = "ttbzxzx7290920001";
    // Try a simple English query first to rule out encoding issues
    const query = "Harry Potter";
    // const query = "그림책"; 
    const categoryId = "4123";
    // Removed CategoryId from this test to isolate the issue
    const url = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${TTBKey}&Query=${encodeURIComponent(query)}&Output=js&Version=20131101&SearchTarget=Book&MaxResults=5&Cover=Big&Sort=SalesPoint`;

    log("\n--- Testing Aladin API ---");
    log("URL: " + url);
    try {
        const res = await fetchUrl(url);
        log("Status: " + res.status);
        log("Body: " + res.body.substring(0, 500));
    } catch (e) {
        log("Aladin Failed: " + e.message);
    }
}

async function testNLK() {
    const API_KEY = "2ec70c6f-f0ab-4518-923c-251a43070da0";
    const url = `https://www.nl.go.kr/NL/search/openApi/saseoApi.do?key=${API_KEY}&startRowNumApi=1&endRowNumApi=5&drCode=11`;

    log("\n--- Testing NLK API ---");
    log("URL: " + url);
    try {
        const res = await fetchUrl(url);
        log("Status: " + res.status);
        log("Body: " + res.body.substring(0, 1000));
    } catch (e) {
        log("NLK Failed: " + e.message);
    }
}

(async () => {
    fs.writeFileSync('api_debug_log.txt', 'Starting Debug...\n');
    await testAladin();
    await testNLK();
})();
