-- Allow authenticated users to read basic profile info (display_name, avatar_url) for leaderboard
CREATE POLICY "Anyone authenticated can view profiles for leaderboard"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);
