-- Additional security fixes

-- 1. Fix sellers table - restrict access to bank info and phone
-- First drop existing policies
DROP POLICY IF EXISTS "Public can view basic seller info" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can update own profile" ON public.sellers;
DROP POLICY IF EXISTS "Anyone can view sellers" ON public.sellers;
DROP POLICY IF EXISTS "Sellers update own" ON public.sellers;
DROP POLICY IF EXISTS "Anyone can view public seller info" ON public.sellers;

-- Create secure policies for sellers table
-- Only seller themselves and admins can see sensitive info (bank, phone)
CREATE POLICY "Sellers can view own full profile"
ON public.sellers
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Allow insert for authenticated users registering as seller
CREATE POLICY "Users can create seller profile"
ON public.sellers
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Sellers can update their own profile
CREATE POLICY "Sellers can update own profile"
ON public.sellers
FOR UPDATE
USING (user_id = auth.uid());

-- 2. Fix banned_users - only admins can read all, users check own status
DROP POLICY IF EXISTS "Users can check own ban status" ON public.banned_users;
DROP POLICY IF EXISTS "Admins can view all banned users" ON public.banned_users;

CREATE POLICY "Admins can view all banned users"
ON public.banned_users
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can check own ban status"
ON public.banned_users
FOR SELECT
USING (user_id = auth.uid());

-- 3. OTP codes should NEVER be readable by anyone except via edge function
-- RLS with no policies is actually correct - they are accessed only by service role
-- Add explicit deny policy for extra safety
DROP POLICY IF EXISTS "Block all access to otp_codes" ON public.otp_codes;
CREATE POLICY "Block all access to otp_codes"
ON public.otp_codes
FOR ALL
USING (false);