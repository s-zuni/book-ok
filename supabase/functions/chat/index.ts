import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// "흔한남매 원저/백난도 글/..." , "루리 글,그림", "백희나 저" → 대표 저자명만 추출
function cleanYes24Author(author: string | undefined): string {
  if (!author) return "저자 미상";
  let first = author.split("/")[0].split(",")[0].replace(/\(.*?\)/g, "").trim();
  let prev = "";
  while (prev !== first) {
    prev = first;
    first = first.replace(/\s+(원저|글그림|글|그림|저|지음|지은이|옮김|역)$/, "").trim();
  }
  return first || author;
}

serve(async (req) => {
  // CORS Preflight Request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("openai_api_key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API Key not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, prompt, mode } = await req.json();

    let systemPrompt = "";
    let requestMessages = [];
    let candidateBooks: any[] = [];

    if (mode === "expert" || prompt) {
      // 독서 교육 및 발달 전문가 모드
      systemPrompt = "당신은 아동 독서 교육 및 발달 전문가입니다. 부모님들에게 아이의 독서 성향을 분석해주고, 맞춤형 조언과 솔루션을 제공하는 역할을 맡고 있습니다. 친절하고 전문적인 어조(존댓말)로 답변해주세요.";
      requestMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt || messages?.[messages.length - 1]?.content || "" }
      ];
    } else {
      // AI 사서 모드 - YES24 실시간 도서 검색 Grounding 수행
      const lastUserMessage = messages?.[messages.length - 1]?.content || "";
      
      // 검색 키워드 정제
      let searchKeyword = lastUserMessage
        .replace(/[?.,!~]/g, " ")
        .replace(/추천해줘|추천해주세요|추천|알려줘|알려주세요|알고싶어|있을까|도서|책|아이|어린이|유아/g, " ")
        .trim();
      
      if (!searchKeyword || searchKeyword.length < 2) {
        searchKeyword = lastUserMessage.slice(0, 30).trim() || "베스트셀러";
      }

      const rawYes24Key = Deno.env.get("YES24_API_KEY") || Deno.env.get("yes24_api_key");

      try {
        if (rawYes24Key) {
          const yes24Key = rawYes24Key.startsWith("yk_") ? rawYes24Key : `yk_${rawYes24Key}`;
          const yesUrl = `https://apis.yes24.com/v1/goods/itemList?query=${encodeURIComponent(searchKeyword)}&page=1&pageSize=10&category=BOOK&detail=Y`;
          const yesRes = await fetch(yesUrl, {
            headers: { "X-Api-Key": yes24Key, "Accept": "application/json" }
          });
          if (yesRes.ok) {
            const yesData = await yesRes.json();
            if (Array.isArray(yesData.data?.items)) {
              candidateBooks = yesData.data.items.map((item: any) => {
                const isbn = item.isbn13 || item.isbn10 || String(item.itemId);
                return {
                  id: isbn,
                  bookid: isbn,
                  title: item.title?.split(" - ")?.[0]?.trim() || item.title,
                  author: cleanYes24Author(item.author),
                  publisher: item.publisher || "",
                  coverUrl: item.cover || "",
                  imgsrc: item.cover || "",
                  description: item.contentDetail?.bookIntroduction || item.contentDetail?.bookSummary || "",
                  category: item.goodsSortNm || item.goodsType || "유아/아동",
                  // starScore 0 = 평점 없음 (YES24 0~10 척도 → 5점 만점)
                  rating: item.starScore > 0 ? Math.round(item.starScore * 5) / 10 : undefined,
                };
              });
            }
          } else {
            console.warn("YES24 pre-search failed:", yesRes.status);
          }
        }
      } catch (bookSearchErr) {
        console.warn("Book pre-search error:", bookSearchErr);
      }

      // 후보 도서 텍스트 생성
      let booksContext = "";
      if (candidateBooks.length > 0) {
        booksContext = `
🔹 [실제 출판된 아동 도서 DB 검색 결과]
${candidateBooks.map((b, i) => `${i + 1}. 제목: "${b.title}" / 저자: ${b.author} / 출판사: ${b.publisher} / ISBN: ${b.id} / 내용: ${b.description.slice(0, 100)}`).join("\n")}
`;
      }

      systemPrompt = `
당신은 'Book,ok'의 따뜻하고 지혜로운 AI 어린이 도서 전문 사서입니다.
당신의 주된 역할은 부모님이나 아이가 질문하는 내용에 맞춰 **유아 및 아동 도서 3권**을 추천해주는 것입니다.

다음 원칙을 지켜 답변해주세요:
1. **개괄식 서술**: 답변의 핵심 결론과 공감의 말을 두괄식으로 먼저 제시하세요.
2. **도서 추천 포맷팅**:
   ${booksContext ? '반드시 위 [실제 출판된 아동 도서 DB 검색 결과] 목록 중에서 가장 적합한 3권을 선택하여 추천하세요.' : '실제 출판된 아동 도서 3권을 추천하세요.'}
   - 각 도서는 **글머리 기호(-)**와 함께 **"책제목"** - 간단한 줄거리 및 이 책을 추천하는 이유 형태로 소개하세요.
   - 책 제목은 반드시 큰따옴표와 굵게 표시(**"제목"**)를 해주세요.
3. **가상의 책 금지**: 가상의 책 제목을 절대 지어내지 마세요.
4. **분량**: 답변은 400~600자 내외로 정갈하게 작성하세요.
5. **추천도서 태깅(필수)**:
   - 답변 맨 마지막 줄에 반드시 \`[RECOMMENDED_BOOKS: ISBN1, ISBN2, ISBN3]\` (또는 정확한 책제목) 형태로 3권의 정보를 기재해주세요.
   - 예시: [RECOMMENDED_BOOKS: 9788936434120, 9788954607346, 9788949112345]

${booksContext}
`;

      requestMessages = [
        { role: "system", content: systemPrompt },
        ...(messages || [])
      ];
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: requestMessages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI API Error");
    }

    const botMessage = mode === "expert" || prompt 
      ? { content: data.choices[0].message.content }
      : data.choices[0].message;

    // 추천 도서 객체 매칭
    let recommendedBooks: any[] = [];
    if (botMessage.content) {
      const match = botMessage.content.match(/\[RECOMMENDED_BOOKS:\s*(.*?)\]/);
      if (match) {
        const identifiers = match[1].split(',').map((t: string) => t.trim()).filter(Boolean);
        
        // 1. 후보 도서 목록에서 ISBN 또는 제목으로 매칭
        for (const id of identifiers) {
          const found = candidateBooks.find(b => 
            String(b.id) === id || 
            String(b.bookid) === id || 
            b.title.includes(id) || 
            id.includes(b.title)
          );
          if (found && !recommendedBooks.some(rb => rb.id === found.id)) {
            recommendedBooks.push(found);
          }
        }
      }

      // 후보 도서가 매칭되지 않았는데 후보 목록이 있다면 상위 3개 제공
      if (recommendedBooks.length === 0 && candidateBooks.length > 0) {
        recommendedBooks = candidateBooks.slice(0, 3);
      }
    }

    const result = {
      ...botMessage,
      books: recommendedBooks.length > 0 ? recommendedBooks : undefined
    };

    return new Response(
      JSON.stringify({ result, books: recommendedBooks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
