import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Expected: /public-api/v1/{resource}[/{id}]
  // pathParts after edge function routing: v1, resource, [id]

  const apiKey = req.headers.get('x-api-key');

  // Parse body for POST/PUT
  let body: Record<string, unknown> = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try { body = await req.json(); } catch { body = {}; }
  }

  // Extract endpoint info from search params or body
  const endpoint = body.endpoint as string || url.searchParams.get('endpoint') || '';
  const params = (body.params as Record<string, unknown>) || {};

  // For simple REST-like usage: ?endpoint=products.list&limit=10
  // Or POST { endpoint: "products.list", params: { limit: 10 } }

  const startTime = Date.now();
  let statusCode = 200;

  try {
    // Validate API key
    if (!apiKey) {
      statusCode = 401;
      return jsonResponse({ error: 'Missing x-api-key header', code: 'MISSING_API_KEY' }, statusCode);
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      statusCode = 401;
      return jsonResponse({ error: 'Invalid or inactive API key', code: 'INVALID_API_KEY' }, statusCode);
    }

    // Rate limit check
    if (keyData.requests_today >= keyData.rate_limit) {
      statusCode = 429;
      return jsonResponse({ error: 'Rate limit exceeded. Try again tomorrow.', code: 'RATE_LIMITED', limit: keyData.rate_limit }, statusCode);
    }

    // Update usage
    await supabase
      .from('api_keys')
      .update({
        requests_today: keyData.requests_today + 1,
        requests_total: keyData.requests_total + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', keyData.id);

    // Route to handler
    const result = await handleEndpoint(supabase, endpoint, params, url.searchParams);
    statusCode = result.status;

    // Log request
    const responseTime = Date.now() - startTime;
    await supabase.from('api_request_logs').insert({
      api_key_id: keyData.id,
      endpoint,
      method: req.method,
      status_code: statusCode,
      response_time_ms: responseTime,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    });

    return jsonResponse(result.data, statusCode);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('API Error:', message);
    statusCode = 500;
    return jsonResponse({ error: message, code: 'INTERNAL_ERROR' }, statusCode);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleEndpoint(
  supabase: ReturnType<typeof createClient>,
  endpoint: string,
  params: Record<string, unknown>,
  searchParams: URLSearchParams,
): Promise<{ data: unknown; status: number }> {
  const limit = Number(params.limit || searchParams.get('limit') || 20);
  const offset = Number(params.offset || searchParams.get('offset') || 0);
  const id = (params.id || searchParams.get('id')) as string;

  switch (endpoint) {
    // ===== PRODUCTS =====
    case 'products.list': {
      const category = (params.category || searchParams.get('category')) as string;
      const search = (params.search || searchParams.get('search')) as string;
      let query = supabase
        .from('products')
        .select('id, title, description, price, original_price, category, image_url, tech_stack, is_free, badge, rating, sales, created_at', { count: 'exact' })
        .eq('is_active', true)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      if (category) query = query.eq('category', category);
      if (search) query = query.ilike('title', `%${search}%`);
      const { data, error, count } = await query;
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { products: data, total: count, limit, offset }, status: 200 };
    }

    case 'products.get': {
      if (!id) return { data: { error: 'Missing id parameter' }, status: 400 };
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, original_price, category, image_url, tech_stack, is_free, badge, rating, sales, created_at')
        .eq('id', id)
        .eq('is_active', true)
        .single();
      if (error) return { data: { error: 'Product not found' }, status: 404 };
      return { data: { product: data }, status: 200 };
    }

    // ===== ACCOUNTS (public view) =====
    case 'accounts.list': {
      const category = (params.category || searchParams.get('category')) as string;
      const search = (params.search || searchParams.get('search')) as string;
      let query = supabase
        .from('accounts_public')
        .select('id, title, description, account_type, platform, category, image_url, features, price, is_free, is_sold, seller_id, created_at', { count: 'exact' })
        .eq('is_active', true)
        .eq('is_sold', false)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      if (category) query = query.eq('category', category);
      if (search) query = query.ilike('title', `%${search}%`);
      const { data, error, count } = await query;
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { accounts: data, total: count, limit, offset }, status: 200 };
    }

    case 'accounts.get': {
      if (!id) return { data: { error: 'Missing id parameter' }, status: 400 };
      const { data, error } = await supabase
        .from('accounts_public')
        .select('id, title, description, account_type, platform, category, image_url, features, price, is_free, is_sold, seller_id, created_at')
        .eq('id', id)
        .single();
      if (error) return { data: { error: 'Account not found' }, status: 404 };
      return { data: { account: data }, status: 200 };
    }

    // ===== CATEGORIES =====
    case 'categories.list': {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { categories: data }, status: 200 };
    }

    // ===== POSTS =====
    case 'posts.list': {
      const { data, error, count } = await supabase
        .from('posts')
        .select('id, title, description, image_url, views, created_at', { count: 'exact' })
        .eq('is_published', true)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { posts: data, total: count, limit, offset }, status: 200 };
    }

    case 'posts.get': {
      if (!id) return { data: { error: 'Missing id parameter' }, status: 400 };
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, description, content, image_url, views, created_at')
        .eq('id', id)
        .eq('is_published', true)
        .single();
      if (error) return { data: { error: 'Post not found' }, status: 404 };
      return { data: { post: data }, status: 200 };
    }

    // ===== SELLERS =====
    case 'sellers.list': {
      const { data, error } = await supabase
        .from('sellers_public')
        .select('id, display_name, description, avatar_url, is_verified')
        .range(offset, offset + limit - 1);
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { sellers: data, limit, offset }, status: 200 };
    }

    case 'sellers.get': {
      if (!id) return { data: { error: 'Missing id parameter' }, status: 400 };
      const { data, error } = await supabase
        .from('sellers_public')
        .select('id, display_name, description, avatar_url, is_verified')
        .eq('id', id)
        .single();
      if (error) return { data: { error: 'Seller not found' }, status: 404 };
      return { data: { seller: data }, status: 200 };
    }

    // ===== SCAM REPORTS =====
    case 'scam-reports.list': {
      const { data, error, count } = await supabase
        .from('scam_reports')
        .select('id, title, description, scammer_name, scammer_contact, severity, status, image_url, created_at', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { reports: data, total: count, limit, offset }, status: 200 };
    }

    // ===== FREE RESOURCES =====
    case 'free-resources.list': {
      const { data, error, count } = await supabase
        .from('free_resources')
        .select('id, title, description, type, icon, app_name, claim_limit, claimed_count, created_at', { count: 'exact' })
        .eq('is_active', true)
        .range(offset, offset + limit - 1);
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { resources: data, total: count, limit, offset }, status: 200 };
    }

    // ===== ZALO BOT RENTALS =====
    case 'bots.list': {
      const { data, error } = await supabase
        .from('zalo_bot_rentals')
        .select('id, name, description, price, duration, features, icon, zalo_number')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { bots: data }, status: 200 };
    }

    // ===== DAILY TASKS =====
    case 'daily-tasks.list': {
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('id, title, description, coin_reward, task_type, icon, required_count')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return { data: { error: error.message }, status: 400 };
      return { data: { tasks: data }, status: 200 };
    }

    // ===== DISCOUNT CODES (public check) =====
    case 'discount.check': {
      const code = (params.code || searchParams.get('code')) as string;
      if (!code) return { data: { error: 'Missing code parameter' }, status: 400 };
      const { data, error } = await supabase
        .from('discount_codes')
        .select('id, code, discount_type, discount_amount, min_order_amount, expires_at, max_uses, used_count, is_active')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();
      if (error || !data) return { data: { error: 'Invalid discount code' }, status: 404 };
      const now = new Date();
      if (data.expires_at && new Date(data.expires_at) < now) {
        return { data: { error: 'Discount code expired' }, status: 400 };
      }
      if (data.max_uses && data.used_count >= data.max_uses) {
        return { data: { error: 'Discount code fully used' }, status: 400 };
      }
      return { data: { discount: { type: data.discount_type, amount: data.discount_amount, min_order: data.min_order_amount } }, status: 200 };
    }

    // ===== STATS =====
    case 'stats.overview': {
      const [products, accounts, sellers, posts] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('accounts_public').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_sold', false),
        supabase.from('sellers_public').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_published', true),
      ]);
      return {
        data: {
          stats: {
            total_products: products.count || 0,
            available_accounts: accounts.count || 0,
            total_sellers: sellers.count || 0,
            total_posts: posts.count || 0,
          },
        },
        status: 200,
      };
    }

    // ===== ENDPOINTS LIST =====
    case 'endpoints': {
      return {
        data: {
          endpoints: [
            { endpoint: 'products.list', method: 'GET/POST', description: 'Lấy danh sách sản phẩm', params: 'category, search, limit, offset' },
            { endpoint: 'products.get', method: 'GET/POST', description: 'Chi tiết sản phẩm', params: 'id' },
            { endpoint: 'accounts.list', method: 'GET/POST', description: 'Lấy danh sách tài khoản', params: 'category, search, limit, offset' },
            { endpoint: 'accounts.get', method: 'GET/POST', description: 'Chi tiết tài khoản', params: 'id' },
            { endpoint: 'categories.list', method: 'GET/POST', description: 'Danh sách danh mục' },
            { endpoint: 'posts.list', method: 'GET/POST', description: 'Danh sách bài viết', params: 'limit, offset' },
            { endpoint: 'posts.get', method: 'GET/POST', description: 'Chi tiết bài viết', params: 'id' },
            { endpoint: 'sellers.list', method: 'GET/POST', description: 'Danh sách người bán', params: 'limit, offset' },
            { endpoint: 'sellers.get', method: 'GET/POST', description: 'Chi tiết người bán', params: 'id' },
            { endpoint: 'scam-reports.list', method: 'GET/POST', description: 'Danh sách báo cáo lừa đảo', params: 'limit, offset' },
            { endpoint: 'free-resources.list', method: 'GET/POST', description: 'Tài nguyên miễn phí', params: 'limit, offset' },
            { endpoint: 'bots.list', method: 'GET/POST', description: 'Danh sách bot cho thuê' },
            { endpoint: 'daily-tasks.list', method: 'GET/POST', description: 'Nhiệm vụ hàng ngày' },
            { endpoint: 'discount.check', method: 'GET/POST', description: 'Kiểm tra mã giảm giá', params: 'code' },
            { endpoint: 'stats.overview', method: 'GET/POST', description: 'Thống kê tổng quan' },
          ],
        },
        status: 200,
      };
    }

    default:
      return { data: { error: `Unknown endpoint: ${endpoint}`, code: 'UNKNOWN_ENDPOINT', hint: 'Use endpoint=endpoints to see all available endpoints' }, status: 404 };
  }
}
