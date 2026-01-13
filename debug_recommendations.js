
const TTBKey = "ttbzxzx7290920001";
const categoryMap = {
    '영유아': '4123',
    '유아': '4123',
    '초등저학년': '1108',
    '초등고학년': '1108'
};

const queries = ['영유아', '유아', '초등저학년', '초등고학년'];

async function testAladin() {
    console.log("Starting Aladin API Debug...");

    for (const query of queries) {
        const categoryId = categoryMap[query];
        const url = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${TTBKey}&Query=${encodeURIComponent(query)}&Output=js&Version=20131101&SearchTarget=Book&CategoryId=${categoryId}&MaxResults=5&Cover=Big`;

        console.log(`\nTesting Query: "${query}" (Cat: ${categoryId})`);

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.item && data.item.length > 0) {
                console.log(`SUCCESS: Found ${data.item.length} items.`);
                console.log(`First item: ${data.item[0].title}`);
            } else {
                console.log("FAILURE: No items found.");
                if (data.errorCode) {
                    console.log(`Error Code: ${data.errorCode}, Reason: ${data.errorMessage}`);
                }
            }
        } catch (err) {
            console.error("Request Failed:", err.message);
        }
    }
}

testAladin();
