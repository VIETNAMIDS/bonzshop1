
-- Fix overly permissive RLS policies for referrals table
DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

-- More restrictive policies for referrals
CREATE POLICY "Authenticated users can insert referrals for themselves" 
ON public.referrals FOR INSERT 
WITH CHECK (auth.uid() = referred_id);

CREATE POLICY "Users can update own referrals as referrer" 
ON public.referrals FOR UPDATE 
USING (auth.uid() = referrer_id);
