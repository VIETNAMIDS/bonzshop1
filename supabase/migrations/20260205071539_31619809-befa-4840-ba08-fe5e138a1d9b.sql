
-- Create table to track daily user actions
CREATE TABLE public.daily_action_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'view_product', 'send_chat', 'view_post', 'view_notification', 'complete_profile', 'daily_login'
  action_count INTEGER DEFAULT 1,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type, action_date)
);

-- Enable RLS
ALTER TABLE public.daily_action_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own progress" 
ON public.daily_action_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" 
ON public.daily_action_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" 
ON public.daily_action_progress FOR UPDATE 
USING (auth.uid() = user_id);

-- Update daily_tasks to have required_count and action_type mapping
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS required_count INTEGER DEFAULT 1;
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS tracked_action TEXT;

-- Remove Facebook sharing task and update tasks with tracking info
DELETE FROM public.daily_tasks WHERE title = 'Chia sẻ Facebook';

-- Update existing tasks with proper tracking
UPDATE public.daily_tasks SET tracked_action = 'daily_login', required_count = 1 WHERE task_type = 'daily_login';
UPDATE public.daily_tasks SET tracked_action = 'view_product', required_count = 5 WHERE title = 'Xem sản phẩm';
UPDATE public.daily_tasks SET tracked_action = 'send_chat', required_count = 1 WHERE title = 'Tham gia Chat';
UPDATE public.daily_tasks SET tracked_action = 'view_post', required_count = 1 WHERE title = 'Xem bài viết';
UPDATE public.daily_tasks SET tracked_action = 'join_telegram', required_count = 1 WHERE title = 'Theo dõi Telegram';
UPDATE public.daily_tasks SET tracked_action = 'view_notification', required_count = 1 WHERE title = 'Xem thông báo';
UPDATE public.daily_tasks SET tracked_action = 'complete_profile', required_count = 1 WHERE title = 'Hoàn thành hồ sơ';
UPDATE public.daily_tasks SET tracked_action = 'referral', required_count = 1 WHERE task_type = 'referral';

-- Delete rating task as we don't have rating system
DELETE FROM public.daily_tasks WHERE title = 'Đánh giá sản phẩm';

-- Add trigger for updated_at
CREATE TRIGGER update_daily_action_progress_updated_at
BEFORE UPDATE ON public.daily_action_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
