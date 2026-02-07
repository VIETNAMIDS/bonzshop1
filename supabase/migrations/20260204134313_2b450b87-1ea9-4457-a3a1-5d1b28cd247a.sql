-- Drop old INSERT policy
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;

-- Create new INSERT policy that allows sellers to insert products with their seller_id
CREATE POLICY "Admins and sellers can insert products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) 
  OR (
    has_role(auth.uid(), 'seller'::app_role) 
    AND (
      seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
      OR seller_id IS NULL
    )
  )
);

-- Also fix UPDATE policy
DROP POLICY IF EXISTS "Admins can update products" ON public.products;

CREATE POLICY "Admins and sellers can update products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (
  is_admin(auth.uid()) 
  OR (
    has_role(auth.uid(), 'seller'::app_role) 
    AND seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  )
);