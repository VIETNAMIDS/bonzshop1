-- Fix seller INSERT/UPDATE RLS for products (remove dependency on user_roles seller)

-- INSERT
DROP POLICY IF EXISTS "Admins and sellers can insert products" ON public.products;
DROP POLICY IF EXISTS "Owners can insert products" ON public.products;

CREATE POLICY "Owners can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR (
    seller_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sellers s
      WHERE s.id = seller_id
        AND s.user_id = auth.uid()
    )
  )
);

-- UPDATE
DROP POLICY IF EXISTS "Admins and sellers can update products" ON public.products;
DROP POLICY IF EXISTS "Owners can update products" ON public.products;

CREATE POLICY "Owners can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    seller_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sellers s
      WHERE s.id = seller_id
        AND s.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR (
    seller_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sellers s
      WHERE s.id = seller_id
        AND s.user_id = auth.uid()
    )
  )
);

-- SELECT (so sellers can see their own products even when not active)
DROP POLICY IF EXISTS "Sellers can view their products" ON public.products;
DROP POLICY IF EXISTS "Owners can view own products" ON public.products;

CREATE POLICY "Owners can view own products"
ON public.products
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    seller_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sellers s
      WHERE s.id = seller_id
        AND s.user_id = auth.uid()
    )
  )
  OR (created_by = auth.uid())
);
