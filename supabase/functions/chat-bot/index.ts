import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPAM_WINDOW_MS = 60_000;
const SPAM_MAX_MESSAGES = 10;

// Get next API key using round-robin (least recently used)
async function getNextApiKey(supabase: any): Promise<{ id: string; api_key: string; model: string; base_url: string; provider: string } | null> {
  const { data: keys } = await supabase
    .from("bot_api_keys")
    .select("id, api_key, model, base_url, provider")
    .eq("is_active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1);

  if (!keys || keys.length === 0) return null;

  const key = keys[0];

  // Update usage
  await supabase
    .from("bot_api_keys")
    .update({ usage_count: supabase.rpc ? undefined : 0, last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  // Increment usage_count separately
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
  // Try custom API keys first
  const customKey = await getNextApiKey(supabase);

  if (customKey) {
    console.log(`Using custom key: ${customKey.provider}/${customKey.model} (id: ${customKey.id})`);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Different auth headers for different providers
    if (customKey.provider === "gemini") {
      // Google Gemini uses API key in URL or header
      headers["Authorization"] = `Bearer ${customKey.api_key}`;
    } else {
      headers["Authorization"] = `Bearer ${customKey.api_key}`;
    }

    const body: any = {
      model: customKey.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatMessages,
      ],
    };

    // Only add tools if provider supports it
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    let url = customKey.base_url;
    // For Gemini, append key as query param if using googleapis URL
    if (customKey.provider === "gemini" && url.includes("googleapis.com")) {
      url = `${url}?key=${customKey.api_key}`;
      delete headers["Authorization"];
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return { response, source: "custom" };
    }

    console.error(`Custom key failed (${response.status}), trying next or fallback...`);
    
    // Mark key as inactive if auth error
    if (response.status === 401 || response.status === 403) {
      await supabase.from("bot_api_keys").update({ is_active: false }).eq("id", customKey.id);
      console.log(`Disabled invalid key: ${customKey.id}`);
    }

    // Try another key
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
        method: "POST",
        headers: headers2,
        body: JSON.stringify({ ...body, model: secondKey.model }),
      });

      if (response2.ok) {
        return { response: response2, source: "custom" };
      }
    }
  }

  // Fallback to Lovable AI
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("Không có API key nào khả dụng. Vui lòng thêm API key trong trang quản trị.");
  }

  console.log("Fallback to Lovable AI");
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
        ...chatMessages,
      ],
      tools,
    }),
  });

  return { response, source: "lovable" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { message, messages: conversationHistory, action, action_data, image_base64 } = await req.json();

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

    // Check admin status early
    const { data: adminRoleEarly } = await supabase
      .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").limit(1);
    const isAdminUser = adminRoleEarly && adminRoleEarly.length > 0;

    // Check if user is banned (skip for admins)
    if (!isAdminUser) {
      const { data: banData } = await supabase
        .from("banned_users").select("id").eq("user_id", userId).limit(1);
      if (banData && banData.length > 0) {
        return new Response(JSON.stringify({ error: "Tài khoản của bạn đã bị khóa." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: muteData } = await supabase
        .from("chat_muted_users").select("id").eq("user_id", userId).is("unmuted_at", null).limit(1);
      if (muteData && muteData.length > 0) {
        return new Response(JSON.stringify({ error: "Bạn đã bị cấm chat." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle image moderation
    if (action === "moderate_image" && image_base64) {
      try {
        const { response: modResp } = await callAI(supabase,
          "You are a content moderator. Check if the image is safe for public chat.",
          [{
            role: "user",
            content: [
              { type: "text", text: "Is this image safe for a public chat? Check for: nudity, sexual content, extreme violence, gore, drugs. Reply ONLY with JSON: {\"safe\": true} or {\"safe\": false, \"reason\": \"description\"}" },
              { type: "image_url", image_url: { url: image_base64 } }
            ]
          }],
          []
        );
        
        if (modResp.ok) {
          const modData = await modResp.json();
          const content = modData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[^}]+\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        return new Response(JSON.stringify({ safe: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ safe: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle purchase action
    if (action === "purchase" && action_data) {
      return await handlePurchase(supabase, supabaseUrl, userId, action_data, corsHeaders);
    }

    const latestMessage = message || (conversationHistory?.length ? conversationHistory[conversationHistory.length - 1]?.content : "");

    // Content moderation (skip for admins)
    const violationType = !isAdminUser ? checkInappropriateContent(latestMessage) : null;
    if (violationType) {
      await supabase.from("bot_violations").insert({
        user_id: userId, message_content: latestMessage.slice(0, 500), violation_type: violationType,
      });

      const { count } = await supabase
        .from("bot_violations").select("id", { count: "exact", head: true }).eq("user_id", userId);
      const totalViolations = count || 1;

      if (totalViolations >= 3) {
        await autobanUser(supabase, supabaseUrl, userId, `Vi phạm nội dung chat bot lần thứ ${totalViolations}: ${violationType}`);
        return new Response(JSON.stringify({
          reply: null, auto_banned: true,
          error: "Tài khoản của bạn đã bị khóa do vi phạm quy định nhiều lần.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const warningsLeft = 3 - totalViolations;
      return new Response(JSON.stringify({
        reply: `⚠️ **CẢNH BÁO** (${totalViolations}/3)\n\nTin nhắn của bạn vi phạm quy định (${violationType}). Bạn còn **${warningsLeft} lần** cảnh báo trước khi bị **khóa tài khoản vĩnh viễn**.\n\n❌ Không được gửi nội dung 18+, hack, scam, lừa đảo, bạo lực, ma túy, hoặc spam.\n\nHãy sử dụng bot đúng mục đích: tìm kiếm và mua sản phẩm.`,
        warning: true, violations_count: totalViolations,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Spam detection (skip for admins)
    if (!isAdminUser) {
      const oneMinuteAgo = new Date(Date.now() - SPAM_WINDOW_MS).toISOString();
      const { count: recentMsgCount } = await supabase
        .from("bot_chat_messages").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("role", "user").gte("created_at", oneMinuteAgo);

      if ((recentMsgCount || 0) >= SPAM_MAX_MESSAGES) {
        await supabase.from("bot_violations").insert({
          user_id: userId, message_content: `SPAM: ${recentMsgCount} messages in 1 minute`, violation_type: "spam",
        });

        const { count: totalViol } = await supabase
          .from("bot_violations").select("id", { count: "exact", head: true }).eq("user_id", userId);

        if ((totalViol || 0) >= 3) {
          await autobanUser(supabase, supabaseUrl, userId, "Spam bot quá nhiều lần");
          return new Response(JSON.stringify({
            reply: null, auto_banned: true, error: "Tài khoản đã bị khóa do spam.",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({
          reply: `⚠️ **Bạn đang gửi quá nhanh!** Vui lòng chờ 1 phút trước khi gửi tiếp.\n\n⏳ Cảnh báo: ${totalViol}/3`,
          warning: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Save user message
    await supabase.from("bot_chat_messages").insert({
      user_id: userId, role: "user", content: latestMessage,
    });

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

    const systemPrompt = `Bạn là BonzBot - trợ lý mua sắm AI của Bonz Shop. Bạn có thể giúp người dùng tìm và MUA sản phẩm trực tiếp.

THÔNG TIN NGƯỜI DÙNG:
- Số dư hiện tại: ${userBalance} xu
- ID: ${userId}

DANH MỤC: ${categories.map(c => c.name).join(', ')}

SẢN PHẨM (${products.length}):
${products.map((p, i) => `${i + 1}. [ID:${p.id}] ${p.title} | ${p.is_free ? 'MIỄN PHÍ' : p.price + ' xu'} | ${p.category}${p.badge ? ' | ' + p.badge : ''}`).join('\n')}

TÀI KHOẢN ĐANG BÁN (${accounts.length}):
${accounts.map((a, i) => `${i + 1}. [ID:${a.id}] ${a.title} | ${a.platform} | ${a.is_free ? 'MIỄN PHÍ' : a.price + ' xu'} | ${a.category || 'Chung'}${a.requires_buyer_email ? ' | ⚠️ Cần email kích hoạt' : ''}${a.features?.length ? ' | ' + a.features.join(', ') : ''}`).join('\n')}

QUY TẮC:
1. Trả lời tiếng Việt, thân thiện, dùng emoji
2. Khi tìm sản phẩm → liệt kê dạng danh sách có số thứ tự, kèm giá
3. Khi người dùng chọn số hoặc muốn mua → gọi tool purchase_item
4. Kiểm tra số dư trước khi mua. Nếu không đủ xu → hướng dẫn nạp thêm tại trang "Nạp xu"
5. Sản phẩm requires_buyer_email → thông báo cần kích hoạt thủ công, KHÔNG cho mua qua bot
6. Format giá: X xu
7. Nếu không tìm thấy → đề xuất liên hệ admin
8. QUAN TRỌNG: Khi gọi tool purchase_item, truyền đúng item_id và item_type
9. TUYỆT ĐỐI từ chối và cảnh báo nghiêm khắc nếu người dùng hỏi bất cứ điều gì về: hack, ddos, scam, lừa đảo, carding, crack, bypass, exploit, cheat, nội dung 18+, bạo lực, ma túy. Nhắc nhở rằng vi phạm sẽ bị khóa tài khoản.`;

    const chatMessages = conversationHistory || [{ role: "user", content: latestMessage }];

    const tools = [
      {
        type: "function",
        function: {
          name: "purchase_item",
          description: "Mua một sản phẩm hoặc tài khoản cho người dùng. Chỉ gọi khi người dùng XÁC NHẬN muốn mua.",
          parameters: {
            type: "object",
            properties: {
              item_id: { type: "string", description: "ID của sản phẩm hoặc tài khoản" },
              item_type: { type: "string", enum: ["product", "account"], description: "Loại: product hoặc account" },
              item_title: { type: "string", description: "Tên sản phẩm" },
              item_price: { type: "number", description: "Giá bằng xu" },
            },
            required: ["item_id", "item_type", "item_title", "item_price"],
            additionalProperties: false,
          },
        },
      },
    ];

    const { response, source } = await callAI(supabase, systemPrompt, chatMessages, tools);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Bot đang bận, vui lòng thử lại sau!" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hệ thống AI tạm ngưng." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t, "source:", source);
      throw new Error("AI error");
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    // Check if bot wants to call a tool
    if (choice?.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === "purchase_item") {
        const args = JSON.parse(toolCall.function.arguments);

        const confirmMsg = `🛒 Xác nhận mua: ${args.item_title} - ${args.item_price} xu`;
        await supabase.from("bot_chat_messages").insert({
          user_id: userId, role: "assistant", content: confirmMsg,
        });

        return new Response(JSON.stringify({
          reply: null,
          purchase_request: {
            item_id: args.item_id, item_type: args.item_type,
            item_title: args.item_title, item_price: args.item_price,
          },
          tool_call_id: toolCall.id,
          assistant_message: choice.message,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const botReply = choice?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";

    await supabase.from("bot_chat_messages").insert({
      user_id: userId, role: "assistant", content: botReply,
    });

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

    await supabase.from("banned_users").insert({
      user_id: userId, reason: `[AUTO-BAN BOT] ${reason}`, banned_by: null,
    });

    await supabase.from("chat_muted_users").insert({
      user_id: userId, reason: `[AUTO-BAN BOT] ${reason}`,
    });

    const { data: profile } = await supabase
      .from("profiles").select("display_name").eq("user_id", userId).single();
    const displayName = profile?.display_name || "Người dùng ẩn danh";

    await supabase.from("chat_messages").insert({
      user_id: userId,
      content: `⛔ **${displayName}** đã bị BAN VĨNH VIỄN do vi phạm quy định khi sử dụng BonzBot.\n\n📌 Lý do: ${reason}\n\n⚠️ Cảnh báo cộng đồng: Không sử dụng bot cho mục đích 18+, spam, hack, lừa đảo. Vi phạm 3 lần sẽ bị khóa tài khoản vĩnh viễn!`,
      is_deleted: false, gradient_color: "system-ban",
    });

    await supabase.from("notifications").insert({
      user_id: userId, title: "⛔ Tài khoản bị khóa",
      message: `Tài khoản của bạn đã bị khóa tự động do: ${reason}`, type: "ban",
    });

    console.log(`Auto-banned user ${userId}: ${reason}`);
  } catch (e) {
    console.error("Error auto-banning user:", e);
  }
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
      if (account.requires_buyer_email) return errorResp("Tài khoản này cần kích hoạt thủ công, vui lòng mua qua trang web", corsHeaders);
    } else {
      const { data: product } = await supabase
        .from("products").select("price, is_free, seller_id, title")
        .eq("id", item_id).single();

      if (!product) return errorResp("Không tìm thấy sản phẩm", corsHeaders);
    }

    const newBalance = coinData.balance - item_price;
    const { error: updateError, data: updatedCoin } = await supabase
      .from("user_coins")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", coinData.id)
      .eq("balance", coinData.balance)
      .select().single();

    if (updateError || !updatedCoin) {
      return errorResp("Giao dịch thất bại, vui lòng thử lại", corsHeaders);
    }

    const orderData: any = {
      user_id: userId, buyer_id: userId, amount: item_price,
      status: "approved", approved_at: new Date().toISOString(),
      approved_by: userId, order_type: "coin_purchase",
    };
    if (item_type === "account") orderData.account_id = item_id;
    else orderData.product_id = item_id;

    const { data: order, error: orderError } = await supabase
      .from("orders").insert(orderData).select().single();

    if (orderError) {
      await supabase.from("user_coins").update({ balance: coinData.balance }).eq("id", coinData.id);
      return errorResp("Không thể tạo đơn hàng, đã hoàn xu", corsHeaders);
    }

    if (item_type === "account") {
      await supabase.from("accounts").update({
        is_sold: true, sold_to: userId, sold_at: new Date().toISOString(),
      }).eq("id", item_id);
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
      user_id: userId,
      title: "🤖 Mua hàng qua Bot thành công!",
      message: `Bạn đã mua "${itemTitle}" với ${item_price} xu qua BonzBot.`,
      type: "purchase", reference_id: order.id,
    });

    await supabase.from("bot_chat_messages").insert({
      user_id: userId, role: "assistant",
      content: `🎉 Mua thành công "${itemTitle}" - ${item_price} xu. Số dư còn: ${newBalance} xu.`,
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
