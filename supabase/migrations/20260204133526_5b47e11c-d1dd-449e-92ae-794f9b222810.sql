-- DROP ALL OLD CONFLICTING POLICIES AND CREATE NEW SECURE ONES

-- ACCOUNTS TABLE
DROP POLICY IF EXISTS "Anyone can view non-deleted messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can read discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Authenticated users can read discount codes" ON public.discount_codes;

-- SELLERS TABLE - drop the public access policy
DROP POLICY IF EXISTS "Allow read for sellers_public view" ON public.sellers;

-- Recreate with proper security
-- Sellers: only self and admin see full profile
CREATE POLICY "sellers_select_own"
ON public.sellers
FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.is_admin(auth.uid())
);

-- CHAT MESSAGES - drop any remaining public policy
DROP POLICY IF EXISTS "Users can read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can read messages" ON public.chat_messages;

-- DISCOUNT CODES - authenticated only
CREATE POLICY "discount_codes_auth_select"
ON public.discount_codes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- SITE SETTINGS - authenticated can read, only admin modify
DROP POLICY IF EXISTS "Everyone can read settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.site_settings;

CREATE POLICY "site_settings_select"
ON public.site_settings
FOR SELECT
USING (true); -- Settings like hero_title need to be public for landing page