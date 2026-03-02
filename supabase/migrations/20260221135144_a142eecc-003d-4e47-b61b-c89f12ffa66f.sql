-- Allow authenticated users to view all user_coins for leaderboard
CREATE POLICY "Anyone authenticated can view user_coins for leaderboard"
ON public.user_coins
FOR SELECT
USING (auth.uid() IS NOT NULL);
