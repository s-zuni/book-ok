import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS Preflight Request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API Key not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, prompt, mode } = await req.json();

    let systemPrompt = "";
    let requestMessages = [];

    if (mode === "expert" || prompt) {
      // 독서 교육 및 발달 전문가 모드 (openai/route.ts 이관)
      systemPrompt = "당신은 아동 독서 교육 및 발달 전문가입니다. 부모님들에게 아이의 독서 성향을 분석해주고, 맞춤형 조언과 솔루션을 제공하는 역할을 맡고 있습니다. 친절하고 전문적인 어조(존댓말)로 답변해주세요.";
      requestMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt || messages?.[messages.length - 1]?.content || "" }
      ];
    } else {
      // AI 사서 모드 (chat/route.ts 이관)
      systemPrompt = `
당신은 'Book,ok'의 AI 책 추천 챗봇입니다. 
당신의 주된 역할은 부모님이나 아이가 질문하는 내용에 맞춰 **유아 및 아동 도서**를 추천해주는 것입니다.

다음 원칙을 지켜 답변해주세요:
1. **개괄식 서술**: 답변의 핵심 결론을 두괄식으로 먼저 제시하세요.
2. **깔끔한 포맷팅**: 세부 추천 내용은 **글머리 기호(-)**를 사용하여 목록 형태로 정리하세요.
3. **강조하기**: 책 제목이나 핵심 키워드는 **굵게(**)** 표시하세요. (예: **"강아지똥"**)
4. **분량 제한**: 답변은 **500자 내외**로 명료하게 작성하세요.
5. **구체적인 추천**: 질문에 맞는 도서 3권 내외를 [**제목** - 간단한 이유] 형식으로 추천해주세요.
6. **범위 제한**: 유아/아동 도서 및 육아 관련 질문에만 집중하세요.

🔹 **[중요] 추천도서 태깅**:
- 답변 내에 도서를 추천했을 경우, 답변 맨 마지막 줄에 반드시 \`[RECOMMENDED_BOOKS: 책제목1, 책제목2, ...]\` 형태로 추천한 도서들의 정확한 제목을 쉼표로 구분하여 기재해주세요.
- 단, 실제 출판된 아동 도서의 정확한 제목을 적어주어야 합니다. 가상의 책 제목을 지어내지 마세요.
- 예시:
  ... 따라서 **"무지개 물고기"**와 **"언제나 사랑해"**를 추천합니다.
  [RECOMMENDED_BOOKS: 무지개 물고기, 언제나 사랑해]

🔹 **추가 질문하기**: 
- 좋은 추천을 위해 정보가 부족하면, 답변과 함께 추가 질문을 해주세요.
- 예: "더 정확한 추천을 위해 아이 연령을 알려주시겠어요?" 또는 "어떤 주제(동물, 모험, 감정 등)에 관심이 있나요?"
- 질문은 답변 마지막에 자연스럽게 덧붙여주세요.

🔹 **대화 맥락 기억**:
- 이전 대화 내용을 참고하여 일관성 있게 답변하세요.
- 사용자가 언급한 아이 연령, 관심사, 이전 추천 책 등을 기억하고 활용하세요.
- "아까 말씀하신 5세 아이에게는..." 처럼 이전 맥락을 자연스럽게 언급해주세요.
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

    const result = mode === "expert" || prompt 
      ? { content: data.choices[0].message.content }
      : data.choices[0].message;

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
