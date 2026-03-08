
-- Table to track muted users in chat
CREATE TABLE public.chat_muted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  muted_by uuid,
  reason text,
  muted_at timestamp with time zone NOT NULL DEFAULT now(),
  unmuted_at timestamp with time zone
);

ALTER TABLE public.chat_muted_users ENABLE ROW LEVEL SECURITY;

-- Admins can manage muted users
CREATE POLICY "Admins can manage muted users"
ON public.chat_muted_users
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can check if they are muted
CREATE POLICY "Users can check own mute status"
ON public.chat_muted_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to delete any chat message (update is_deleted)
CREATE POLICY "Admins can delete any chat message"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));
