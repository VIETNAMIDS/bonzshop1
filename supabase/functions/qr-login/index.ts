import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  try {
    const { action, token } = await req.json()

    if (action === 'create') {
      // Desktop creates a new QR session (no auth needed)
      const supabase = createClient(supabaseUrl, anonKey)
      
      const { data, error } = await supabase
        .from('qr_login_sessions')
        .insert({})
        .select('token, expires_at')
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ token: data.token, expires_at: data.expires_at }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'confirm') {
      // Mobile user confirms the QR login (needs auth)
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Use service role to update and generate a session for the desktop
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

      // Check if QR session exists and is still valid
      const { data: qrSession, error: qrError } = await supabaseAdmin
        .from('qr_login_sessions')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (qrError || !qrSession) {
        return new Response(JSON.stringify({ error: 'QR session not found or expired' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check expiry
      if (new Date(qrSession.expires_at) < new Date()) {
        await supabaseAdmin
          .from('qr_login_sessions')
          .update({ status: 'expired' })
          .eq('id', qrSession.id)

        return new Response(JSON.stringify({ error: 'QR code expired' }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Generate a magic link / session for the desktop using admin API
      // We create a one-time sign-in link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email!,
      })

      if (linkError) throw linkError

      // Extract the token from the link properties
      const sessionToken = linkData.properties?.hashed_token

      // Update QR session as confirmed with the hashed token
      const { error: updateError } = await supabaseAdmin
        .from('qr_login_sessions')
        .update({
          status: 'confirmed',
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
          session_data: {
            hashed_token: sessionToken,
            email: user.email,
            token_hash: linkData.properties?.hashed_token,
            verification_type: linkData.properties?.verification_type,
          },
        })
        .eq('id', qrSession.id)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'check') {
      // Desktop polls to check if QR was scanned
      const supabase = createClient(supabaseUrl, anonKey)

      const { data, error } = await supabase
        .from('qr_login_sessions')
        .select('status, session_data')
        .eq('token', token)
        .single()

      if (error) throw error

      if (data.status === 'confirmed' && data.session_data) {
        return new Response(JSON.stringify({
          status: 'confirmed',
          hashed_token: (data.session_data as any).hashed_token,
          email: (data.session_data as any).email,
          token_hash: (data.session_data as any).token_hash,
          verification_type: (data.session_data as any).verification_type,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ status: data.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('QR Login error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
