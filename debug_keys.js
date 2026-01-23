const fs = require('fs');
const https = require('https');

function getEnvValue(key) {
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        if (!match) return null;
        let val = match[1].trim();
        // Strip quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        return val;
    } catch (e) {
        return null;
    }
}

function log(msg) {
    console.log(msg);
    fs.appendFileSync('key_debug_log.txt', msg + '\n');
}

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', (err) => reject(err));
    });
}

async function testKeys() {
    fs.writeFileSync('key_debug_log.txt', 'Starting Key Debug...\n');
    const nlcfKey = getEnvValue('NLCF_API_KEY');
    log(`Testing NLCF_API_KEY: ${nlcfKey ? 'Found' : 'Not Found'} (${nlcfKey})`);

    if (nlcfKey) {
        // Test NLK
        const url = `https://www.nl.go.kr/NL/search/openApi/saseoApi.do?key=${nlcfKey}&startRowNumApi=1&endRowNumApi=5&drCode=11`;
        log(`NLK URL: ${url}`);
        try {
            const res = await fetchUrl(url);
            log(`NLK Status: ${res.status}`);
            log(`NLK Body: ${res.body.substring(0, 1000)}`);
        } catch (e) {
            log(`NLK Error: ${e.message}`);
        }
    }

    log('\nTesting Aladin ItemList...');
    const TTBKey = "ttbzxzx7290920001";
    // CategoryId 13789 (Infant)
    const aladinUrl = `https://www.aladin.co.kr/ttb/api/ItemList.aspx?ttbkey=${TTBKey}&QueryType=Bestseller&MaxResults=5&start=1&SearchTarget=Book&Output=js&Version=20131101&Cover=Big&CategoryId=13789`;
    log(`Aladin URL: ${aladinUrl}`);
    try {
        const res = await fetchUrl(aladinUrl);
        log(`Aladin Status: ${res.status}`);
        log(`Aladin Body: ${res.body.substring(0, 1000)}`);
    } catch (e) {
        log(`Aladin Error: ${e.message}`);
    }
}

testKeys();
