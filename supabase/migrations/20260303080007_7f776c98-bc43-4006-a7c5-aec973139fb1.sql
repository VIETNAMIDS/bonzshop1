
-- =====================================================
-- FIX: site_settings - restrict Telegram credentials from public
-- Only expose non-sensitive settings publicly
-- =====================================================

DROP POLICY IF EXISTS "site_settings_select" ON public.site_settings;

CREATE POLICY "site_settings_public_select"
ON public.site_settings
FOR SELECT
USING (key NOT LIKE 'telegram_%' AND key NOT LIKE 'secret_%' AND key NOT LIKE 'api_%');

-- =====================================================
-- FIX: accounts table - the "accounts_public_listing" policy 
-- still exposes credentials. Drop it.
-- Frontend should use accounts_public view instead.
-- =====================================================

DROP POLICY IF EXISTS "accounts_public_listing" ON public.accounts;
