-- ========================================
-- 1. Friendships table for friend system
-- ========================================
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Policies for friendships
CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of"
ON public.friendships FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friend requests"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ========================================
-- 2. Private messages table for DM with admin and friends
-- ========================================
CREATE TABLE public.private_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_recalled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Policies for private messages
CREATE POLICY "Users can view their own messages"
ON public.private_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.private_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders can recall their messages"
ON public.private_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- ========================================
-- 3. Site settings table for admin to manage videos, intro text
-- ========================================
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings
CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR ALL
USING (public.is_admin(auth.uid()));

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES 
  ('hero_video_url', ''),
  ('hero_title', 'Chào mừng đến với BonzShop'),
  ('hero_subtitle', 'Nền tảng mua bán tài khoản game và sản phẩm số uy tín nhất'),
  ('about_content', 'BonzShop là nền tảng uy tín hàng đầu cho việc mua bán tài khoản game và sản phẩm số. Chúng tôi cam kết mang đến trải nghiệm an toàn và tiện lợi nhất cho người dùng.'),
  ('onboarding_welcome', 'Chào mừng bạn đến với BonzShop!'),
  ('onboarding_step1', 'Khám phá hàng nghìn sản phẩm chất lượng'),
  ('onboarding_step2', 'Mua sắm an toàn với hệ thống xu'),
  ('onboarding_step3', 'Chat và kết bạn với cộng đồng');

-- ========================================
-- 4. User onboarding tracking
-- ========================================
CREATE TABLE public.user_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
ON public.user_onboarding FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
ON public.user_onboarding FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
ON public.user_onboarding FOR UPDATE
USING (auth.uid() = user_id);

-- ========================================
-- 5. Add message_color and effects to chat_messages
-- ========================================
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS gradient_color TEXT,
ADD COLUMN IF NOT EXISTS is_recalled BOOLEAN NOT NULL DEFAULT false;

-- Enable realtime for private messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;