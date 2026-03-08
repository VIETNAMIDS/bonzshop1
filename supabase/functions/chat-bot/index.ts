import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { message, messages: conversationHistory, action, action_data } = await req.json();

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await authClient.auth.getClaims(token);
      userId = claimsData?.claims?.sub || null;
    }

    // Handle purchase action directly
    if (action === "purchase" && action_data && userId) {
      return await handlePurchase(supabase, supabaseUrl, userId, action_data, corsHeaders);
    }

    // Fetch context data for the bot
    const [productsRes, accountsRes, categoriesRes, userCoinsRes] = await Promise.all([
      supabase.from("products").select("id, title, price, category, description, is_active, is_free, original_price, badge, sales, seller_id").eq("is_active", true).limit(50),
      supabase.from("accounts").select("id, title, platform, price, category, description, is_sold, is_free, features, seller_id, requires_buyer_email").eq("is_active", true).eq("is_sold", false).limit(50),
      supabase.from("categories").select("name, slug, description").eq("is_active", true),
      userId ? supabase.from("user_coins").select("balance").eq("user_id", userId).single() : Promise.resolve({ data: null }),
    ]);

    const products = productsRes.data || [];
    const accounts = accountsRes.data || [];
    const categories = categoriesRes.data || [];
    const userBalance = userCoinsRes.data?.balance ?? 0;

    const systemPrompt = `Bạn là BonzBot - trợ lý mua sắm AI của Bonz Shop. Bạn có thể giúp người dùng tìm và MUA sản phẩm trực tiếp.

THÔNG TIN NGƯỜI DÙNG:
- Số dư hiện tại: ${userBalance} xu
- ID: ${userId || 'chưa đăng nhập'}

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
5. Sản phẩm requires_buyer_email → thông báo cần cung cấp email kích hoạt, KHÔNG cho mua qua bot
6. Format giá: X xu
7. Nếu không tìm thấy → đề xuất liên hệ admin
8. QUAN TRỌNG: Khi gọi tool purchase_item, truyền đúng item_id và item_type`;

    const chatMessages = conversationHistory || [{ role: "user", content: message }];

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
        tools: [
          {
            type: "function",
            function: {
              name: "purchase_item",
              description: "Mua một sản phẩm hoặc tài khoản cho người dùng. Chỉ gọi khi người dùng XÁC NHẬN muốn mua.",
              parameters: {
                type: "object",
                properties: {
                  item_id: { type: "string", description: "ID của sản phẩm hoặc tài khoản (lấy từ danh sách)" },
                  item_type: { type: "string", enum: ["product", "account"], description: "Loại: product hoặc account" },
                  item_title: { type: "string", description: "Tên sản phẩm để hiển thị" },
                  item_price: { type: "number", description: "Giá bằng xu" },
                },
                required: ["item_id", "item_type", "item_title", "item_price"],
                additionalProperties: false,
              },
            },
          },
        ],
      }),
    });

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
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    // Check if bot wants to call a tool
    if (choice?.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === "purchase_item") {
        const args = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({
          reply: null,
          purchase_request: {
            item_id: args.item_id,
            item_type: args.item_type,
            item_title: args.item_title,
            item_price: args.item_price,
          },
          tool_call_id: toolCall.id,
          assistant_message: choice.message,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const botReply = choice?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
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

async function handlePurchase(supabase: any, supabaseUrl: string, userId: string, data: any, corsHeaders: any) {
  const { item_id, item_type, item_price } = data;

  try {
    // Get user balance
    let { data: coinData } = await supabase
      .from("user_coins").select("id, balance").eq("user_id", userId).single();

    if (!coinData) {
      const { data: newCoin } = await supabase
        .from("user_coins").insert({ user_id: userId, balance: 0 }).select("id, balance").single();
      coinData = newCoin;
    }

    if (!coinData || coinData.balance < item_price) {
      return new Response(JSON.stringify({
        success: false,
        error: `Không đủ xu! Số dư: ${coinData?.balance || 0} xu, cần: ${item_price} xu`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify item
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

    // Call the existing purchase function
    const purchaseResp = await fetch(`${supabaseUrl}/functions/v1/purchase-with-coins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        ...(item_type === "account" ? { accountId: item_id } : { productId: item_id }),
        requiredCoins: item_price,
      }),
    });

    // We need the user's auth token to call purchase-with-coins, but we're server-side
    // So let's do the purchase directly here
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

    // Create order
    const orderData: any = {
      user_id: userId,
      buyer_id: userId,
      amount: item_price,
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: userId,
      order_type: "coin_purchase",
    };
    if (item_type === "account") orderData.account_id = item_id;
    else orderData.product_id = item_id;

    const { data: order, error: orderError } = await supabase
      .from("orders").insert(orderData).select().single();

    if (orderError) {
      // Rollback balance
      await supabase.from("user_coins").update({ balance: coinData.balance }).eq("id", coinData.id);
      return errorResp("Không thể tạo đơn hàng, đã hoàn xu", corsHeaders);
    }

    // Mark account as sold
    if (item_type === "account") {
      await supabase.from("accounts").update({
        is_sold: true, sold_to: userId, sold_at: new Date().toISOString(),
      }).eq("id", item_id);
    }

    // Record coin history
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

    // Send seller commission
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
      success: true,
      new_balance: newBalance,
      order_id: order.id,
      item_title: itemTitle,
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
