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
    console.log('Telegram webhook received:', JSON.stringify(update));

    // Handle callback query (button press)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;
      const chatId = callbackQuery.message?.chat?.id;
      const messageId = callbackQuery.message?.message_id;

      console.log('Callback data:', callbackData);

      // Get bot token from settings
      const { data: settings } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['telegram_bot_token']);

      const settingsMap: Record<string, string> = {};
      settings?.forEach(s => {
        if (s.value) settingsMap[s.key] = s.value;
      });

      const botToken = settingsMap['telegram_bot_token'];
      if (!botToken) {
        console.error('Bot token not configured');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

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

        // Get purchase info
        const { data: purchase, error: purchaseError } = await supabase
          .from('coin_purchases')
          .select('*')
          .eq('id', purchaseId)
          .single();

        if (purchaseError || !purchase) {
          console.error('Purchase not found:', purchaseError);
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

        // Approve the purchase
        const { error: updateError } = await supabase
          .from('coin_purchases')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            admin_note: 'Duyệt qua Telegram Bot'
          })
          .eq('id', purchaseId);

        if (updateError) {
          console.error('Failed to approve:', updateError);
          await editMessage(botToken, chatId, messageId, '❌ Lỗi khi duyệt đơn: ' + updateError.message);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Add coins to user
        const { data: userCoins, error: coinsError } = await supabase
          .from('user_coins')
          .select('id, balance')
          .eq('user_id', purchase.user_id)
          .single();

        if (userCoins) {
          await supabase
            .from('user_coins')
            .update({ balance: userCoins.balance + purchase.amount })
            .eq('id', userCoins.id);
          console.log('Added', purchase.amount, 'coins to user', purchase.user_id);
        } else {
          // Create new coin record
          await supabase
            .from('user_coins')
            .insert({ user_id: purchase.user_id, balance: purchase.amount });
          console.log('Created new coin record with', purchase.amount, 'coins');
        }

        // Create notification for user
        await supabase.from('notifications').insert({
          user_id: purchase.user_id,
          title: '✅ Nạp xu thành công!',
          message: `Bạn đã được cộng ${purchase.amount.toLocaleString('vi-VN')} xu vào tài khoản.`,
          type: 'coin_approved',
          reference_id: purchaseId
        });

        // Update telegram message
        const successMessage = `✅ *ĐÃ DUYỆT*\n\n` +
          `🪙 Đã cộng ${purchase.amount.toLocaleString('vi-VN')} xu cho người dùng.\n` +
          `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
        
        await editMessage(botToken, chatId, messageId, successMessage);

      } else if (callbackData.startsWith('reject_coin_')) {
        const purchaseId = callbackData.replace('reject_coin_', '');
        console.log('Rejecting coin purchase:', purchaseId);

        // Get purchase info
        const { data: purchase } = await supabase
          .from('coin_purchases')
          .select('*')
          .eq('id', purchaseId)
          .single();

        if (!purchase) {
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

        // Reject the purchase
        await supabase
          .from('coin_purchases')
          .update({
            status: 'rejected',
            admin_note: 'Từ chối qua Telegram Bot'
          })
          .eq('id', purchaseId);

        // Create notification for user
        await supabase.from('notifications').insert({
          user_id: purchase.user_id,
          title: '❌ Yêu cầu nạp xu bị từ chối',
          message: `Yêu cầu nạp ${purchase.amount.toLocaleString('vi-VN')} xu đã bị từ chối. Vui lòng liên hệ Admin để biết thêm chi tiết.`,
          type: 'coin_rejected',
          reference_id: purchaseId
        });

        const rejectMessage = `❌ *ĐÃ TỪ CHỐI*\n\n` +
          `Đơn nạp ${purchase.amount.toLocaleString('vi-VN')} xu đã bị từ chối.\n` +
          `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
        
        await editMessage(botToken, chatId, messageId, rejectMessage);

      } else if (callbackData.startsWith('approve_withdrawal_')) {
        const withdrawalId = callbackData.replace('approve_withdrawal_', '');
        console.log('Approving withdrawal:', withdrawalId);

        // Get withdrawal info
        const { data: withdrawal, error: withdrawalError } = await supabase
          .from('withdrawal_requests')
          .select('*, sellers(user_id, display_name)')
          .eq('id', withdrawalId)
          .single();

        if (withdrawalError || !withdrawal) {
          console.error('Withdrawal not found:', withdrawalError);
          await editMessage(botToken, chatId, messageId, '❌ Không tìm thấy yêu cầu rút tiền này!');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (withdrawal.status !== 'pending') {
          await editMessage(botToken, chatId, messageId, `⚠️ Yêu cầu này đã được xử lý trước đó (${withdrawal.status})`);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Approve the withdrawal
        const { error: updateError } = await supabase
          .from('withdrawal_requests')
          .update({
            status: 'approved',
            processed_at: new Date().toISOString(),
            admin_note: 'Duyệt qua Telegram Bot'
          })
          .eq('id', withdrawalId);

        if (updateError) {
          console.error('Failed to approve withdrawal:', updateError);
          await editMessage(botToken, chatId, messageId, '❌ Lỗi khi duyệt: ' + updateError.message);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Deduct coins from seller balance when approved
        const { data: sellerCoins } = await supabase
          .from('seller_coins')
          .select('id, balance')
          .eq('seller_id', withdrawal.seller_id)
          .single();

        if (sellerCoins) {
          const newBalance = sellerCoins.balance - withdrawal.amount;
          await supabase
            .from('seller_coins')
            .update({ balance: Math.max(0, newBalance) })
            .eq('id', sellerCoins.id);
          console.log('Deducted', withdrawal.amount, 'coins from seller', withdrawal.seller_id, 'New balance:', newBalance);
        }

        // Get seller's user_id for notification
        const sellerUserId = (withdrawal.sellers as any)?.user_id;
        if (sellerUserId) {
          await supabase.from('notifications').insert({
            user_id: sellerUserId,
            title: '✅ Rút tiền thành công!',
            message: `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')} xu đã được duyệt. Tiền sẽ được chuyển vào tài khoản của bạn.`,
            type: 'withdrawal_approved',
            reference_id: withdrawalId
          });
        }

        const successMessage = `✅ *ĐÃ DUYỆT RÚT TIỀN*\n\n` +
          `🪙 Số xu: ${withdrawal.amount.toLocaleString('vi-VN')} xu\n` +
          `💵 Số tiền: ${(withdrawal.amount * 1000).toLocaleString('vi-VN')} VNĐ\n` +
          `🏦 ${withdrawal.bank_name} - ${withdrawal.bank_account_number}\n` +
          `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
        
        await editMessage(botToken, chatId, messageId, successMessage);

      } else if (callbackData.startsWith('reject_withdrawal_')) {
        const withdrawalId = callbackData.replace('reject_withdrawal_', '');
        console.log('Rejecting withdrawal:', withdrawalId);

        // Get withdrawal info
        const { data: withdrawal } = await supabase
          .from('withdrawal_requests')
          .select('*, sellers(user_id, display_name)')
          .eq('id', withdrawalId)
          .single();

        if (!withdrawal) {
          await editMessage(botToken, chatId, messageId, '❌ Không tìm thấy yêu cầu rút tiền này!');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (withdrawal.status !== 'pending') {
          await editMessage(botToken, chatId, messageId, `⚠️ Yêu cầu này đã được xử lý trước đó (${withdrawal.status})`);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Reject the withdrawal (no need to refund since coins weren't deducted yet)
        await supabase
          .from('withdrawal_requests')
          .update({
            status: 'rejected',
            processed_at: new Date().toISOString(),
            admin_note: 'Từ chối qua Telegram Bot'
          })
          .eq('id', withdrawalId);

        // Notify seller
        const sellerUserId = (withdrawal.sellers as any)?.user_id;
        if (sellerUserId) {
          await supabase.from('notifications').insert({
            user_id: sellerUserId,
            title: '❌ Yêu cầu rút tiền bị từ chối',
            message: `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')} xu đã bị từ chối. Vui lòng liên hệ Admin để biết thêm chi tiết.`,
            type: 'withdrawal_rejected',
            reference_id: withdrawalId
          });
        }

        const rejectMessage = `❌ *ĐÃ TỪ CHỐI RÚT TIỀN*\n\n` +
          `🪙 Số xu: ${withdrawal.amount.toLocaleString('vi-VN')} xu\n` +
          `📝 Xu không bị trừ (chưa duyệt)\n` +
          `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
        
        await editMessage(botToken, chatId, messageId, rejectMessage);
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
