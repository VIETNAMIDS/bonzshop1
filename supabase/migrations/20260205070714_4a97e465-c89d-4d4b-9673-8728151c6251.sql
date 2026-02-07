
-- Create daily_tasks table for available tasks
CREATE TABLE public.daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  coin_reward INTEGER NOT NULL DEFAULT 1,
  task_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'referral', 'social', 'daily_login'
  icon TEXT DEFAULT '🎯',
  action_url TEXT, -- URL to redirect for task completion
  action_type TEXT DEFAULT 'click', -- 'click', 'visit', 'share', 'auto'
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_completions table to track user completions
CREATE TABLE public.task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  coins_earned INTEGER NOT NULL DEFAULT 0,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, task_id, completion_date)
);

-- Create referrals table for invite system
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL, -- user who invited
  referred_id UUID NOT NULL, -- user who was invited
  referral_code TEXT NOT NULL,
  coins_rewarded INTEGER DEFAULT 5,
  is_rewarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rewarded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_id)
);

-- Add referral_code to profiles for invite links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Enable RLS
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies for daily_tasks (public read, admin write)
CREATE POLICY "Anyone can view active tasks" 
ON public.daily_tasks FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage tasks" 
ON public.daily_tasks FOR ALL 
USING (public.is_admin(auth.uid()));

-- Policies for task_completions
CREATE POLICY "Users can view own completions" 
ON public.task_completions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions" 
ON public.task_completions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policies for referrals
CREATE POLICY "Users can view own referrals as referrer" 
ON public.referrals FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "Anyone can insert referrals" 
ON public.referrals FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update referrals" 
ON public.referrals FOR UPDATE 
USING (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.user_id::text || NOW()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate referral code for new profiles
CREATE TRIGGER generate_profile_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(MD5(user_id::text || NOW()::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Insert sample daily tasks
INSERT INTO public.daily_tasks (title, description, coin_reward, task_type, icon, action_type, sort_order) VALUES
('Mời bạn bè', 'Mời bạn bè đăng ký tài khoản để nhận thưởng', 5, 'referral', '👥', 'share', 1),
('Đăng nhập hàng ngày', 'Đăng nhập mỗi ngày để nhận xu', 2, 'daily_login', '📅', 'auto', 2),
('Xem sản phẩm', 'Xem ít nhất 5 sản phẩm', 3, 'general', '👀', 'visit', 3),
('Chia sẻ Facebook', 'Chia sẻ trang web lên Facebook', 2, 'social', '📱', 'share', 4),
('Tham gia Chat', 'Gửi 1 tin nhắn trong phòng chat', 2, 'general', '💬', 'click', 5),
('Xem bài viết', 'Đọc 1 bài viết trên trang', 1, 'general', '📖', 'visit', 6),
('Theo dõi Telegram', 'Tham gia kênh Telegram của chúng tôi', 3, 'social', '📢', 'click', 7),
('Đánh giá sản phẩm', 'Để lại đánh giá cho 1 sản phẩm đã mua', 4, 'general', '⭐', 'click', 8),
('Hoàn thành hồ sơ', 'Cập nhật đầy đủ thông tin cá nhân', 5, 'general', '👤', 'click', 9),
('Xem thông báo', 'Kiểm tra và đọc thông báo mới', 1, 'general', '🔔', 'click', 10);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_tasks_updated_at
BEFORE UPDATE ON public.daily_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
