import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    console.log('[verify-admin] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('[verify-admin] No authorization header');
      return new Response(
        JSON.stringify({ isAdmin: false, error: 'No authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log('[verify-admin] Auth error:', authError?.message || 'No user');
      return new Response(
        JSON.stringify({ isAdmin: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-admin] User ID:', user.id, 'Email:', user.email);

    // Check admin role securely on backend
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.log('[verify-admin] Role query error:', roleError.message);
    }

    const isAdmin = !roleError && !!roleData;

    console.log('[verify-admin] User:', user.id, 'isAdmin:', isAdmin, 'roleData:', roleData);

    return new Response(
      JSON.stringify({ isAdmin, userId: user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[verify-admin] Error:', message);
    return new Response(
      JSON.stringify({ isAdmin: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
