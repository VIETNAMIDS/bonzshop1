-- Create coin_history table to track all coin transactions
CREATE TABLE public.coin_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'referral_reward', 'referral_bonus', 'daily_task', 'purchase', 'spend', 'admin_add', 'admin_deduct'
  description TEXT,
  reference_id TEXT, -- ID liên quan (order_id, task_id, referral_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own coin history
CREATE POLICY "Users can view their own coin history"
ON public.coin_history
FOR SELECT
USING (auth.uid() = user_id);

-- Allow insert from authenticated users (for system operations)
CREATE POLICY "Allow insert coin history"
ON public.coin_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_coin_history_user_id ON public.coin_history(user_id);
CREATE INDEX idx_coin_history_created_at ON public.coin_history(created_at DESC);

-- Enable realtime for coin_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_history;