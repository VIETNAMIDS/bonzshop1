-- Allow authenticated users to see approved coin purchases for leaderboard
CREATE POLICY "Anyone can view approved purchases for leaderboard"
ON public.coin_purchases
FOR SELECT
USING (status = 'approved');
