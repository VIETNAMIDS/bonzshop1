import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

 interface TelegramPayload {
   type: 'new_registration' | 'coin_purchase' | 'product_purchase' | 'account_purchase' | 'seller_upload' | 'seller_sale' | 'withdrawal_request' | 'bot_rental' | 'new_post' | 'new_product' | 'new_account' | 'key_purchase' | 'activation_order';
  userEmail?: string;
  userName?: string;
  amount?: number;
  receiptUrl?: string;
  purchaseId?: string;
  productTitle?: string;
  productType?: string;
  orderId?: string;
  // For seller uploads
  sellerName?: string;
  itemType?: 'account' | 'product';
  itemId?: string;
  itemPrice?: number;
  // For seller sale notifications
  buyerEmail?: string;
  coinsEarned?: number;
  commissionFee?: number;
  totalEarnings?: number;
  sellerTelegramChatId?: string;
  // For withdrawal requests
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankQrUrl?: string;
  withdrawalId?: string;
 // For bot rental
 botName?: string;
 price?: number;
 // For activation orders
 activationEmail?: string;
 gmailPassword?: string;
 months?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: TelegramPayload = await req.json();
    console.log('Telegram notification request:', payload);

    // Get Telegram settings from site_settings
    const { data: settings, error: settingsError } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['telegram_bot_token', 'telegram_chat_id']);

    if (settingsError) {
      console.error('Error fetching telegram settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Không thể lấy cài đặt Telegram' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach(s => {
      if (s.value) settingsMap[s.key] = s.value;
    });

    const botToken = settingsMap['telegram_bot_token'];
    const chatId = settingsMap['telegram_chat_id'];

    if (!botToken || !chatId) {
      console.log('Telegram not configured, skipping notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Telegram chưa được cấu hình' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build message based on type
    let message = '';
    let inlineKeyboard = null;
    let photoUrl = null;
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    if (payload.type === 'new_registration') {
      message = `🆕 *ĐĂNG KÝ MỚI*\n\n` +
        `👤 Tên: ${payload.userName || 'Chưa đặt tên'}\n` +
        `📧 Email: ${payload.userEmail}\n` +
        `🕐 Thời gian: ${now}`;
    } else if (payload.type === 'coin_purchase') {
      message = `💰 *YÊU CẦU NẠP XU*\n\n` +
        `👤 Email: ${payload.userEmail}\n` +
        `🪙 Số xu: ${payload.amount?.toLocaleString('vi-VN')} xu\n` +
        `💵 Số tiền: ${((payload.amount || 0) * 1000).toLocaleString('vi-VN')} VNĐ\n` +
        `🕐 Thời gian: ${now}`;
      
      // If there's a receipt image, we'll send it as a photo
      if (payload.receiptUrl) {
        photoUrl = payload.receiptUrl;
      }

      // Add approve/reject buttons if purchaseId is provided
      if (payload.purchaseId) {
        inlineKeyboard = {
          inline_keyboard: [
            [
              { text: '✅ Duyệt đơn', callback_data: `approve_coin_${payload.purchaseId}` },
              { text: '❌ Từ chối', callback_data: `reject_coin_${payload.purchaseId}` }
            ]
          ]
        };
      }
    } else if (payload.type === 'product_purchase' || payload.type === 'account_purchase') {
      const typeLabel = payload.type === 'product_purchase' ? 'SẢN PHẨM' : 'TÀI KHOẢN';
      message = `🛒 *MUA ${typeLabel}*\n\n` +
        `👤 Email: ${payload.userEmail}\n` +
        `📦 Sản phẩm: ${payload.productTitle || 'Không rõ'}\n` +
        `🪙 Số xu: ${payload.amount?.toLocaleString('vi-VN')} xu\n` +
        `🆔 Mã đơn: \`${payload.orderId?.slice(0, 8) || 'N/A'}\`\n` +
        `🕐 Thời gian: ${now}`;
    } else if (payload.type === 'seller_upload') {
      const itemTypeLabel = payload.itemType === 'product' ? 'SẢN PHẨM' : 'TÀI KHOẢN';
      message = `📤 *SELLER UPLOAD ${itemTypeLabel}*\n\n` +
        `👤 Seller: ${payload.sellerName || 'Không rõ'}\n` +
        `📧 Email: ${payload.userEmail || 'N/A'}\n` +
        `📦 Tên: ${payload.productTitle || 'Không rõ'}\n` +
        `🪙 Giá: ${payload.itemPrice?.toLocaleString('vi-VN') || 0} xu\n` +
        `🆔 ID: \`${payload.itemId?.slice(0, 8) || 'N/A'}\`\n` +
        `🕐 Thời gian: ${now}`;
    } else if (payload.type === 'seller_sale') {
      const itemTypeLabel = payload.itemType === 'product' ? 'SẢN PHẨM' : 'TÀI KHOẢN';
      message = `💸 *BÁN ${itemTypeLabel} THÀNH CÔNG!*\n\n` +
        `👤 Người mua: ${payload.buyerEmail || 'Ẩn danh'}\n` +
        `📦 Sản phẩm: ${payload.productTitle || 'Không rõ'}\n` +
        `💰 Xu nhận được: +${payload.coinsEarned?.toLocaleString('vi-VN') || 0} xu\n` +
        `📊 Phí hoa hồng: ${payload.commissionFee || 0} xu\n` +
        `🏦 Tổng thu nhập: ${payload.totalEarnings?.toLocaleString('vi-VN') || 0} xu\n` +
        `🆔 Mã đơn: \`${payload.orderId?.slice(0, 8) || 'N/A'}\`\n` +
        `🕐 Thời gian: ${now}`;
    } else if (payload.type === 'withdrawal_request') {
      message = `💳 *YÊU CẦU RÚT TIỀN*\n\n` +
        `👤 Seller: ${payload.sellerName || 'Không rõ'}\n` +
        `📧 Email: ${payload.userEmail || 'N/A'}\n` +
        `🪙 Số xu: ${payload.amount?.toLocaleString('vi-VN') || 0} xu\n` +
        `💵 Số tiền: ${((payload.amount || 0) * 1000).toLocaleString('vi-VN')} VNĐ\n\n` +
        `🏦 *THÔNG TIN NGÂN HÀNG:*\n` +
        `• Ngân hàng: ${payload.bankName || 'N/A'}\n` +
        `• Chủ TK: ${payload.bankAccountName || 'N/A'}\n` +
        `• STK: \`${payload.bankAccountNumber || 'N/A'}\`\n` +
        `🕐 Thời gian: ${now}`;
      
      // Send QR image if available
      if (payload.bankQrUrl) {
        photoUrl = payload.bankQrUrl;
      }

      // Add approve/reject buttons
      if (payload.withdrawalId) {
        inlineKeyboard = {
          inline_keyboard: [
            [
              { text: '✅ Duyệt rút tiền', callback_data: `approve_withdrawal_${payload.withdrawalId}` },
              { text: '❌ Từ chối', callback_data: `reject_withdrawal_${payload.withdrawalId}` }
            ]
          ]
        };
      }
    } else if (payload.type === 'bot_rental') {
      message = `🤖 *YÊU CẦU THUÊ BOT ZALO*\n\n` +
        `👤 Email: ${payload.userEmail || 'N/A'}\n` +
        `🤖 Bot: ${payload.botName || 'Không rõ'}\n` +
        `💵 Giá: ${payload.price?.toLocaleString('vi-VN') || 0} VNĐ\n` +
        `🕐 Thời gian: ${now}`;
      
      if (payload.receiptUrl) {
        photoUrl = payload.receiptUrl;
      }
    } else if (payload.type === 'new_post') {
      message = `📝 *BÀI VIẾT MỚI*\n\n` +
        `📌 Tiêu đề: *${payload.productTitle || 'Không rõ'}*\n` +
        `🕐 Thời gian: ${now}\n\n` +
        `👉 Xem ngay tại BonzShop!`;
      if (payload.receiptUrl) {
        photoUrl = payload.receiptUrl;
      }
    } else if (payload.type === 'new_product') {
      message = `🆕 *SẢN PHẨM MỚI*\n\n` +
        `📦 Tên: *${payload.productTitle || 'Không rõ'}*\n` +
        `🪙 Giá: ${payload.amount?.toLocaleString('vi-VN') || 0} xu\n` +
        `📂 Danh mục: ${payload.productType || 'Khác'}\n` +
        `🕐 Thời gian: ${now}\n\n` +
        `👉 Mua ngay tại BonzShop!`;
      if (payload.receiptUrl) {
        photoUrl = payload.receiptUrl;
      }
    } else if (payload.type === 'new_account') {
      message = `🆕 *TÀI KHOẢN MỚI*\n\n` +
        `📦 Tên: *${payload.productTitle || 'Không rõ'}*\n` +
        `🪙 Giá: ${payload.amount?.toLocaleString('vi-VN') || 0} xu\n` +
        `📂 Danh mục: ${payload.productType || 'Khác'}\n` +
        `🕐 Thời gian: ${now}\n\n` +
        `👉 Mua ngay tại BonzShop!`;
       if (payload.receiptUrl) {
        photoUrl = payload.receiptUrl;
      }
    } else if (payload.type === 'key_purchase') {
      message = `🔑 *MUA KEY*\n\n` +
        `👤 Email: ${payload.userEmail || 'N/A'}\n` +
        `📦 Key: ${payload.productTitle || 'Không rõ'}\n` +
        `🪙 Số xu: ${payload.amount?.toLocaleString('vi-VN') || 0} xu\n` +
        `🕐 Thời gian: ${now}`;
    } else if (payload.type === 'activation_order') {
      message = `📱 *ĐƠN KÍCH HOẠT MỚI*\n\n` +
        `👤 Email người mua: ${payload.userEmail || 'N/A'}\n` +
        `📦 Sản phẩm: ${payload.productTitle || 'Không rõ'}\n` +
        `📧 Email kích hoạt: \`${payload.activationEmail || 'N/A'}\`\n` +
        `🔑 MK Gmail: \`${payload.gmailPassword || 'N/A'}\`\n` +
        `⏱️ Số tháng: ${payload.months || 1}\n` +
        `🪙 Số xu: ${payload.amount?.toLocaleString('vi-VN') || 0} xu\n` +
        `🆔 Mã đơn: \`${payload.orderId?.slice(0, 8) || 'N/A'}\`\n` +
        `🕐 Thời gian: ${now}`;
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Loại thông báo không hợp lệ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send message to Telegram
    let telegramResult;

    if (photoUrl) {
      // Send photo with caption
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard || undefined,
        }),
      });
      telegramResult = await telegramResponse.json();
      console.log('Telegram photo response:', telegramResult);

      if (!telegramResponse.ok) {
        // If photo fails, try sending just text with link
        console.log('Photo send failed, trying text with link...');
        message += `\n\n📸 [Xem Bill](${photoUrl})`;
        const textResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
            reply_markup: inlineKeyboard || undefined,
          }),
        });
        telegramResult = await textResponse.json();
      }
    } else {
      // Send text message
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
          reply_markup: inlineKeyboard || undefined,
        }),
      });
      telegramResult = await telegramResponse.json();
      console.log('Telegram API response:', telegramResult);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Đã gửi thông báo Telegram', result: telegramResult }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Telegram notification error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
