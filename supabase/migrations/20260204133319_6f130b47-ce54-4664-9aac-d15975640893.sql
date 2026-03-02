-- Remove the overly permissive policy we just added
DROP POLICY IF EXISTS "Public can view basic seller display info" ON public.sellers;

-- Instead, we need to use a different approach:
-- The sellers_public view already filters columns, and apps should use that view
-- For the sellers table itself, we restrict access

-- Keep only specific policies:
-- 1. Own profile (full access including bank info)
-- 2. Admin access (full access)
-- The view handles public info display

-- For products/accounts that need to show seller name, we'll update the code to use sellers_public view

-- Create a function to get public seller info by ID (safer approach)
CREATE OR REPLACE FUNCTION public.get_seller_public_info(seller_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  description TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.display_name, s.description, s.avatar_url, s.is_verified
  FROM sellers s
  WHERE s.id = seller_id;
$$;