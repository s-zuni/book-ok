const TTBKey = "ttbzxzx7290920001";

async function testAladin() {
    console.log("Starting Aladin API Debug...");

    const testCases = [
        { query: '그림책', categoryId: '4123' },
        { query: '초등저학년', categoryId: '1108' }
    ];

    for (const test of testCases) {
        const url = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${TTBKey}&Query=${encodeURIComponent(test.query)}&Output=js&Version=20131101&SearchTarget=Book&CategoryId=${test.categoryId}&MaxResults=5&Cover=Big`;

        console.log(`\nTesting Query: "${test.query}" (Cat: ${test.categoryId})`);

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.item && data.item.length > 0) {
                console.log(`SUCCESS: Found ${data.item.length} items. First: ${data.item[0].title}`);
            } else {
                console.log("FAILURE: No items found.");
                if (data.errorCode) {
                    console.log(`Error Code: ${data.errorCode}, Reason: ${data.errorMessage}`);
                } else {
                    console.log("Response Data:", JSON.stringify(data, null, 2));
                }
            }
        } catch (err) {
            console.error("Request Failed:", err.message);
        }
    }
}

testAladin();
