-- Create a SECURITY DEFINER function to get public seller info
-- This bypasses RLS and only returns safe columns
DROP FUNCTION IF EXISTS public.get_seller_public_info(UUID);

CREATE OR REPLACE FUNCTION public.get_public_seller_info(p_seller_id UUID)
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
STABLE
AS $$
  SELECT s.id, s.display_name, s.description, s.avatar_url, s.is_verified
  FROM sellers s
  WHERE s.id = p_seller_id;
$$;

-- Create a view using the SECURITY DEFINER function approach
-- Actually, let's use a simpler approach - create a view with security_invoker = false 
-- that only returns non-sensitive columns
DROP VIEW IF EXISTS public.sellers_public;

-- The view needs to bypass RLS to work for public users
-- Using SECURITY DEFINER on a view isn't possible, so we use a function-based approach
-- or grant a special role

-- Alternative: Allow public SELECT on sellers but only for the view's columns
-- by creating a permissive policy that ONLY works with specific queries

-- Actually the simplest solution: make sellers_public a materialized view 
-- or use the function approach in queries

-- Let's update the code to use the function instead