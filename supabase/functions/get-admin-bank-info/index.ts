import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // First, get primary admin user id from site_settings
    const { data: primaryAdminSetting, error: settingError } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'primary_admin_user_id')
      .maybeSingle();

    if (settingError) {
      console.error('Error fetching primary admin setting:', settingError);
    }

    let targetUserId = primaryAdminSetting?.value;
    console.log('Primary admin user_id from settings:', targetUserId);

    // If no primary admin set, fallback to first admin created
    if (!targetUserId) {
      const { data: firstAdmin, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (adminError) {
        console.error('Error fetching first admin:', adminError);
      }

      targetUserId = firstAdmin?.user_id;
      console.log('Fallback to first admin user_id:', targetUserId);
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ bankInfo: null, message: 'No admin found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the specific admin's seller profile with bank info
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('bank_name, bank_account_name, bank_account_number, bank_qr_url')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (sellerError) {
      console.error('Error fetching seller:', sellerError);
      throw sellerError;
    }

    if (!seller || !seller.bank_account_number) {
      // If primary admin has no bank info, don't fallback to other admins
      console.log('Primary admin has no bank info configured');
      return new Response(
        JSON.stringify({ bankInfo: null, message: 'No bank info found for primary admin' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Returning bank info:', seller.bank_name, seller.bank_account_number);

    return new Response(
      JSON.stringify({ bankInfo: seller }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
