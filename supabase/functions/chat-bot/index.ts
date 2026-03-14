import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPAM_WINDOW_MS = 60_000;
const SPAM_MAX_MESSAGES = 10;

async function getNextApiKey(supabase: any): Promise<{ id: string; api_key: string; model: string; base_url: string; provider: string } | null> {
  const { data: keys } = await supabase
    .from("bot_api_keys")
    .select("id, api_key, model, base_url, provider")
    .eq("is_active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1);

  if (!keys || keys.length === 0) return null;

  const key = keys[0];
  const { data: current } = await supabase.from("bot_api_keys").select("usage_count").eq("id", key.id).single();
  if (current) {
    await supabase.from("bot_api_keys").update({ 
      usage_count: (current.usage_count || 0) + 1,
      last_used_at: new Date().toISOString()
    }).eq("id", key.id);
  }

  return key;
}

async function callAI(supabase: any, systemPrompt: string, chatMessages: any[], tools: any[]) {
  const customKey = await getNextApiKey(supabase);

  if (customKey) {
    console.log(`Using custom key: ${customKey.provider}/${customKey.model}`);
    
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let url = customKey.base_url;

    if (customKey.provider === "gemini" && url.includes("googleapis.com")) {
      url = `${url}?key=${customKey.api_key}`;
    } else {
      headers["Authorization"] = `Bearer ${customKey.api_key}`;
    }

    const body: any = {
      model: customKey.model,
      messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
    };
    if (tools && tools.length > 0) body.tools = tools;

    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

    if (response.ok) return { response, source: "custom" };

    console.error(`Custom key failed (${response.status})`);
    if (response.status === 401 || response.status === 403) {
      await supabase.from("bot_api_keys").update({ is_active: false }).eq("id", customKey.id);
    }

    const secondKey = await getNextApiKey(supabase);
    if (secondKey && secondKey.id !== customKey.id) {
      let url2 = secondKey.base_url;
      const headers2: Record<string, string> = { "Content-Type": "application/json" };
      if (secondKey.provider === "gemini" && url2.includes("googleapis.com")) {
        url2 = `${url2}?key=${secondKey.api_key}`;
      } else {
        headers2["Authorization"] = `Bearer ${secondKey.api_key}`;
      }
      const response2 = await fetch(url2, {
        method: "POST", headers: headers2,
        body: JSON.stringify({ ...body, model: secondKey.model }),
      });
      if (response2.ok) return { response: response2, source: "custom" };
    }
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("Không có API key nào khả dụng.");
  }

  console.log("Fallback to Lovable AI");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
      tools,
    }),
  });

  return { response, source: "lovable" };
}

async function callAIVision(supabase: any, imageBase64: string, prompt: string) {
  const customKey = await getNextApiKey(supabase);
  
  const messages = [{
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: imageBase64 } }
    ]
  }];

  if (customKey) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let url = customKey.base_url;
    if (customKey.provider === "gemini" && url.includes("googleapis.com")) {
      url = `${url}?key=${customKey.api_key}`;
    } else {
      headers["Authorization"] = `Bearer ${customKey.api_key}`;
    }

    const response = await fetch(url, {
      method: "POST", headers,
      body: JSON.stringify({ model: customKey.model, messages }),
    });
    if (response.ok) return response;
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("No AI key");

  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { message, messages: conversationHistory, action, action_data, image_base64, profile_action } = await req.json();

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: authUser } } = await authClient.auth.getUser();
      userId = authUser?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Bạn cần đăng nhập để sử dụng bot" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRoleEarly } = await supabase
      .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").limit(1);
    const isAdminUser = adminRoleEarly && adminRoleEarly.length > 0;

    if (!isAdminUser) {
      const { data: banData } = await supabase
        .from("banned_users").select("id").eq("user_id", userId).limit(1);
      if (banData && banData.length > 0) {
        return new Response(JSON.stringify({ error: "Tài khoản của bạn đã bị khóa." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle image moderation (existing)
    if (action === "moderate_image" && image_base64) {
      try {
        const modResp = await callAIVision(supabase, image_base64,
          "Is this image safe for a public chat? Check for: nudity, sexual content, extreme violence, gore, drugs. Reply ONLY with JSON: {\"safe\": true} or {\"safe\": false, \"reason\": \"description\"}"
        );
        if (modResp.ok) {
          const modData = await modResp.json();
          const content = modData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[^}]+\}/);
          if (jsonMatch) {
            return new Response(jsonMatch[0], { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
        return new Response(JSON.stringify({ safe: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ safe: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Handle bill verification for coin purchase
    if (action === "verify_bill" && image_base64) {
      return await handleBillVerification(supabase, userId, image_base64, corsHeaders);
    }

    // Handle profile actions
    if (profile_action) {
      return await handleProfileAction(supabase, supabaseUrl, supabaseAnonKey, authHeader, userId, profile_action, corsHeaders);
    }

    // Handle purchase action
    if (action === "purchase" && action_data) {
      return await handlePurchase(supabase, supabaseUrl, userId, action_data, corsHeaders);
    }

    const latestMessage = message || (conversationHistory?.length ? conversationHistory[conversationHistory.length - 1]?.content : "");

    // Content moderation
    const violationType = !isAdminUser ? checkInappropriateContent(latestMessage) : null;
    if (violationType) {
      await supabase.from("bot_violations").insert({
        user_id: userId, message_content: latestMessage.slice(0, 500), violation_type: violationType,
      });
      const { count } = await supabase
        .from("bot_violations").select("id", { count: "exact", head: true }).eq("user_id", userId);
      const totalViolations = count || 1;

      if (totalViolations >= 3) {
        await autobanUser(supabase, supabaseUrl, userId, `Vi phạm nội dung lần thứ ${totalViolations}: ${violationType}`);
        return new Response(JSON.stringify({ reply: null, auto_banned: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const warningsLeft = 3 - totalViolations;
      return new Response(JSON.stringify({
        reply: `⚠️ **CẢNH BÁO** (${totalViolations}/3)\n\nVi phạm: ${violationType}. Còn **${warningsLeft} lần** trước khi bị **khóa vĩnh viễn**.`,
        warning: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Spam detection
    if (!isAdminUser) {
      const oneMinuteAgo = new Date(Date.now() - SPAM_WINDOW_MS).toISOString();
      const { count: recentMsgCount } = await supabase
        .from("bot_chat_messages").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("role", "user").gte("created_at", oneMinuteAgo);

      if ((recentMsgCount || 0) >= SPAM_MAX_MESSAGES) {
        return new Response(JSON.stringify({
          reply: `⚠️ **Bạn đang gửi quá nhanh!** Vui lòng chờ 1 phút.`,
          warning: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Save user message
    await supabase.from("bot_chat_messages").insert({ user_id: userId, role: "user", content: latestMessage });

    // Fetch context data
    const [productsRes, accountsRes, categoriesRes, userCoinsRes] = await Promise.all([
      supabase.from("products").select("id, title, price, category, description, is_active, is_free, original_price, badge, sales, seller_id").eq("is_active", true).limit(50),
      supabase.from("accounts").select("id, title, platform, price, category, description, is_sold, is_free, features, seller_id, requires_buyer_email").eq("is_active", true).eq("is_sold", false).limit(50),
      supabase.from("categories").select("name, slug, description").eq("is_active", true),
      supabase.from("user_coins").select("balance").eq("user_id", userId).single(),
    ]);

    const products = productsRes.data || [];
    const accounts = accountsRes.data || [];
    const categories = categoriesRes.data || [];
    const userBalance = userCoinsRes.data?.balance ?? 0;

    // Get admin bank info for QR
    const { data: bankSetting } = await supabase
      .from("site_settings").select("value").eq("key", "primary_admin_user_id").maybeSingle();
    let adminBankInfo = "";
    if (bankSetting?.value) {
      const { data: seller } = await supabase
        .from("sellers").select("bank_name, bank_account_number, bank_account_name")
        .eq("user_id", bankSetting.value).maybeSingle();
      if (seller?.bank_account_number) {
        adminBankInfo = `\n\nTHÔNG TIN NẠP XU:\n- Ngân hàng: ${seller.bank_name || 'MB Bank'}\n- STK: ${seller.bank_account_number}\n- Chủ TK: ${seller.bank_account_name || 'BONZ VIP'}\n- Tỷ giá: 1 VNĐ = 1 xu\n- QR Link: https://img.vietqr.io/image/mbbank-${seller.bank_account_number}-compact.jpg\n- Hướng dẫn: Chuyển khoản → Chụp bill → Gửi ảnh bill cho bot → Admin duyệt`;
      }
    }
    if (!adminBankInfo) {
      adminBankInfo = `\n\nTHÔNG TIN NẠP XU:\n- Ngân hàng: MB Bank\n- STK: 0762694589\n- Chủ TK: BONZ VIP\n- Tỷ giá: 1 VNĐ = 1 xu\n- QR Link: https://img.vietqr.io/image/mbbank-0762694589-compact.jpg\n- Hướng dẫn: Chuyển khoản → Chụp bill → Gửi ảnh bill cho bot → Admin duyệt`;
    }

    const systemPrompt = `Bạn là BonzBot - trợ lý mua sắm AI của Bonz Shop.

THÔNG TIN NGƯỜI DÙNG:
- Số dư hiện tại: ${userBalance} xu
- ID: ${userId}
${adminBankInfo}

DANH MỤC: ${categories.map(c => c.name).join(', ')}

SẢN PHẨM (${products.length}):
${products.map((p, i) => `${i + 1}. [ID:${p.id}] ${p.title} | ${p.is_free ? 'MIỄN PHÍ' : p.price + ' xu'} | ${p.category}${p.badge ? ' | ' + p.badge : ''}`).join('\n')}

TÀI KHOẢN ĐANG BÁN (${accounts.length}):
${accounts.map((a, i) => `${i + 1}. [ID:${a.id}] ${a.title} | ${a.platform} | ${a.is_free ? 'MIỄN PHÍ' : a.price + ' xu'} | ${a.category || 'Chung'}${a.requires_buyer_email ? ' | ⚠️ Cần email kích hoạt' : ''}${a.features?.length ? ' | ' + a.features.join(', ') : ''}`).join('\n')}

QUY TẮC:
1. Trả lời tiếng Việt, thân thiện, dùng emoji
2. Khi tìm sản phẩm → liệt kê dạng danh sách có số thứ tự, kèm giá
3. Khi người dùng chọn số hoặc muốn mua → gọi tool purchase_item
4. Kiểm tra số dư trước khi mua. Nếu không đủ xu → hướng dẫn nạp thêm, hiển thị mã QR ngân hàng
5. Sản phẩm requires_buyer_email → thông báo cần kích hoạt thủ công, KHÔNG cho mua qua bot
6. Format giá: X xu
7. Nếu không tìm thấy → đề xuất liên hệ admin

NẠP XU:
- Khi người dùng hỏi nạp xu/mua xu → Hiển thị QR code bằng link: https://img.vietqr.io/image/mbbank-0762694589-compact.jpg
- Hướng dẫn: "Chuyển khoản theo QR → Chụp ảnh bill → Gửi ảnh bill cho tôi (dán ảnh hoặc bấm 📎) → Admin sẽ duyệt và cộng xu"
- QUAN TRỌNG: Khi hiển thị QR, dùng format: ![QR Nạp xu](https://img.vietqr.io/image/mbbank-0762694589-compact.jpg)

QUẢN LÝ HỒ SƠ:
- Đổi email → gọi tool update_profile action="change_email"
- Đổi mật khẩu → gọi tool update_profile action="change_password" (tối thiểu 6 ký tự)
- Đổi avatar → gọi tool update_profile action="change_avatar" + avatar_url
- Đổi tên → gọi tool update_profile action="change_name" + new_name

TUYỆT ĐỐI từ chối nội dung 18+, hack, scam, bạo lực, ma túy. Vi phạm sẽ bị khóa.`;

    const chatMessages = conversationHistory || [{ role: "user", content: latestMessage }];

    const tools = [
      {
        type: "function",
        function: {
          name: "purchase_item",
          description: "Mua một sản phẩm hoặc tài khoản cho người dùng",
          parameters: {
            type: "object",
            properties: {
              item_id: { type: "string", description: "ID của sản phẩm/tài khoản" },
              item_type: { type: "string", enum: ["product", "account"] },
              item_title: { type: "string" },
              item_price: { type: "number" },
            },
            required: ["item_id", "item_type", "item_title", "item_price"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_profile",
          description: "Cập nhật thông tin hồ sơ người dùng",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["change_email", "change_password", "change_avatar", "change_name"] },
              new_email: { type: "string" },
              new_password: { type: "string" },
              avatar_url: { type: "string" },
              new_name: { type: "string" },
            },
            required: ["action"],
            additionalProperties: false,
          },
        },
      },
    ];

    const { response, source } = await callAI(supabase, systemPrompt, chatMessages, tools);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Bot đang bận, thử lại sau!" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t, "source:", source);
      throw new Error("AI error");
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (choice?.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === "purchase_item") {
        const args = JSON.parse(toolCall.function.arguments);
        await supabase.from("bot_chat_messages").insert({
          user_id: userId, role: "assistant", content: `🛒 Xác nhận mua: ${args.item_title} - ${args.item_price} xu`,
        });
        return new Response(JSON.stringify({
          reply: null,
          purchase_request: { item_id: args.item_id, item_type: args.item_type, item_title: args.item_title, item_price: args.item_price },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (toolCall.function.name === "update_profile") {
        const args = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({
          reply: null,
          profile_request: { action: args.action, new_email: args.new_email, new_password: args.new_password, avatar_url: args.avatar_url, new_name: args.new_name },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const botReply = choice?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
    await supabase.from("bot_chat_messages").insert({ user_id: userId, role: "assistant", content: botReply });

    return new Response(JSON.stringify({ reply: botReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ===== Bill Verification =====
async function handleBillVerification(supabase: any, userId: string, imageBase64: string, corsHeaders: any) {
  try {
    // Use AI to verify the bill
    const verifyPrompt = `Bạn là hệ thống xác minh biên lai chuyển khoản ngân hàng. Phân tích ảnh này và trả lời CHÍNH XÁC bằng JSON.

Kiểm tra:
1. Đây có phải là biên lai/bill chuyển khoản ngân hàng hợp lệ không?
2. Nếu có, trích xuất số tiền chuyển (VNĐ)
3. Kiểm tra xem có phải là ảnh chụp màn hình thật (không phải photoshop rõ ràng)

Trả lời CHỈNH bằng JSON (không có text khác):
- Nếu là bill hợp lệ: {"is_bill": true, "amount": <số tiền VNĐ dạng số nguyên>, "bank": "<tên ngân hàng nếu thấy>", "note": "<ghi chú chuyển khoản nếu có>"}
- Nếu KHÔNG phải bill: {"is_bill": false, "reason": "<lý do>"}

Chú ý: Số tiền phải là SỐ NGUYÊN (không có dấu chấm, phẩy). Ví dụ: 50000, 100000, 1000000`;

    const response = await callAIVision(supabase, imageBase64, verifyPrompt);

    if (!response.ok) {
      return billErrorResp("Không thể xác minh ảnh lúc này. Vui lòng thử lại!", userId, supabase, corsHeaders);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("Bill verification AI response:", content);

    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return billErrorResp("Không thể phân tích ảnh. Vui lòng gửi ảnh bill rõ ràng hơn.", userId, supabase, corsHeaders);
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.is_bill) {
      const reply = `❌ **Đây không phải bill chuyển khoản hợp lệ.**\n\n📌 Lý do: ${result.reason || 'Không nhận diện được'}\n\n💡 Hãy gửi ảnh chụp màn hình bill chuyển khoản ngân hàng (MB Bank → STK 0762694589).`;
      await supabase.from("bot_chat_messages").insert({ user_id: userId, role: "assistant", content: reply });
      return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const amount = parseInt(result.amount) || 0;
    if (amount <= 0) {
      const reply = `❌ **Không thể xác định số tiền từ bill.** Vui lòng gửi ảnh rõ hơn.`;
      await supabase.from("bot_chat_messages").insert({ user_id: userId, role: "assistant", content: reply });
      return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upload bill image to storage
    const fileName = `bot-bill-${userId}-${Date.now()}.jpg`;
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, binaryData, { contentType: 'image/jpeg', upsert: true });

    let receiptUrl = null;
    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      receiptUrl = urlData?.publicUrl;
    }

    // Create coin purchase request for admin approval
    const { data: purchaseReq, error: purchaseError } = await supabase
      .from('coin_purchases')
      .insert({
        user_id: userId,
        amount: amount,
        receipt_url: receiptUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Error creating coin purchase:", purchaseError);
      return billErrorResp("Lỗi tạo yêu cầu nạp xu. Vui lòng thử lại!", userId, supabase, corsHeaders);
    }

    // Notify user
    const reply = `✅ **Đã nhận bill chuyển khoản!**\n\n💰 Số tiền: **${amount.toLocaleString('vi-VN')} VNĐ** = **${amount.toLocaleString('vi-VN')} xu**\n🏦 Ngân hàng: ${result.bank || 'Đang xác minh'}\n📋 Mã yêu cầu: \`${purchaseReq.id.slice(0, 8)}...\`\n\n⏳ **Đang chờ Admin duyệt.** Bạn sẽ nhận được thông báo khi xu được cộng vào tài khoản.\n\n💡 Thời gian duyệt thường trong vòng vài phút.`;

    await supabase.from("bot_chat_messages").insert({ user_id: userId, role: "assistant", content: reply });

    // Create notification for admins
    const { data: admins } = await supabase
      .from("user_roles").select("user_id").eq("role", "admin");

    if (admins) {
      for (const admin of admins) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "💳 Yêu cầu nạp xu mới (via Bot)",
          message: `Người dùng gửi bill ${amount.toLocaleString('vi-VN')} VNĐ qua BonzBot. Cần duyệt!`,
          type: "coin_purchase",
          reference_id: purchaseReq.id,
        });
      }
    }

    // Try sending Telegram notification
    try {
      const { data: telegramSetting } = await supabase
        .from("site_settings").select("value").eq("key", "telegram_bot_token").maybeSingle();
      const { data: chatIdSetting } = await supabase
        .from("site_settings").select("value").eq("key", "telegram_chat_id").maybeSingle();

      if (telegramSetting?.value && chatIdSetting?.value) {
        const { data: profile } = await supabase
          .from("profiles").select("display_name").eq("user_id", userId).single();

        const telegramMsg = `💳 *Yêu cầu nạp xu mới (Bot)*\n\n👤 ${profile?.display_name || 'Ẩn danh'}\n💰 ${amount.toLocaleString('vi-VN')} VNĐ\n📋 ID: \`${purchaseReq.id.slice(0, 8)}\`\n\nVào trang Admin để duyệt!`;

        await fetch(`https://api.telegram.org/bot${telegramSetting.value}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatIdSetting.value,
            text: telegramMsg,
            parse_mode: "Markdown",
          }),
        });
      }
    } catch (e) {
      console.error("Telegram notification error:", e);
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Bill verification error:", e);
    return billErrorResp("Lỗi xác minh bill. Vui lòng thử lại!", userId, supabase, corsHeaders);
  }
}

function billErrorResp(msg: string, userId: string, supabase: any, corsHeaders: any) {
  supabase.from("bot_chat_messages").insert({ user_id: userId, role: "assistant", content: `❌ ${msg}` });
  return new Response(JSON.stringify({ reply: `❌ ${msg}` }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ===== Existing functions =====
function checkInappropriateContent(message: string): string | null {
  if (!message || message.trim().length === 0) return null;
  if (/(.)\1{10,}/gi.test(message)) return "spam (ký tự lặp)";
  if (/\b(sex|porn|xxx|nude|nud[eê]|kh[iỉ]êu\s*d[aâ]m|d[aâ]m\s*d[uụ]c|th[uủ]\s*d[aâ]m|l[oồ]n|c[aặ]c|đ[iị]t|đ[uụ]|ch[iị]ch|s[uứ]c\s*v[aậ]t|lo[aạ]n\s*lu[aâ]n|h[ií]p\s*d[aâ]m|onlyfan|nsfw|h[eề]ntai|javhd|jav)\b/gi.test(message)) return "nội dung 18+";
  if (/\b(gi[eế]t\s*ng[uư][oờ]i|m[aạ]i\s*d[aâ]m|ma\s*t[uú]y|c[aầ]n\s*sa|thu[oố]c\s*l[aắ]c|heroin|cocaine|ketamine|ecstasy)\b/gi.test(message)) return "nội dung bạo lực/ma túy";
  if (/\b(hack|ddos|dos|c[aạ]rd|carding|scam|l[uừ]a\s*đ[aả]o|phish|keylog|trojan|malware|ransomware|brute\s*force|exploit|inject|bypass|crack|ch[eế]at|b[oẻ]\s*kh[oó]a|fake\s*login|rat\s*tool)\b/gi.test(message)) return "nội dung lừa đảo/hack";
  return null;
}

async function autobanUser(supabase: any, supabaseUrl: string, userId: string, reason: string) {
  try {
    const { data: adminCheck } = await supabase
      .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").limit(1);
    if (adminCheck && adminCheck.length > 0) return;

    await supabase.from("banned_users").insert({ user_id: userId, reason: `[AUTO-BAN BOT] ${reason}` });
    await supabase.from("chat_muted_users").insert({ user_id: userId, reason: `[AUTO-BAN BOT] ${reason}` });

    const { data: profile } = await supabase
      .from("profiles").select("display_name").eq("user_id", userId).single();

    await supabase.from("chat_messages").insert({
      user_id: userId,
      content: `⛔ **${profile?.display_name || "Ẩn danh"}** đã bị BAN do vi phạm quy định khi sử dụng BonzBot.\n📌 Lý do: ${reason}`,
      is_deleted: false, gradient_color: "system-ban",
    });

    await supabase.from("notifications").insert({
      user_id: userId, title: "⛔ Tài khoản bị khóa",
      message: `Tài khoản bị khóa tự động: ${reason}`, type: "ban",
    });
  } catch (e) {
    console.error("Error auto-banning:", e);
  }
}

async function handleProfileAction(supabase: any, supabaseUrl: string, supabaseAnonKey: string, authHeader: string | null, userId: string, profileAction: any, corsHeaders: any) {
  try {
    const { action, new_email, new_password, avatar_url, new_name } = profileAction;

    const callGoTrueUserUpdate = async (body: Record<string, any>) => {
      if (!authHeader?.startsWith("Bearer ")) return { error: "Phiên đăng nhập hết hạn." };
      const token = authHeader.replace("Bearer ", "");
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": supabaseAnonKey },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { error: errData.msg || errData.message || `Lỗi ${res.status}` };
      }
      return { error: null };
    };

    switch (action) {
      case "change_email": {
        if (!new_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new_email)) {
          return successResp("❌ Email không hợp lệ.", userId, supabase, corsHeaders);
        }
        const result = await callGoTrueUserUpdate({ email: new_email });
        if (result.error) return successResp(`❌ Không thể đổi email: ${result.error}`, userId, supabase, corsHeaders);
        return successResp(`✅ Đã gửi yêu cầu đổi email sang **${new_email}**. Kiểm tra email để xác nhận.`, userId, supabase, corsHeaders);
      }
      case "change_password": {
        if (!new_password || new_password.length < 6) {
          return successResp("❌ Mật khẩu phải có ít nhất 6 ký tự.", userId, supabase, corsHeaders);
        }
        const result = await callGoTrueUserUpdate({ password: new_password });
        if (result.error) return successResp(`❌ Không thể đổi mật khẩu: ${result.error}`, userId, supabase, corsHeaders);
        return successResp("✅ Đã đổi mật khẩu thành công! 🔒", userId, supabase, corsHeaders);
      }
      case "change_avatar": {
        if (!avatar_url) return successResp("❌ Vui lòng cung cấp URL ảnh avatar.", userId, supabase, corsHeaders);
        const { error } = await supabase.from("profiles").update({ avatar_url, updated_at: new Date().toISOString() }).eq("user_id", userId);
        if (error) return successResp(`❌ Không thể đổi avatar: ${error.message}`, userId, supabase, corsHeaders);
        return successResp("✅ Đã cập nhật avatar! 🖼️", userId, supabase, corsHeaders);
      }
      case "change_name": {
        if (!new_name?.trim()) return successResp("❌ Tên không được để trống.", userId, supabase, corsHeaders);
        const trimmedName = new_name.trim();
        await supabase.auth.admin.updateUserById(userId, { user_metadata: { display_name: trimmedName } });
        const { error } = await supabase.from("profiles").update({ display_name: trimmedName, updated_at: new Date().toISOString() }).eq("user_id", userId);
        if (error) return successResp(`❌ Không thể đổi tên: ${error.message}`, userId, supabase, corsHeaders);
        return successResp(`✅ Đã đổi tên thành **${trimmedName}**! ✨`, userId, supabase, corsHeaders);
      }
      default:
        return successResp("❌ Hành động không hợp lệ.", userId, supabase, corsHeaders);
    }
  } catch (e) {
    console.error("Profile action error:", e);
    return errorResp("Lỗi cập nhật hồ sơ", corsHeaders);
  }
}

async function successResp(message: string, userId: string, supabase: any, corsHeaders: any) {
  await supabase.from("bot_chat_messages").insert({ user_id: userId, role: "assistant", content: message });
  return new Response(JSON.stringify({ reply: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePurchase(supabase: any, supabaseUrl: string, userId: string, data: any, corsHeaders: any) {
  const { item_id, item_type, item_price } = data;

  try {
    let { data: coinData } = await supabase
      .from("user_coins").select("id, balance").eq("user_id", userId).single();

    if (!coinData) {
      const { data: newCoin } = await supabase
        .from("user_coins").insert({ user_id: userId, balance: 0 }).select("id, balance").single();
      coinData = newCoin;
    }

    if (!coinData || coinData.balance < item_price) {
      return errorResp(`Không đủ xu! Số dư: ${coinData?.balance || 0} xu, cần: ${item_price} xu`, corsHeaders);
    }

    if (item_type === "account") {
      const { data: account } = await supabase
        .from("accounts").select("price, is_sold, is_free, seller_id, requires_buyer_email, title")
        .eq("id", item_id).single();
      if (!account) return errorResp("Không tìm thấy tài khoản", corsHeaders);
      if (account.is_sold) return errorResp("Tài khoản đã được bán", corsHeaders);
      if (account.requires_buyer_email) return errorResp("Cần kích hoạt thủ công, vui lòng mua qua web", corsHeaders);
    } else {
      const { data: product } = await supabase.from("products").select("price, is_free, seller_id, title").eq("id", item_id).single();
      if (!product) return errorResp("Không tìm thấy sản phẩm", corsHeaders);
    }

    const newBalance = coinData.balance - item_price;
    const { error: updateError, data: updatedCoin } = await supabase
      .from("user_coins").update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", coinData.id).eq("balance", coinData.balance).select().single();

    if (updateError || !updatedCoin) return errorResp("Giao dịch thất bại", corsHeaders);

    const orderData: any = {
      user_id: userId, buyer_id: userId, amount: item_price,
      status: "approved", approved_at: new Date().toISOString(), approved_by: userId, order_type: "coin_purchase",
    };
    if (item_type === "account") orderData.account_id = item_id;
    else orderData.product_id = item_id;

    const { data: order, error: orderError } = await supabase.from("orders").insert(orderData).select().single();

    if (orderError) {
      await supabase.from("user_coins").update({ balance: coinData.balance }).eq("id", coinData.id);
      return errorResp("Không thể tạo đơn hàng, đã hoàn xu", corsHeaders);
    }

    if (item_type === "account") {
      await supabase.from("accounts").update({ is_sold: true, sold_to: userId, sold_at: new Date().toISOString() }).eq("id", item_id);
    }

    let itemTitle = "Sản phẩm";
    if (item_type === "account") {
      const { data: acc } = await supabase.from("accounts").select("title").eq("id", item_id).single();
      itemTitle = acc?.title || "Tài khoản";
    } else {
      const { data: prod } = await supabase.from("products").select("title").eq("id", item_id).single();
      itemTitle = prod?.title || "Sản phẩm";
    }

    await supabase.from("coin_history").insert({
      user_id: userId, amount: -item_price, type: "account_purchase",
      description: `Mua "${itemTitle}" qua BonzBot`, reference_id: order.id,
    });

    await supabase.from("notifications").insert({
      user_id: userId, title: "🤖 Mua hàng qua Bot!",
      message: `Đã mua "${itemTitle}" - ${item_price} xu`, type: "purchase", reference_id: order.id,
    });

    await supabase.from("bot_chat_messages").insert({
      user_id: userId, role: "assistant",
      content: `🎉 Mua thành công "${itemTitle}" - ${item_price} xu. Số dư: ${newBalance} xu.`,
    });

    // Seller commission
    let sellerId: string | null = null;
    if (item_type === "account") {
      const { data: acc } = await supabase.from("accounts").select("seller_id").eq("id", item_id).single();
      sellerId = acc?.seller_id;
    } else {
      const { data: prod } = await supabase.from("products").select("seller_id").eq("id", item_id).single();
      sellerId = prod?.seller_id;
    }

    if (sellerId) {
      let commissionFee = 1;
      if (item_price >= 100) commissionFee = 10;
      else if (item_price >= 50) commissionFee = 7;
      else if (item_price >= 20) commissionFee = 5;
      else if (item_price >= 10) commissionFee = 3;
      const sellerReceives = item_price - commissionFee;

      const { data: existingSellerCoins } = await supabase
        .from("seller_coins").select("id, balance, total_earned").eq("seller_id", sellerId).single();

      if (existingSellerCoins) {
        await supabase.from("seller_coins").update({
          balance: existingSellerCoins.balance + sellerReceives,
          total_earned: (existingSellerCoins.total_earned || 0) + sellerReceives,
        }).eq("id", existingSellerCoins.id);
      } else {
        await supabase.from("seller_coins").insert({
          seller_id: sellerId, balance: sellerReceives, total_earned: sellerReceives,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true, new_balance: newBalance, order_id: order.id, item_title: itemTitle,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Purchase error:", e);
    return errorResp("Lỗi hệ thống khi mua hàng", corsHeaders);
  }
}

function errorResp(msg: string, corsHeaders: any) {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
