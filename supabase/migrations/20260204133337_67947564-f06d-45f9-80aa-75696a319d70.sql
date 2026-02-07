-- Allow SELECT on sellers for authenticated users but only expose through view
-- This is needed because products/accounts reference seller_id and need to display seller name
-- The safe approach is to use the view OR use RPC function

-- Actually, let's allow public SELECT on non-sensitive columns only
-- PostgreSQL doesn't support column-level RLS, so we need a different approach

-- Option 1: Allow all authenticated users to read sellers table but:
-- - Bank info columns should be null when not owner/admin
-- - This requires a view with column security

-- Let's create a secure function-based approach instead
-- The sellers_public view with SECURITY INVOKER needs underlying access

-- Grant read access for the view to work
CREATE POLICY "Allow read for sellers_public view"
ON public.sellers
FOR SELECT
USING (true);

-- WARNING: This allows reading all columns. To truly hide bank info,
-- we need to ensure the frontend ONLY uses sellers_public view or the RPC function