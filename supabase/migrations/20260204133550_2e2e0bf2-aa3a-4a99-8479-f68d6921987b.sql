-- Recreate sellers_public view with SECURITY DEFINER behavior
-- Using a view with security_invoker = false (default in older PG) to bypass RLS
CREATE OR REPLACE VIEW public.sellers_public AS
SELECT 
  id,
  display_name,
  description,
  avatar_url,
  is_verified
FROM public.sellers;

-- Grant select on the view to all
GRANT SELECT ON public.sellers_public TO anon, authenticated;