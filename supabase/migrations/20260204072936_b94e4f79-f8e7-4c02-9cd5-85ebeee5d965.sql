-- Allow service role to insert notifications (used by edge functions)
-- Note: Edge functions use service role key which bypasses RLS, 
-- but we still need to ensure the table structure allows inserts

-- Drop existing policy if exists and create new one
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Allow authenticated users to insert their own notifications (for edge functions using user token)
DROP POLICY IF EXISTS "Allow insert notifications for own user" ON public.notifications;
CREATE POLICY "Allow insert notifications for own user"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);