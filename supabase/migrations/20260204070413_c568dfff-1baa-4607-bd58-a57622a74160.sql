-- Fix security definer view issue by adding security_invoker
DROP VIEW IF EXISTS public.sellers_public;
CREATE VIEW public.sellers_public 
WITH (security_invoker = true)
AS SELECT id, display_name, avatar_url, description, is_verified
FROM public.sellers;