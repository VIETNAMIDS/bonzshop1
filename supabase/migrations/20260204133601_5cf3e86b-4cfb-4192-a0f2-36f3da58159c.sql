-- Fix view to use security_invoker = true (modern approach) 
-- The underlying function handles the bypass instead
DROP VIEW IF EXISTS public.sellers_public;

CREATE VIEW public.sellers_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  display_name,
  description,
  avatar_url,
  is_verified
FROM public.sellers;

-- For this to work, we need a policy that allows reading these specific rows
-- Add a policy that allows public to read sellers (but the VIEW limits columns)
CREATE POLICY "public_can_read_sellers_basic"
ON public.sellers
FOR SELECT
USING (true);

-- Now drop the restrictive policy we created earlier since we have the column-limited view
DROP POLICY IF EXISTS "sellers_select_own" ON public.sellers;