-- Fix security definer view issue
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