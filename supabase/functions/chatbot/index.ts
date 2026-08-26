// 연화재실 GPT 챗봇 Edge Function
// OpenAI API 키는 서버(Edge Function) 환경에만 존재하며 브라우저로는 절대 노출되지 않습니다.
// 배포: supabase functions deploy chatbot
// 시크릿 설정(1회): supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message가 필요합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 상품 재고/가격 질문에 정확히 답하기 위해 publishable key로 DB를 조회해 실제 데이터를 프롬프트에 포함합니다.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: products } = await supabase
      .from("products")
      .select("name, sale_price, product_type, gender, product_variants ( size, stock_quantity )")
      .eq("status", "public")
      .limit(60);

    const { data: keywords } = await supabase
      .from("chatbot_keywords")
      .select("keyword, answer")
      .eq("active", true)
      .order("sort_order");

    const catalog = (products || [])
      .map((p) => {
        const stock = (p.product_variants || [])
          .map((v) => `${v.size}:${v.stock_quantity}개`)
          .join(", ");
        return `- ${p.name} (${p.product_type}) ${p.sale_price.toLocaleString("ko-KR")}원 [재고 ${stock}]`;
      })
      .join("\n");

    const faq = (keywords || []).map((k) => `Q. ${k.keyword} → ${k.answer}`).join("\n");

    const systemPrompt = `당신은 한복/악세사리/굿즈 쇼핑몰 "연화재실"의 친절한 상담 챗봇입니다.
아래 실제 상품/재고 데이터와 FAQ만 근거로 답변하세요. 목록에 없는 상품이나 재고를 추측하거나 지어내지 마세요.
답변은 한국어 존댓말로, 2~4문장 이내로 간결하게 작성하세요.

[상품/재고 목록]
${catalog || "(등록된 상품 없음)"}

[자주 묻는 질문]
${faq || "(등록된 FAQ 없음)"}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: `OpenAI 호출 실패: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const reply = json.choices?.[0]?.message?.content?.trim() || "죄송해요, 답변을 생성하지 못했어요.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
