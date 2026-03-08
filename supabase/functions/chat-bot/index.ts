import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, user_id } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch context data for the bot
    const [productsRes, accountsRes, categoriesRes, siteSettingsRes] = await Promise.all([
      supabase.from("products").select("id, title, price, category, description, is_active, is_free, original_price, badge, sales").eq("is_active", true).limit(50),
      supabase.from("accounts").select("id, title, platform, price, category, description, is_sold, is_free, features").eq("is_active", true).eq("is_sold", false).limit(50),
      supabase.from("categories").select("name, slug, description").eq("is_active", true),
      supabase.from("site_settings").select("key, value"),
    ]);

    const products = productsRes.data || [];
    const accounts = accountsRes.data || [];
    const categories = categoriesRes.data || [];
    const siteSettings = siteSettingsRes.data || [];

    const settingsMap: Record<string, string> = {};
    siteSettings.forEach((s: any) => { if (s.value) settingsMap[s.key] = s.value; });

    const systemPrompt = `Bạn là BonzBot - trợ lý AI của Bonz Shop, một nền tảng mua bán tài khoản và sản phẩm số hàng đầu Việt Nam.

THÔNG TIN WEBSITE:
- Tên: Bonz Shop  
- Chức năng: Mua bán tài khoản game, mạng xã hội, phần mềm, key bản quyền
- Thanh toán: Bằng Bonz Coin (nạp coin qua chuyển khoản ngân hàng)
- Hỗ trợ: Chat cộng đồng, liên hệ admin

DANH MỤC SẢN PHẨM:
${categories.map(c => `- ${c.name}: ${c.description || ''}`).join('\n')}

SẢN PHẨM HIỆN CÓ (${products.length} sản phẩm):
${products.map(p => `- [${p.id}] ${p.title} | Giá: ${p.is_free ? 'MIỄN PHÍ' : p.price + ' coin'} | Danh mục: ${p.category}${p.badge ? ' | ' + p.badge : ''}${p.sales ? ' | Đã bán: ' + p.sales : ''}`).join('\n')}

TÀI KHOẢN ĐANG BÁN (${accounts.length} tài khoản):
${accounts.map(a => `- [${a.id}] ${a.title} | Nền tảng: ${a.platform} | Giá: ${a.is_free ? 'MIỄN PHÍ' : a.price + ' coin'} | Danh mục: ${a.category || 'Chung'}${a.features?.length ? ' | Tính năng: ' + a.features.join(', ') : ''}`).join('\n')}

QUY TẮC TRẢ LỜI:
1. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn
2. Khi người dùng hỏi tìm sản phẩm → gợi ý sản phẩm phù hợp kèm giá
3. Khi người dùng muốn mua → hướng dẫn: vào trang "Sản phẩm" hoặc "Tài khoản", chọn sản phẩm, nhấn "Mua ngay". Cần nạp đủ coin trước.
4. Khi hỏi về web → giới thiệu ngắn gọn về Bonz Shop
5. Dùng emoji phù hợp để tin nhắn sinh động
6. Nếu sản phẩm không tìm thấy → đề xuất liên hệ admin
7. Format giá: X coin (VD: 50 coin)
8. Khi gợi ý sản phẩm, hiển thị dạng danh sách rõ ràng`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Bot đang bận, vui lòng thử lại sau!" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hệ thống AI tạm ngưng, vui lòng thử lại sau." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const botReply = data.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";

    return new Response(JSON.stringify({ reply: botReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
