-- Fix security vulnerabilities - Step by step

-- 1. Drop the existing view first to recreate it properly
DROP VIEW IF EXISTS public.sellers_public;

-- 2. Create secure view for public seller info (without sensitive data)
CREATE VIEW public.sellers_public AS
SELECT 
  id,
  display_name,
  description,
  avatar_url,
  is_verified
FROM public.sellers;

-- 3. Fix banned_users table - users should only check their own ban status
DROP POLICY IF EXISTS "Anyone can check if banned" ON public.banned_users;

CREATE POLICY "Users can check own ban status"
ON public.banned_users
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 4. Add commission fee setting to site_settings
INSERT INTO public.site_settings (key, value)
VALUES ('seller_commission_percent', '10')
ON CONFLICT (key) DO NOTHING;