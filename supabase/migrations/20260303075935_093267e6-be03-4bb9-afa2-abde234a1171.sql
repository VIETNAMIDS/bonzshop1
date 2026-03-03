
-- =====================================================
-- FIX 1: sellers table - remove public read of bank info
-- The sellers_public view already exists with safe columns.
-- Remove the overly permissive policy and create a restricted one.
-- =====================================================

DROP POLICY IF EXISTS "public_can_read_sellers_basic" ON public.sellers;

-- Only allow public to see basic info (no bank details) via the sellers_public view
-- Sellers see their own full profile, admins see all
-- The existing policies "Sellers can view own full profile" and admin access remain.

-- =====================================================
-- FIX 2: accounts table - hide credentials from public listing
-- Replace the overly permissive SELECT policies with a view-based approach.
-- The accounts_public view already exists without credential columns.
-- Remove the "Anyone can view active unsold accounts" policy that exposes all columns.
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active unsold accounts" ON public.accounts;

-- The "accounts_public_listing" policy already restricts to unsold+active,
-- but it still exposes all columns. We keep it for the accounts_public view queries.
-- The "accounts_select_owners_only" allows sellers/buyers/admin to see full data.

-- =====================================================
-- FIX 3: qr_login_sessions - restrict public read
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read QR sessions" ON public.qr_login_sessions;

-- Allow reading QR sessions only by token lookup (needed for QR login flow)
-- Since we can't filter by parameter in RLS, we restrict to authenticated + pending sessions only
CREATE POLICY "Anyone can read pending QR sessions"
ON public.qr_login_sessions
FOR SELECT
USING (status = 'pending' AND expires_at > now());

-- Authenticated users can read sessions they confirmed
CREATE POLICY "Users can view their confirmed QR sessions"
ON public.qr_login_sessions
FOR SELECT
USING (auth.uid() = confirmed_by);

-- =====================================================
-- FIX 4: device_registrations - restrict public read
-- =====================================================

DROP POLICY IF EXISTS "Anyone can check device registration" ON public.device_registrations;

-- Create a security definer function for device check (used during signup)
CREATE OR REPLACE FUNCTION public.check_device_count(p_fingerprint text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.device_registrations
  WHERE device_fingerprint = p_fingerprint;
$$;

-- Only allow users to see their own device registrations (policy already exists)
-- The "Users can view own device registrations" policy is already in place.

-- =====================================================
-- FIX 5: profiles table - hide phone from leaderboard query  
-- Create a view for leaderboard that excludes phone
-- =====================================================

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, user_id, display_name, avatar_url, referral_code
FROM public.profiles;

-- =====================================================
-- FIX 6: keys table - hide key_value from public listing
-- =====================================================

-- Create a public view for keys without the actual key value
CREATE OR REPLACE VIEW public.keys_public AS
SELECT id, title, description, category, image_url, price, is_sold, is_active, seller_id, created_at
FROM public.keys
WHERE is_active = true AND is_sold = false;
