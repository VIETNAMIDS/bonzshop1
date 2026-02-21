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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Invalid token:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    const { accountId, productId, requiredCoins, discountCodeId, discountAmount } = await req.json();
    console.log('Purchase request:', { accountId, productId, requiredCoins, discountCodeId, discountAmount });

    // Validate required coins
    if (!requiredCoins || requiredCoins <= 0 || !Number.isInteger(requiredCoins)) {
      return new Response(
        JSON.stringify({ error: 'Số xu không hợp lệ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accountId && !productId) {
      return new Response(
        JSON.stringify({ error: 'Phải có accountId hoặc productId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user coin balance
    const { data: coinData, error: coinError } = await supabase
      .from('user_coins')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (coinError || !coinData) {
      console.error('Coin balance not found:', coinError);
      return new Response(
        JSON.stringify({ error: 'Không tìm thấy số dư xu' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Current balance:', coinData.balance, 'Required:', requiredCoins);

    // Validate sufficient balance (server-side check)
    if (coinData.balance < requiredCoins) {
      return new Response(
        JSON.stringify({ error: 'Không đủ xu', balance: coinData.balance }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify item exists and price matches
    let itemPrice = 0;
    let sellerId: string | null = null;

    if (accountId) {
      const { data: account, error: accError } = await supabase
        .from('accounts')
        .select('price, is_sold, is_free, seller_id')
        .eq('id', accountId)
        .single();

      if (accError || !account) {
        console.error('Account not found:', accError);
        return new Response(
          JSON.stringify({ error: 'Không tìm thấy tài khoản' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (account.is_sold) {
        return new Response(
          JSON.stringify({ error: 'Tài khoản đã được bán' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (account.is_free) {
        return new Response(
          JSON.stringify({ error: 'Tài khoản miễn phí không cần mua bằng xu' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate expected coin price (price / 1000, rounded up)
      itemPrice = Math.ceil(Number(account.price) / 1000);
      sellerId = account.seller_id;

      if (requiredCoins < itemPrice) {
        console.error('Price mismatch:', requiredCoins, 'vs', itemPrice);
        return new Response(
          JSON.stringify({ error: 'Số xu không khớp với giá sản phẩm', expectedPrice: itemPrice }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (productId) {
      const { data: product, error: prodError } = await supabase
        .from('products')
        .select('price, is_free, seller_id')
        .eq('id', productId)
        .single();

      if (prodError || !product) {
        console.error('Product not found:', prodError);
        return new Response(
          JSON.stringify({ error: 'Không tìm thấy sản phẩm' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (product.is_free) {
        return new Response(
          JSON.stringify({ error: 'Sản phẩm miễn phí không cần mua bằng xu' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      itemPrice = Math.ceil(Number(product.price) / 1000);
      sellerId = product.seller_id;

      if (requiredCoins < itemPrice) {
        console.error('Price mismatch:', requiredCoins, 'vs', itemPrice);
        return new Response(
          JSON.stringify({ error: 'Số xu không khớp với giá sản phẩm', expectedPrice: itemPrice }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Perform atomic balance update with optimistic locking
    const newBalance = coinData.balance - requiredCoins;
    const { error: updateError, data: updatedCoin } = await supabase
      .from('user_coins')
      .update({ 
        balance: newBalance, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', coinData.id)
      .eq('balance', coinData.balance) // Optimistic locking - ensures balance hasn't changed
      .select()
      .single();

    if (updateError || !updatedCoin) {
      console.error('Failed to update balance (race condition?):', updateError);
      return new Response(
        JSON.stringify({ error: 'Không thể cập nhật số dư. Vui lòng thử lại.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Balance updated successfully:', coinData.balance, '->', newBalance);

    // Create approved order
    const orderData = {
      user_id: user.id,
      buyer_id: user.id,
      account_id: accountId || null,
      product_id: productId || null,
      amount: requiredCoins,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      order_type: 'coin_purchase',
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      // Rollback balance
      await supabase
        .from('user_coins')
        .update({ balance: coinData.balance })
        .eq('id', coinData.id);
      
      return new Response(
        JSON.stringify({ error: 'Không thể tạo đơn hàng. Số dư đã được hoàn lại.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created:', order.id);

    // Handle discount code usage - record use and delete the code (single-use)
    if (discountCodeId && user.id) {
      try {
        // Record usage
        await supabase.from('discount_code_uses').insert({
          code_id: discountCodeId,
          user_id: user.id,
          order_id: order.id
        });
        console.log('Discount code use recorded:', discountCodeId);

        // Delete the discount code (single-use codes)
        const { error: deleteError } = await supabase
          .from('discount_codes')
          .delete()
          .eq('id', discountCodeId);
        
        if (deleteError) {
          console.error('Failed to delete discount code:', deleteError);
        } else {
          console.log('Discount code deleted (single-use):', discountCodeId);
        }
      } catch (discountError) {
        console.error('Error processing discount code:', discountError);
        // Don't fail the purchase if discount recording fails
      }
    }

    // Mark account as sold if applicable (skip for activation/requires_buyer_email accounts)
    if (accountId) {
      const { data: accountInfo } = await supabase
        .from('accounts')
        .select('requires_buyer_email')
        .eq('id', accountId)
        .single();

      if (!accountInfo?.requires_buyer_email) {
        const { error: soldError } = await supabase
          .from('accounts')
          .update({
            is_sold: true,
            sold_to: user.id,
            sold_at: new Date().toISOString()
          })
          .eq('id', accountId);

        if (soldError) {
          console.error('Failed to mark account as sold:', soldError);
        }
      }
    }

    // Add coins to seller if applicable (with fixed commission fee deduction)
    let sellerReceives = 0;
    let commissionFee = 0;
    let newTotalEarnings = 0;
    let sellerUserId: string | null = null;

    if (sellerId) {
      // Fixed commission system based on sale amount tiers
      // Example: 10 xu sale = 3 xu fee, seller gets 7 xu
      //          20 xu sale = 5 xu fee, seller gets 15 xu
      if (requiredCoins >= 100) {
        commissionFee = 10; // 100+ xu: fixed 10 xu fee
      } else if (requiredCoins >= 50) {
        commissionFee = 7; // 50-99 xu: fixed 7 xu fee
      } else if (requiredCoins >= 20) {
        commissionFee = 5; // 20-49 xu: fixed 5 xu fee
      } else if (requiredCoins >= 10) {
        commissionFee = 3; // 10-19 xu: fixed 3 xu fee
      } else {
        commissionFee = 1; // 1-9 xu: fixed 1 xu fee
      }
      
      sellerReceives = requiredCoins - commissionFee;
      
      console.log(`Fixed Commission: ${commissionFee} xu fee (from ${requiredCoins} xu sale), Seller receives: ${sellerReceives} xu`);

      // Get seller info for notifications
      const { data: sellerInfo } = await supabase
        .from('sellers')
        .select('user_id, display_name')
        .eq('id', sellerId)
        .single();
      
      sellerUserId = sellerInfo?.user_id || null;

      const { data: existingSellerCoins } = await supabase
        .from('seller_coins')
        .select('id, balance, total_earned')
        .eq('seller_id', sellerId)
        .single();

      if (existingSellerCoins) {
        newTotalEarnings = existingSellerCoins.total_earned + sellerReceives;
        await supabase
          .from('seller_coins')
          .update({ 
            balance: existingSellerCoins.balance + sellerReceives,
            total_earned: newTotalEarnings
          })
          .eq('id', existingSellerCoins.id);
        console.log('Added', sellerReceives, 'coins to seller', sellerId, '(after', commissionFee, 'xu fee)');
      } else {
        newTotalEarnings = sellerReceives;
        await supabase
          .from('seller_coins')
          .insert({
            seller_id: sellerId,
            balance: sellerReceives,
            total_earned: sellerReceives
          });
        console.log('Created seller coins record with', sellerReceives, 'coins (after', commissionFee, 'xu fee)');
      }

      // Create in-app notification for seller
      if (sellerUserId) {
        await supabase.from('notifications').insert({
          user_id: sellerUserId,
          title: '💰 Bán hàng thành công!',
          message: `Bạn đã bán "${productId ? 'sản phẩm' : 'tài khoản'}" và nhận được +${sellerReceives} xu (trừ ${commissionFee} xu phí). Tổng thu nhập: ${newTotalEarnings} xu.`,
          type: 'seller_sale',
          reference_id: order.id
        });
        console.log('In-app notification created for seller:', sellerUserId);
      }
    }

    // Get user email and send purchase notification
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(user.id);
      
      // Get product/account title
      let productTitle = 'Sản phẩm';
      let productType: 'account' | 'product' = 'product';
      
      if (accountId) {
        const { data: acc } = await supabase.from('accounts').select('title').eq('id', accountId).single();
        productTitle = acc?.title || 'Tài khoản';
        productType = 'account';
      } else if (productId) {
        const { data: prod } = await supabase.from('products').select('title').eq('id', productId).single();
        productTitle = prod?.title || 'Sản phẩm';
        productType = 'product';
      }

       // Log to coin_history
       await supabase.from('coin_history').insert({
         user_id: user.id,
         amount: -requiredCoins,
         type: 'account_purchase',
         description: `Mua "${productTitle}"`,
         reference_id: order.id
       });
       console.log('Coin history logged for user:', user.id);
 
      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '🎉 Mua hàng thành công!',
        message: `Bạn đã mua "${productTitle}" với ${requiredCoins} xu. Vào "Đơn hàng của tôi" để xem chi tiết.`,
        type: 'purchase',
        reference_id: order.id
      });
      console.log('In-app notification created for user:', user.id);

      // Send email notification
      if (userData?.user?.email) {
        const notificationUrl = `${supabaseUrl}/functions/v1/send-purchase-notification`;
        await fetch(notificationUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: userData.user.email,
            userName: userData.user.user_metadata?.display_name || '',
            productTitle,
            productType,
            amount: requiredCoins,
            orderId: order.id
          })
        });
        console.log('Purchase notification email sent to:', userData.user.email);

        // Send Telegram notification to admin
        const telegramUrl = `${supabaseUrl}/functions/v1/send-telegram-notification`;
        await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: productType === 'account' ? 'account_purchase' : 'product_purchase',
            userEmail: userData.user.email,
            productTitle,
            amount: requiredCoins,
            orderId: order.id
          })
        });
        console.log('Purchase Telegram notification sent to admin');

        // Send Telegram notification to seller if they earned coins
        if (sellerId && sellerReceives > 0) {
          await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'seller_sale',
              itemType: productType,
              buyerEmail: userData.user.email,
              productTitle,
              coinsEarned: sellerReceives,
              commissionFee,
              totalEarnings: newTotalEarnings,
              orderId: order.id
            })
          });
          console.log('Seller sale Telegram notification sent');
        }
      }
    } catch (notifError) {
      console.error('Failed to send purchase notification:', notifError);
      // Don't fail the purchase if notification fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        order, 
        newBalance,
        message: 'Mua hàng thành công!' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Purchase error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
