-- Allow public to view basic seller info through the public view
-- The view only exposes id, display_name, description, avatar_url, is_verified (no sensitive data)
-- But the view needs SELECT on sellers table

-- Add policy to allow SELECT on specific non-sensitive columns
-- Note: Since RLS is on, we need a policy that allows reading for the sellers_public view

-- Grant SECURITY INVOKER view access via a permissive policy for public non-sensitive info
CREATE POLICY "Public can view basic seller display info"
ON public.sellers
FOR SELECT
USING (true);

-- The restrictive part is handled by the view only selecting non-sensitive columns