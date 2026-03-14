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

    const { userName, userEmail, userAgent, referrer, appVersion } = await req.json();

    // Get client IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || 'Không rõ';

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // Detect device
    const ua = userAgent || '';
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    let deviceType = '💻 Máy tính';
    if (/iPhone/i.test(ua)) deviceType = '📱 iPhone';
    else if (/iPad/i.test(ua)) deviceType = '📱 iPad';
    else if (/Android/i.test(ua)) deviceType = '📱 Android';

    // Detect browser
    let browser = 'Không rõ';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
    else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

    // Detect OS
    let os = 'Không rõ';
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    // Get country from IP using free API
    let country = 'Không rõ';
    let city = '';
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, {
        signal: AbortSignal.timeout(3000),
      });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        if (geo.status === 'success') {
          country = geo.country || 'Không rõ';
          city = geo.city || '';
        }
      }
    } catch {
      // ignore geo lookup failure
    }

    // Get Telegram settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['telegram_bot_token', 'telegram_chat_id']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach(s => { if (s.value) settingsMap[s.key] = s.value; });

    const botToken = settingsMap['telegram_bot_token'];
    const chatId = settingsMap['telegram_chat_id'];

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ success: true, message: 'Telegram chưa cấu hình' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const locationStr = city ? `${city}, ${country}` : country;

    const message = `📲 *CÀI ĐẶT APP THÀNH CÔNG*\n\n` +
      `👤 Tên: ${userName || 'Khách'}\n` +
      `📧 Email: ${userEmail || 'Chưa đăng nhập'}\n` +
      `${deviceType} (${os})\n` +
      `🌐 Trình duyệt: ${browser}\n` +
      `📦 Version: ${appVersion || '1.0.0'}\n` +
      `🌍 IP: \`${ip}\`\n` +
      `📍 Vị trí: ${locationStr}\n` +
      `🔗 Nguồn: ${referrer || 'Trực tiếp'}\n` +
      `🕐 Thời gian: ${now}`;

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await telegramResponse.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Report install error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
