-- Drop and recreate the "Anyone can view active products" policy to ensure it works correctly
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

CREATE POLICY "Anyone can view active products" 
ON products 
FOR SELECT 
USING (is_active = true);

-- Also ensure sellers_public view is accessible
GRANT SELECT ON sellers_public TO authenticated;
GRANT SELECT ON sellers_public TO anon;