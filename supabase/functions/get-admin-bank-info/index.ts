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

    // Get the specific admin bank account for coin purchases
    // Find the first admin with complete bank info
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(
        JSON.stringify({ bankInfo: null, message: 'No admin found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    
    // Get admin's seller profile with bank info
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('bank_name, bank_account_name, bank_account_number, bank_qr_url')
      .in('user_id', adminUserIds)
      .not('bank_name', 'is', null)
      .not('bank_account_number', 'is', null)
      .limit(1)
      .maybeSingle();

    if (sellerError) {
      console.error('Error fetching seller:', sellerError);
      throw sellerError;
    }

    if (!seller) {
      return new Response(
        JSON.stringify({ bankInfo: null, message: 'No bank info found' }),
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
