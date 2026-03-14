import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('cf-connecting-ip') ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'check';

    if (action === 'get-ip') {
      // Just return the IP so client can store it
      return new Response(
        JSON.stringify({ ip: clientIP }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-session-ip') {
      // Update session with real IP - fail gracefully if token invalid
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ success: false, reason: 'no_auth' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        // Non-critical: just skip IP update silently
        return new Response(JSON.stringify({ success: false, reason: 'invalid_session' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const sessionToken = body.sessionToken;
      if (sessionToken) {
        await supabaseAdmin
          .from('user_sessions')
          .update({ ip_address: clientIP })
          .eq('session_token', sessionToken)
          .eq('user_id', user.id);
      }

      return new Response(
        JSON.stringify({ success: true, ip: clientIP }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: check ban status by user_id and/or IP
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id || null;
    }

    // Check ban by user_id
    let isBanned = false;
    let banReason = '';

    if (userId) {
      const { data: userBan } = await supabaseAdmin
        .from('banned_users')
        .select('reason')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (userBan) {
        isBanned = true;
        banReason = userBan.reason;
      }
    }

    // Check ban by IP
    if (!isBanned && clientIP !== 'unknown') {
      const { data: ipBan } = await supabaseAdmin
        .from('banned_users')
        .select('reason')
        .eq('ip_address', clientIP)
        .limit(1)
        .maybeSingle();
      
      if (ipBan) {
        isBanned = true;
        banReason = ipBan.reason;
      }
    }

    // Check if user is admin (admins exempt from ban)
    if (isBanned && userId) {
      const { data: adminRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (adminRole) {
        isBanned = false;
      }
    }

    return new Response(
      JSON.stringify({ banned: isBanned, reason: banReason, ip: clientIP }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
