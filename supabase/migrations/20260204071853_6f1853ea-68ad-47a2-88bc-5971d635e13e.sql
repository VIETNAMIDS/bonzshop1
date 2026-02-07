-- Add missing columns for coin purchase approval
ALTER TABLE public.coin_purchases 
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Create RLS policies for admin to manage coin_purchases
DROP POLICY IF EXISTS "Admins can do everything on coin_purchases" ON public.coin_purchases;
DROP POLICY IF EXISTS "Admins can view all coin_purchases" ON public.coin_purchases;
DROP POLICY IF EXISTS "Admins can update coin_purchases" ON public.coin_purchases;

CREATE POLICY "Admins can view all coin_purchases"
ON public.coin_purchases
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update coin_purchases"
ON public.coin_purchases
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow admins to manage user_coins
DROP POLICY IF EXISTS "Admins can manage all user_coins" ON public.user_coins;
DROP POLICY IF EXISTS "Admins can view all user_coins" ON public.user_coins;
DROP POLICY IF EXISTS "Admins can update user_coins" ON public.user_coins;
DROP POLICY IF EXISTS "Admins can insert user_coins" ON public.user_coins;

CREATE POLICY "Admins can view all user_coins"
ON public.user_coins
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user_coins"
ON public.user_coins
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user_coins"
ON public.user_coins
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));