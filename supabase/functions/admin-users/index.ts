import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

<<<<<<< HEAD
const ROOT_ADMIN_EMAIL = 'adminvip@gmail.com';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 30;
=======
// ROOT ADMIN - Only this email can add/remove other admins
const ROOT_ADMIN_EMAIL = 'adminvip@gmail.com';

// Rate limiting storage (in-memory, resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests per minute per IP
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
<<<<<<< HEAD
=======
  
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
<<<<<<< HEAD
  if (record.count >= MAX_REQUESTS_PER_WINDOW) return false;
=======
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    console.log(`[admin-users] Rate limit exceeded for: ${identifier}`);
    return false;
  }
  
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
  record.count++;
  return true;
}

serve(async (req) => {
<<<<<<< HEAD
=======
  // Handle CORS preflight
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

<<<<<<< HEAD
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
  
  if (!checkRateLimit(clientIP)) {
=======
  // Get client IP for rate limiting
  const clientIP = req.headers.get('x-forwarded-for') || 
                   req.headers.get('cf-connecting-ip') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  // Check rate limit
  if (!checkRateLimit(clientIP)) {
    console.log(`[admin-users] DDOS Protection: Blocking ${clientIP}`);
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    return new Response(
      JSON.stringify({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
    );
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

<<<<<<< HEAD
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
=======
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[admin-users] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
<<<<<<< HEAD
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Access denied: Admin role required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isRootAdmin = user.email === ROOT_ADMIN_EMAIL;

    let body: any = null;
    try { body = await req.json(); } catch { 
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let action: any = body?.action ?? body?.actionName ?? body?.type ?? body?.payload?.action ?? body?.data?.action;
=======
      console.log('[admin-users] Invalid token:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role - CRITICAL SECURITY CHECK
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.log('[admin-users] User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Access denied: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if current user is ROOT ADMIN
    const isRootAdmin = user.email === ROOT_ADMIN_EMAIL;
    console.log(`[admin-users] Admin verified: ${user.id}, isRootAdmin: ${isRootAdmin}`);

    // Parse body and improve detection for action field from various client shapes.
    let body: any = null;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.log('[admin-users] Failed to parse JSON body:', parseErr);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[admin-users] Received body:', JSON.stringify(body));

    // Try to extract action from several possible locations
    let action: any = body?.action ?? body?.actionName ?? body?.type ?? body?.payload?.action ?? body?.data?.action;
    // If action is an object with nested 'action' key
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    if (!action && typeof body === 'object') {
      for (const key of Object.keys(body)) {
        const val = (body as any)[key];
        if (typeof val === 'string') continue;
        if (val && typeof val === 'object' && (val.action || val.type)) {
          action = val.action ?? val.type;
          body = val.data ? val.data : body;
          break;
        }
      }
    }

    const data = body?.data ?? body?.payload ?? body;

    if (!action) {
<<<<<<< HEAD
      return new Response(JSON.stringify({ error: 'Missing action in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

=======
      console.log('[admin-users] Missing action. Full body:', JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: 'Missing action in request body', received: body }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize action (allow case-insensitive)
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    const actionKey = String(action).toLowerCase();
    const actionMap: Record<string, string> = {
      list: 'list',
      addadmin: 'addAdmin',
      removeadmin: 'removeAdmin',
      deleteuser: 'deleteUser',
      addseller: 'addSeller',
      removeseller: 'removeSeller',
<<<<<<< HEAD
      ensurerootadmin: 'ensureRootAdmin',
      banuser: 'banUser',
      unbanuser: 'unbanUser',
=======
      ensurerootadmin: 'ensureRootAdmin'
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    };

    const normalizedAction = actionMap[actionKey];
    if (!normalizedAction) {
<<<<<<< HEAD
      return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
=======
      console.log('[admin-users] Invalid action received:', action, 'body:', JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}`, received: body }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    }

    switch (normalizedAction) {
      case 'list': {
<<<<<<< HEAD
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles').select('user_id, display_name, avatar_url, created_at, phone');
        if (profilesError) throw profilesError;

        const { data: roles, error: rolesError } = await supabaseAdmin
          .from('user_roles').select('user_id, role');
        if (rolesError) throw rolesError;

        const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();

        const { data: sellersList } = await supabaseAdmin.from('sellers').select('user_id');

        // Get latest session info for each user (any session, not just active)
        // Fetch all sessions to find ones with IP addresses
        const { data: sessions } = await supabaseAdmin
          .from('user_sessions')
          .select('user_id, ip_address, browser, os, device_name, last_active_at')
          .order('last_active_at', { ascending: false });

        // Get banned users
        const { data: bannedList } = await supabaseAdmin
          .from('banned_users')
          .select('user_id');

        const bannedUserIds = new Set(bannedList?.map(b => b.user_id) || []);

        // Build a map of latest session per user
        const sessionMap = new Map<string, any>();
        if (sessions) {
          for (const s of sessions) {
            const existing = sessionMap.get(s.user_id);
            // Prefer session with IP address, otherwise use most recent
            if (!existing || (!existing.ip_address && s.ip_address)) {
              sessionMap.set(s.user_id, s);
            }
          }
        }
=======
        // Get all profiles with roles
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('user_id, display_name, avatar_url, created_at');

        if (profilesError) throw profilesError;

        // Get all user roles
        const { data: roles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        // Get user emails for root admin identification
        const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();

        // Combine data
        // Fetch sellers to mark isSeller
        const { data: sellersList, error: sellersError } = await supabaseAdmin
          .from('sellers')
          .select('user_id');

        if (sellersError) throw sellersError;
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af

        const usersWithRoles = profiles?.map(profile => {
          const userRoles = roles?.filter(r => r.user_id === profile.user_id) || [];
          const authUser = allUsers?.find(u => u.id === profile.user_id);
          const isUserRootAdmin = authUser?.email === ROOT_ADMIN_EMAIL;
          const isUserSeller = sellersList?.some(s => s.user_id === profile.user_id) || false;
<<<<<<< HEAD
          const sessionInfo = sessionMap.get(profile.user_id);
=======
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
          
          return {
            ...profile,
            email: authUser?.email,
<<<<<<< HEAD
            phone: profile.phone || null,
=======
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
            roles: userRoles.map(r => r.role),
            isAdmin: userRoles.some(r => r.role === 'admin'),
            isRootAdmin: isUserRootAdmin,
            isSeller: isUserSeller,
<<<<<<< HEAD
            isBanned: bannedUserIds.has(profile.user_id),
            ip_address: sessionInfo?.ip_address || null,
            browser: sessionInfo?.browser || null,
            os: sessionInfo?.os || null,
            device_name: sessionInfo?.device_name || null,
            last_active_at: sessionInfo?.last_active_at || null,
          };
        }) || [];

=======
          };
        }) || [];

        console.log('[admin-users] Listed users:', usersWithRoles.length);
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        return new Response(
          JSON.stringify({ success: true, data: usersWithRoles, currentUserIsRootAdmin: isRootAdmin }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

<<<<<<< HEAD
      case 'banUser': {
        if (!data?.userId) {
          return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (data.userId === user.id) {
          return new Response(JSON.stringify({ error: 'Không thể ban chính mình' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Check if target is root admin
        const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(data.userId);
        if (targetUser?.email === ROOT_ADMIN_EMAIL) {
          return new Response(JSON.stringify({ error: 'Không thể ban Admin Gốc!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Check if already banned
        const { data: existingBan } = await supabaseAdmin
          .from('banned_users').select('id').eq('user_id', data.userId).maybeSingle();

        if (existingBan) {
          return new Response(JSON.stringify({ error: 'Người dùng đã bị ban rồi' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const reason = data.reason || 'Vi phạm quy định';

        // Get device info from session
        const { data: sessionInfo } = await supabaseAdmin
          .from('user_sessions')
          .select('device_fingerprint, ip_address')
          .eq('user_id', data.userId)
          .eq('is_active', true)
          .order('last_active_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error: banError } = await supabaseAdmin
          .from('banned_users')
          .insert({
            user_id: data.userId,
            reason,
            banned_by: user.id,
            device_fingerprint: sessionInfo?.device_fingerprint || null,
            ip_address: sessionInfo?.ip_address || null,
          });

        if (banError) throw banError;

        // Deactivate all sessions
        await supabaseAdmin
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', data.userId);

        console.log('[admin-users] User banned:', data.userId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'unbanUser': {
        if (!data?.userId) {
          return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { error } = await supabaseAdmin
          .from('banned_users')
          .delete()
          .eq('user_id', data.userId);

        if (error) throw error;

        console.log('[admin-users] User unbanned:', data.userId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'addAdmin': {
        if (!data?.userId) {
          return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!isRootAdmin) {
          return new Response(JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền thêm admin khác!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: existingRole } = await supabaseAdmin
          .from('user_roles').select('id').eq('user_id', data.userId).eq('role', 'admin').maybeSingle();

        if (existingRole) {
          return new Response(JSON.stringify({ error: 'User is already an admin' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { error } = await supabaseAdmin.from('user_roles').insert({ user_id: data.userId, role: 'admin' });
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'ensureRootAdmin': {
        if (!isRootAdmin) {
          return new Response(JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền thực hiện hành động này' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
        const rootUser = allUsers?.find(u => u.email === ROOT_ADMIN_EMAIL);
        if (!rootUser) {
          return new Response(JSON.stringify({ error: `Không tìm thấy user với email ${ROOT_ADMIN_EMAIL}` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: existingRole } = await supabaseAdmin
          .from('user_roles').select('id').eq('user_id', rootUser.id).eq('role', 'admin').maybeSingle();
=======
      case 'addAdmin': {
        if (!data?.userId) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // ONLY ROOT ADMIN can add other admins
        if (!isRootAdmin) {
          console.log('[admin-users] Non-root admin tried to add admin:', user.id);
          return new Response(
            JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền thêm admin khác!' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if already admin
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', data.userId)
          .eq('role', 'admin')
          .maybeSingle();

        if (existingRole) {
          return new Response(
            JSON.stringify({ error: 'User is already an admin' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: data.userId, role: 'admin' });

        if (error) throw error;

        console.log('[admin-users] Admin role added by ROOT:', data.userId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'ensureRootAdmin': {
        // Ensure the ROOT_ADMIN_EMAIL user has 'admin' role
        // Only allow current root to run this
        if (!isRootAdmin) {
          return new Response(
            JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền thực hiện hành động này' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find user by email
        const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
        const rootUser = allUsers?.find(u => u.email === ROOT_ADMIN_EMAIL);
        if (!rootUser) {
          return new Response(
            JSON.stringify({ error: `Không tìm thấy user với email ${ROOT_ADMIN_EMAIL}` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check existing role
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', rootUser.id)
          .eq('role', 'admin')
          .maybeSingle();
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af

        if (existingRole) {
          return new Response(JSON.stringify({ success: true, message: 'Root user already has admin role' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

<<<<<<< HEAD
        const { error: insertError } = await supabaseAdmin.from('user_roles').insert({ user_id: rootUser.id, role: 'admin' });
=======
        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: rootUser.id, role: 'admin' });

>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        if (insertError) throw insertError;

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'addSeller': {
        if (!data.userId) {
<<<<<<< HEAD
          return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!isRootAdmin) {
          return new Response(JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền thêm seller!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: existingSeller } = await supabaseAdmin.from('sellers').select('id').eq('user_id', data.userId).maybeSingle();
        if (existingSeller) {
          return new Response(JSON.stringify({ error: 'User is already a seller' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: profileData } = await supabaseAdmin.from('profiles').select('display_name').eq('user_id', data.userId).maybeSingle();
        const displayName = profileData?.display_name || 'Seller';

        const { error: insertError } = await supabaseAdmin.from('sellers').insert({ user_id: data.userId, display_name: displayName, is_profile_complete: false });
        if (insertError) throw insertError;

=======
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // ONLY ROOT ADMIN can add sellers via this endpoint
        if (!isRootAdmin) {
          console.log('[admin-users] Non-root admin tried to add seller:', user.id);
          return new Response(
            JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền thêm seller!' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if seller already exists
        const { data: existingSeller } = await supabaseAdmin
          .from('sellers')
          .select('id')
          .eq('user_id', data.userId)
          .maybeSingle();

        if (existingSeller) {
          return new Response(
            JSON.stringify({ error: 'User is already a seller' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create a minimal seller profile (admin can update details later)
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('display_name')
          .eq('user_id', data.userId)
          .maybeSingle();

        const displayName = profileData?.display_name || 'Seller';

        const { error: insertError } = await supabaseAdmin
          .from('sellers')
          .insert({
            user_id: data.userId,
            display_name: displayName,
            is_profile_complete: false
          });

        if (insertError) throw insertError;

        console.log('[admin-users] Seller added by ROOT:', data.userId);
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'removeSeller': {
        if (!data.userId) {
<<<<<<< HEAD
          return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!isRootAdmin) {
          return new Response(JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền xóa seller!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { error } = await supabaseAdmin.from('sellers').delete().eq('user_id', data.userId);
        if (error) throw error;

=======
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // ONLY ROOT ADMIN can remove sellers via this endpoint
        if (!isRootAdmin) {
          console.log('[admin-users] Non-root admin tried to remove seller:', user.id);
          return new Response(
            JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền xóa seller!' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabaseAdmin
          .from('sellers')
          .delete()
          .eq('user_id', data.userId);

        if (error) throw error;

        console.log('[admin-users] Seller removed by ROOT:', data.userId);
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'removeAdmin': {
        if (!data?.userId) {
<<<<<<< HEAD
          return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!isRootAdmin) {
          return new Response(JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền xóa admin khác!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (data.userId === user.id) {
          return new Response(JSON.stringify({ error: 'Không thể xóa quyền admin của chính bạn' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(data.userId);
        if (targetUser?.email === ROOT_ADMIN_EMAIL) {
          return new Response(JSON.stringify({ error: 'Không thể xóa quyền Admin Gốc!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { error } = await supabaseAdmin.from('user_roles').delete().eq('user_id', data.userId).eq('role', 'admin');
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
=======
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // ONLY ROOT ADMIN can remove other admins
        if (!isRootAdmin) {
          console.log('[admin-users] Non-root admin tried to remove admin:', user.id);
          return new Response(
            JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền xóa admin khác!' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent self-removal
        if (data.userId === user.id) {
          return new Response(
            JSON.stringify({ error: 'Không thể xóa quyền admin của chính bạn' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is root admin
        const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(data.userId);
        if (targetUser?.email === ROOT_ADMIN_EMAIL) {
          return new Response(
            JSON.stringify({ error: 'Không thể xóa quyền Admin Gốc!' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', data.userId)
          .eq('role', 'admin');

        if (error) throw error;

        console.log('[admin-users] Admin role removed by ROOT:', data.userId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
      }

      case 'deleteUser': {
        if (!data?.userId) {
<<<<<<< HEAD
          return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (data.userId === user.id) {
          return new Response(JSON.stringify({ error: 'Không thể xóa tài khoản của chính bạn' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: targetRole } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', data.userId).eq('role', 'admin').maybeSingle();
        if (targetRole && !isRootAdmin) {
          return new Response(JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền xóa tài khoản admin khác!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(data.userId);
        if (targetUser?.email === ROOT_ADMIN_EMAIL) {
          return new Response(JSON.stringify({ error: 'Không thể xóa tài khoản Admin Gốc!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Clean up related data
        const { data: sellerData } = await supabaseAdmin.from('sellers').select('id').eq('user_id', data.userId).maybeSingle();

        if (true) {
          const { data: websites } = await supabaseAdmin.from('child_websites').select('id').eq('owner_id', data.userId);
=======
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent self-deletion
        if (data.userId === user.id) {
          return new Response(
            JSON.stringify({ error: 'Không thể xóa tài khoản của chính bạn' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is an admin
        const { data: targetRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', data.userId)
          .eq('role', 'admin')
          .maybeSingle();

        // Only ROOT ADMIN can delete other admins
        if (targetRole && !isRootAdmin) {
          console.log('[admin-users] Non-root admin tried to delete admin:', user.id);
          return new Response(
            JSON.stringify({ error: 'Chỉ Admin Gốc mới có quyền xóa tài khoản admin khác!' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is root admin (protect root admin from deletion)
        const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(data.userId);
        if (targetUser?.email === ROOT_ADMIN_EMAIL) {
          return new Response(
            JSON.stringify({ error: 'Không thể xóa tài khoản Admin Gốc!' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Clean up all related data before deleting auth user
        console.log('[admin-users] Cleaning up related data for user:', data.userId);

        // Get seller id if user is a seller
        const { data: sellerData } = await supabaseAdmin
          .from('sellers')
          .select('id')
          .eq('user_id', data.userId)
          .maybeSingle();

        // Delete child website products first (depends on child_websites)
        if (true) {
          const { data: websites } = await supabaseAdmin
            .from('child_websites')
            .select('id')
            .eq('owner_id', data.userId);
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
          if (websites && websites.length > 0) {
            const websiteIds = websites.map(w => w.id);
            await supabaseAdmin.from('child_website_products').delete().in('website_id', websiteIds);
          }
        }

<<<<<<< HEAD
=======
        // Delete in order - child tables first
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        const cleanupTables = [
          { table: 'chat_messages', column: 'user_id' },
          { table: 'private_messages', column: 'sender_id' },
          { table: 'private_messages', column: 'receiver_id' },
          { table: 'notifications', column: 'user_id' },
          { table: 'post_comments', column: 'user_id' },
          { table: 'post_likes', column: 'user_id' },
          { table: 'friendships', column: 'user_id' },
          { table: 'friendships', column: 'friend_id' },
          { table: 'coin_history', column: 'user_id' },
          { table: 'coin_purchases', column: 'user_id' },
          { table: 'coin_transactions', column: 'user_id' },
          { table: 'user_coins', column: 'user_id' },
          { table: 'user_wallets', column: 'user_id' },
          { table: 'user_warnings', column: 'user_id' },
          { table: 'user_onboarding', column: 'user_id' },
          { table: 'task_completions', column: 'user_id' },
          { table: 'daily_action_progress', column: 'user_id' },
          { table: 'resource_claims', column: 'user_id' },
          { table: 'discount_code_uses', column: 'user_id' },
          { table: 'referrals', column: 'referrer_id' },
          { table: 'referrals', column: 'referred_id' },
          { table: 'bot_rental_requests', column: 'user_id' },
          { table: 'banned_users', column: 'user_id' },
<<<<<<< HEAD
          { table: 'user_sessions', column: 'user_id' },
          { table: 'device_registrations', column: 'user_id' },
=======
          { table: 'otp_codes', column: 'email' }, // skip, no user_id FK
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
          { table: 'orders', column: 'buyer_id' },
          { table: 'seller_requests', column: 'user_id' },
        ];

        for (const { table, column } of cleanupTables) {
<<<<<<< HEAD
=======
          if (column === 'email') continue; // skip non-uuid columns
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
          try {
            await supabaseAdmin.from(table).delete().eq(column, data.userId);
          } catch (e) {
            console.log(`[admin-users] Cleanup warning for ${table}.${column}:`, e);
          }
        }

<<<<<<< HEAD
=======
        // Delete seller-related data
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        if (sellerData) {
          await supabaseAdmin.from('withdrawal_requests').delete().eq('seller_id', sellerData.id);
          await supabaseAdmin.from('seller_coins').delete().eq('seller_id', sellerData.id);
          await supabaseAdmin.from('accounts').delete().eq('seller_id', sellerData.id);
          await supabaseAdmin.from('products').delete().eq('seller_id', sellerData.id);
          await supabaseAdmin.from('sellers').delete().eq('user_id', data.userId);
        }

<<<<<<< HEAD
=======
        // Set created_by to null for content tables (preserve content)
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        await supabaseAdmin.from('products').update({ created_by: null }).eq('created_by', data.userId);
        await supabaseAdmin.from('social_accounts').update({ created_by: null }).eq('created_by', data.userId);
        await supabaseAdmin.from('scam_reports').update({ created_by: null }).eq('created_by', data.userId);
        await supabaseAdmin.from('discount_codes').update({ created_by: null }).eq('created_by', data.userId);
        await supabaseAdmin.from('posts').update({ created_by: null }).eq('created_by', data.userId);
        await supabaseAdmin.from('free_resources').update({ created_by: null }).eq('created_by', data.userId);

<<<<<<< HEAD
        const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
        if (error) throw new Error('Database error deleting user');

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
=======
        // Now delete the auth user (profiles & user_roles cascade automatically)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);

        if (error) {
          console.error('[admin-users] Error deleting auth user:', error);
          throw new Error('Database error deleting user');
        }

        console.log('[admin-users] User deleted successfully:', data.userId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin-users] Error:', message);
<<<<<<< HEAD
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
=======
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
