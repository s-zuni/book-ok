
const TTBKey = "ttbzxzx7290920001";
const categoryMap = {
    '영유아': '4123',
    '유아': '4123',
    '초등저학년': '1108',
    '초등고학년': '1108'
};


const queries = ['사서추천', '국립중앙도서관', '문학상', '칼데콧상', '영유아', '초등저학년'];

async function testAladin() {
    console.log("Starting Aladin API Debug...");

    for (const query of queries) {
        // Use default category 1108 (Children) for most
        const categoryId = '1108';
        const url = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${TTBKey}&Query=${encodeURIComponent(query)}&Output=js&Version=20131101&SearchTarget=Book&CategoryId=${categoryId}&MaxResults=5&Cover=Big`;


        console.log(`\nTesting Query: "${query}" (Cat: ${categoryId})`);

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.item && data.item.length > 0) {
                console.log(`SUCCESS: Found ${data.item.length} items. First ID: ${data.item[0].isbn13}`);
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
