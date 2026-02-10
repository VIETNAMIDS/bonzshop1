import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const update = await req.json();
    console.log('Telegram webhook received:', JSON.stringify(update).slice(0, 500));

    // Get bot token from settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['telegram_bot_token', 'telegram_chat_id']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach(s => {
      if (s.value) settingsMap[s.key] = s.value;
    });

    const botToken = settingsMap['telegram_bot_token'];
    const adminChatId = settingsMap['telegram_chat_id'];

    if (!botToken) {
      console.error('Bot token not configured');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle text message commands
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const photoArray = update.message.photo;

      // Only allow commands from admin chat
      if (adminChatId && chatId.toString() !== adminChatId.toString()) {
        await sendMessage(botToken, chatId, '⛔ Bạn không có quyền sử dụng bot này.');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // /help command
      if (text === '/help' || text === '/start') {
        const helpText = `🤖 *BONZSHOP TELEGRAM BOT*\n\n` +
          `📝 *Đăng bài viết:*\n` +
          `\`/post Tiêu đề | Nội dung\`\n\n` +
          `📦 *Thêm sản phẩm:*\n` +
          `\`/product Tên | Giá | Danh mục\`\n` +
          `\`/product Tên | Giá | Danh mục | Mô tả\`\n\n` +
          `👤 *Thêm tài khoản:*\n` +
          `\`/account Tên | Username | Password | Giá | Danh mục\`\n\n` +
          `📊 *Xem thống kê:*\n` +
          `\`/stats\`\n\n` +
          `📋 *Danh sách đơn chờ:*\n` +
          `\`/pending\`\n\n` +
          `💡 *Lưu ý:* Dùng dấu \`|\` để phân tách các trường.`;
        await sendMessage(botToken, chatId, helpText);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // /post command
      if (text.startsWith('/post ')) {
        const parts = text.replace('/post ', '').split('|').map((s: string) => s.trim());
        const postTitle = parts[0];
        const postContent = parts[1] || parts[0];

        if (!postTitle) {
          await sendMessage(botToken, chatId, '❌ Thiếu tiêu đề!\n\nCú pháp: `/post Tiêu đề | Nội dung`');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: newPost, error } = await supabase
          .from('posts')
          .insert({
            title: postTitle,
            content: postContent,
            is_published: true,
          })
          .select()
          .single();

        if (error) {
          await sendMessage(botToken, chatId, `❌ Lỗi tạo bài viết: ${error.message}`);
        } else {
          await sendMessage(botToken, chatId,
            `✅ *ĐÃ ĐĂNG BÀI VIẾT*\n\n` +
            `📌 Tiêu đề: *${postTitle}*\n` +
            `🆔 ID: \`${newPost.id.slice(0, 8)}\`\n` +
            `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // /product command
      if (text.startsWith('/product ')) {
        const parts = text.replace('/product ', '').split('|').map((s: string) => s.trim());
        const prodTitle = parts[0];
        const prodPrice = parseFloat(parts[1]) || 0;
        const prodCategory = parts[2] || 'other';
        const prodDesc = parts[3] || null;

        if (!prodTitle) {
          await sendMessage(botToken, chatId, '❌ Thiếu tên sản phẩm!\n\nCú pháp: `/product Tên | Giá | Danh mục | Mô tả`');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get admin's seller id
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1);
        
        let sellerId = null;
        if (adminUsers && adminUsers.length > 0) {
          const { data: sellerData } = await supabase
            .from('sellers')
            .select('id')
            .eq('user_id', adminUsers[0].user_id)
            .maybeSingle();
          sellerId = sellerData?.id || null;
        }

        const { data: newProduct, error } = await supabase
          .from('products')
          .insert({
            title: prodTitle,
            price: prodPrice,
            category: prodCategory,
            description: prodDesc,
            is_free: prodPrice === 0,
            created_by: adminUsers?.[0]?.user_id || null,
            seller_id: sellerId,
          })
          .select()
          .single();

        if (error) {
          await sendMessage(botToken, chatId, `❌ Lỗi tạo sản phẩm: ${error.message}`);
        } else {
          await sendMessage(botToken, chatId,
            `✅ *ĐÃ THÊM SẢN PHẨM*\n\n` +
            `📦 Tên: *${prodTitle}*\n` +
            `🪙 Giá: ${prodPrice.toLocaleString('vi-VN')} xu\n` +
            `📂 Danh mục: ${prodCategory}\n` +
            `🆔 ID: \`${newProduct.id.slice(0, 8)}\`\n` +
            `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // /account command
      if (text.startsWith('/account ')) {
        const parts = text.replace('/account ', '').split('|').map((s: string) => s.trim());
        const accTitle = parts[0];
        const accUsername = parts[1] || '';
        const accPassword = parts[2] || '';
        const accPrice = parseFloat(parts[3]) || 0;
        const accCategory = parts[4] || 'other';

        if (!accTitle || !accUsername || !accPassword) {
          await sendMessage(botToken, chatId, '❌ Thiếu thông tin!\n\nCú pháp: `/account Tên | Username | Password | Giá | Danh mục`');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get admin's seller id
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1);
        
        let sellerId = null;
        if (adminUsers && adminUsers.length > 0) {
          const { data: sellerData } = await supabase
            .from('sellers')
            .select('id')
            .eq('user_id', adminUsers[0].user_id)
            .maybeSingle();
          sellerId = sellerData?.id || null;
        }

        if (!sellerId) {
          await sendMessage(botToken, chatId, '❌ Không tìm thấy seller profile cho admin. Hãy tạo seller profile trước.');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: newAccount, error } = await supabase
          .from('accounts')
          .insert({
            title: accTitle,
            account_username: accUsername,
            account_password: accPassword,
            price: accPrice,
            category: accCategory,
            platform: accCategory,
            account_type: 'standard',
            is_free: accPrice === 0,
            created_by: adminUsers?.[0]?.user_id || null,
            seller_id: sellerId,
          })
          .select()
          .single();

        if (error) {
          await sendMessage(botToken, chatId, `❌ Lỗi tạo tài khoản: ${error.message}`);
        } else {
          await sendMessage(botToken, chatId,
            `✅ *ĐÃ THÊM TÀI KHOẢN*\n\n` +
            `📦 Tên: *${accTitle}*\n` +
            `👤 Username: \`${accUsername}\`\n` +
            `🪙 Giá: ${accPrice.toLocaleString('vi-VN')} xu\n` +
            `📂 Danh mục: ${accCategory}\n` +
            `🆔 ID: \`${newAccount.id.slice(0, 8)}\`\n` +
            `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // /stats command
      if (text === '/stats') {
        const [
          { count: totalUsers },
          { count: totalProducts },
          { count: totalAccounts },
          { count: totalOrders },
          { count: pendingCoins },
          { count: totalPosts },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_sold', false),
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          supabase.from('coin_purchases').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_published', true),
        ]);

        await sendMessage(botToken, chatId,
          `📊 *THỐNG KÊ BONZSHOP*\n\n` +
          `👥 Thành viên: ${totalUsers || 0}\n` +
          `📦 Sản phẩm: ${totalProducts || 0}\n` +
          `👤 TK còn hàng: ${totalAccounts || 0}\n` +
          `🛒 Đơn hàng: ${totalOrders || 0}\n` +
          `📝 Bài viết: ${totalPosts || 0}\n` +
          `⏳ Đơn nạp chờ: ${pendingCoins || 0}\n\n` +
          `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // /pending command
      if (text === '/pending') {
        const { data: pendingPurchases } = await supabase
          .from('coin_purchases')
          .select('id, amount, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: pendingWithdrawals } = await supabase
          .from('withdrawal_requests')
          .select('id, amount, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);

        let msg = `📋 *ĐƠN CHỜ XỬ LÝ*\n\n`;
        
        msg += `💰 *Nạp xu (${pendingPurchases?.length || 0}):*\n`;
        if (pendingPurchases && pendingPurchases.length > 0) {
          pendingPurchases.forEach(p => {
            msg += `• ${p.amount.toLocaleString('vi-VN')} xu - \`${p.id.slice(0, 8)}\`\n`;
          });
        } else {
          msg += `Không có đơn chờ\n`;
        }

        msg += `\n💳 *Rút tiền (${pendingWithdrawals?.length || 0}):*\n`;
        if (pendingWithdrawals && pendingWithdrawals.length > 0) {
          pendingWithdrawals.forEach(w => {
            msg += `• ${w.amount.toLocaleString('vi-VN')} xu - \`${w.id.slice(0, 8)}\`\n`;
          });
        } else {
          msg += `Không có đơn chờ\n`;
        }

        await sendMessage(botToken, chatId, msg);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Unknown command
      if (text.startsWith('/')) {
        await sendMessage(botToken, chatId, '❓ Lệnh không hợp lệ. Gõ `/help` để xem hướng dẫn.');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle photo messages with caption commands
    if (update.message?.photo && update.message?.caption) {
      const chatId = update.message.chat.id;
      const caption = update.message.caption.trim();
      const photos = update.message.photo;
      const largestPhoto = photos[photos.length - 1];

      // Only allow from admin chat
      if (adminChatId && chatId.toString() !== adminChatId.toString()) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get photo URL from Telegram
      const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${largestPhoto.file_id}`);
      const fileData = await fileResponse.json();
      const photoUrl = fileData.ok ? `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}` : null;

      // /post with photo
      if (caption.startsWith('/post ')) {
        const parts = caption.replace('/post ', '').split('|').map((s: string) => s.trim());
        const postTitle = parts[0];
        const postContent = parts[1] || parts[0];

        const { data: newPost, error } = await supabase
          .from('posts')
          .insert({
            title: postTitle,
            content: postContent,
            image_url: photoUrl,
            is_published: true,
          })
          .select()
          .single();

        if (error) {
          await sendMessage(botToken, chatId, `❌ Lỗi: ${error.message}`);
        } else {
          await sendMessage(botToken, chatId,
            `✅ *ĐÃ ĐĂNG BÀI VIẾT KÈM ẢNH*\n\n` +
            `📌 Tiêu đề: *${postTitle}*\n` +
            `🖼️ Có ảnh bìa\n` +
            `🆔 ID: \`${newPost.id.slice(0, 8)}\``
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // /product with photo
      if (caption.startsWith('/product ')) {
        const parts = caption.replace('/product ', '').split('|').map((s: string) => s.trim());
        const prodTitle = parts[0];
        const prodPrice = parseFloat(parts[1]) || 0;
        const prodCategory = parts[2] || 'other';

        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1);
        
        let sellerId = null;
        if (adminUsers && adminUsers.length > 0) {
          const { data: sellerData } = await supabase
            .from('sellers')
            .select('id')
            .eq('user_id', adminUsers[0].user_id)
            .maybeSingle();
          sellerId = sellerData?.id || null;
        }

        const { data: newProduct, error } = await supabase
          .from('products')
          .insert({
            title: prodTitle,
            price: prodPrice,
            category: prodCategory,
            image_url: photoUrl,
            is_free: prodPrice === 0,
            created_by: adminUsers?.[0]?.user_id || null,
            seller_id: sellerId,
          })
          .select()
          .single();

        if (error) {
          await sendMessage(botToken, chatId, `❌ Lỗi: ${error.message}`);
        } else {
          await sendMessage(botToken, chatId,
            `✅ *ĐÃ THÊM SẢN PHẨM KÈM ẢNH*\n\n` +
            `📦 *${prodTitle}*\n` +
            `🪙 ${prodPrice.toLocaleString('vi-VN')} xu | 📂 ${prodCategory}\n` +
            `🆔 \`${newProduct.id.slice(0, 8)}\``
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle callback query (button press)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;
      const chatId = callbackQuery.message?.chat?.id;
      const messageId = callbackQuery.message?.message_id;

      console.log('Callback data:', callbackData);

      // Answer callback query to remove loading state
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
        }),
      });

      // Parse callback data
      if (callbackData.startsWith('approve_coin_')) {
        const purchaseId = callbackData.replace('approve_coin_', '');
        console.log('Approving coin purchase:', purchaseId);

        const { data: purchase, error: purchaseError } = await supabase
          .from('coin_purchases')
          .select('*')
          .eq('id', purchaseId)
          .single();

        if (purchaseError || !purchase) {
          await editMessage(botToken, chatId, messageId, '❌ Không tìm thấy đơn nạp xu này!');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (purchase.status !== 'pending') {
          await editMessage(botToken, chatId, messageId, `⚠️ Đơn này đã được xử lý trước đó (${purchase.status})`);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error: updateError } = await supabase
          .from('coin_purchases')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            admin_note: 'Duyệt qua Telegram Bot'
          })
          .eq('id', purchaseId);

        if (updateError) {
          await editMessage(botToken, chatId, messageId, '❌ Lỗi khi duyệt đơn: ' + updateError.message);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: userCoins } = await supabase
          .from('user_coins')
          .select('id, balance')
          .eq('user_id', purchase.user_id)
          .single();

        if (userCoins) {
          await supabase
            .from('user_coins')
            .update({ balance: userCoins.balance + purchase.amount })
            .eq('id', userCoins.id);
        } else {
          await supabase
            .from('user_coins')
            .insert({ user_id: purchase.user_id, balance: purchase.amount });
        }

        await supabase.from('notifications').insert({
          user_id: purchase.user_id,
          title: '✅ Nạp xu thành công!',
          message: `Bạn đã được cộng ${purchase.amount.toLocaleString('vi-VN')} xu vào tài khoản.`,
          type: 'coin_approved',
          reference_id: purchaseId
        });

        await editMessage(botToken, chatId, messageId,
          `✅ *ĐÃ DUYỆT*\n\n🪙 Đã cộng ${purchase.amount.toLocaleString('vi-VN')} xu.\n🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
        );

      } else if (callbackData.startsWith('reject_coin_')) {
        const purchaseId = callbackData.replace('reject_coin_', '');

        const { data: purchase } = await supabase
          .from('coin_purchases')
          .select('*')
          .eq('id', purchaseId)
          .single();

        if (!purchase || purchase.status !== 'pending') {
          await editMessage(botToken, chatId, messageId, purchase ? `⚠️ Đã xử lý (${purchase.status})` : '❌ Không tìm thấy!');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await supabase
          .from('coin_purchases')
          .update({ status: 'rejected', admin_note: 'Từ chối qua Telegram Bot' })
          .eq('id', purchaseId);

        await supabase.from('notifications').insert({
          user_id: purchase.user_id,
          title: '❌ Yêu cầu nạp xu bị từ chối',
          message: `Yêu cầu nạp ${purchase.amount.toLocaleString('vi-VN')} xu đã bị từ chối.`,
          type: 'coin_rejected',
          reference_id: purchaseId
        });

        await editMessage(botToken, chatId, messageId,
          `❌ *ĐÃ TỪ CHỐI*\n\nĐơn nạp ${purchase.amount.toLocaleString('vi-VN')} xu.\n🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
        );

      } else if (callbackData.startsWith('approve_withdrawal_')) {
        const withdrawalId = callbackData.replace('approve_withdrawal_', '');

        const { data: withdrawal, error: withdrawalError } = await supabase
          .from('withdrawal_requests')
          .select('*, sellers(user_id, display_name)')
          .eq('id', withdrawalId)
          .single();

        if (withdrawalError || !withdrawal || withdrawal.status !== 'pending') {
          await editMessage(botToken, chatId, messageId, withdrawal ? `⚠️ Đã xử lý (${withdrawal.status})` : '❌ Không tìm thấy!');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await supabase
          .from('withdrawal_requests')
          .update({ status: 'approved', processed_at: new Date().toISOString(), admin_note: 'Duyệt qua Telegram Bot' })
          .eq('id', withdrawalId);

        const { data: sellerCoins } = await supabase
          .from('seller_coins')
          .select('id, balance')
          .eq('seller_id', withdrawal.seller_id)
          .single();

        if (sellerCoins) {
          await supabase
            .from('seller_coins')
            .update({ balance: Math.max(0, sellerCoins.balance - withdrawal.amount) })
            .eq('id', sellerCoins.id);
        }

        const sellerUserId = (withdrawal.sellers as any)?.user_id;
        if (sellerUserId) {
          await supabase.from('notifications').insert({
            user_id: sellerUserId,
            title: '✅ Rút tiền thành công!',
            message: `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')} xu đã được duyệt.`,
            type: 'withdrawal_approved',
            reference_id: withdrawalId
          });
        }

        await editMessage(botToken, chatId, messageId,
          `✅ *ĐÃ DUYỆT RÚT TIỀN*\n\n🪙 ${withdrawal.amount.toLocaleString('vi-VN')} xu\n💵 ${(withdrawal.amount * 1000).toLocaleString('vi-VN')} VNĐ\n🏦 ${withdrawal.bank_name} - ${withdrawal.bank_account_number}\n🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
        );

      } else if (callbackData.startsWith('reject_withdrawal_')) {
        const withdrawalId = callbackData.replace('reject_withdrawal_', '');

        const { data: withdrawal } = await supabase
          .from('withdrawal_requests')
          .select('*, sellers(user_id, display_name)')
          .eq('id', withdrawalId)
          .single();

        if (!withdrawal || withdrawal.status !== 'pending') {
          await editMessage(botToken, chatId, messageId, withdrawal ? `⚠️ Đã xử lý (${withdrawal.status})` : '❌ Không tìm thấy!');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await supabase
          .from('withdrawal_requests')
          .update({ status: 'rejected', processed_at: new Date().toISOString(), admin_note: 'Từ chối qua Telegram Bot' })
          .eq('id', withdrawalId);

        const sellerUserId = (withdrawal.sellers as any)?.user_id;
        if (sellerUserId) {
          await supabase.from('notifications').insert({
            user_id: sellerUserId,
            title: '❌ Yêu cầu rút tiền bị từ chối',
            message: `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')} xu đã bị từ chối.`,
            type: 'withdrawal_rejected',
            reference_id: withdrawalId
          });
        }

        await editMessage(botToken, chatId, messageId,
          `❌ *ĐÃ TỪ CHỐI RÚT TIỀN*\n\n🪙 ${withdrawal.amount.toLocaleString('vi-VN')} xu\n📝 Xu không bị trừ\n🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Telegram webhook error:', error);
    // Always return 200 to Telegram to prevent retries
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendMessage(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });
}

async function editMessage(botToken: string, chatId: number, messageId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption: text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (e) {
    // Try editing as text message instead
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (e2) {
      console.error('Failed to edit message:', e2);
    }
  }
}
