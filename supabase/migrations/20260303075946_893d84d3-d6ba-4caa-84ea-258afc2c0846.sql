
-- Fix Security Definer Views by setting them to SECURITY INVOKER
ALTER VIEW public.profiles_public SET (security_invoker = on);
ALTER VIEW public.keys_public SET (security_invoker = on);
