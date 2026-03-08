
-- Bot chat history table
CREATE TABLE public.bot_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own bot messages
CREATE POLICY "Users can view own bot messages"
  ON public.bot_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own bot messages  
CREATE POLICY "Users can insert own bot messages"
  ON public.bot_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bot messages (clear history)
CREATE POLICY "Users can delete own bot messages"
  ON public.bot_chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all bot messages
CREATE POLICY "Admins can view all bot messages"
  ON public.bot_chat_messages FOR SELECT
  USING (is_admin(auth.uid()));

-- Bot violations tracking
CREATE TABLE public.bot_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_content TEXT NOT NULL,
  violation_type TEXT NOT NULL DEFAULT 'inappropriate',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_violations ENABLE ROW LEVEL SECURITY;

-- Only admins can view violations
CREATE POLICY "Admins can manage bot violations"
  ON public.bot_violations FOR ALL
  USING (is_admin(auth.uid()));

-- Service role can insert (from edge function)
CREATE POLICY "Service can insert violations"
  ON public.bot_violations FOR INSERT
  WITH CHECK (true);
