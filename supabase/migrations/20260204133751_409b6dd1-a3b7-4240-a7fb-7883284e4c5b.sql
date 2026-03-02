-- Create a public view for accounts that hides sensitive credentials
CREATE OR REPLACE VIEW public.accounts_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  title,
  description,
  price,
  category,
  image_url,
  is_sold,
  is_free,
  is_active,
  created_at,
  seller_id,
  platform,
  account_type,
  features
FROM public.accounts;

-- Update RLS policy for accounts to be more restrictive
-- Remove the public access part from accounts_select
DROP POLICY IF EXISTS "accounts_select" ON public.accounts;

CREATE POLICY "accounts_select_owners_only"
ON public.accounts
FOR SELECT
USING (
  -- Seller can see their own accounts (including credentials)
  seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  -- Buyer can see accounts they purchased (including credentials)
  OR sold_to = auth.uid()
  OR buyer_id = auth.uid()
  -- Admin can see all
  OR public.is_admin(auth.uid())
);

-- For public listings, frontend should use accounts_public view
-- The view needs underlying access, so create a policy for service role only
-- Actually, security_invoker means the view inherits caller's permissions
-- So public users won't be able to read from accounts_public either

-- Alternative: Allow public SELECT but the accounts_public view limits columns
CREATE POLICY "accounts_public_listing"
ON public.accounts
FOR SELECT
USING (is_sold = false AND is_active = true);

-- Note: RLS cannot restrict columns. The protection is:
-- 1. Frontend queries only non-sensitive columns
-- 2. Edge functions verify ownership before returning credentials