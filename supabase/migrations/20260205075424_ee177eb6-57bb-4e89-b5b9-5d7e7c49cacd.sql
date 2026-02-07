-- Create zalo_bot_rentals table
CREATE TABLE public.zalo_bot_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  duration TEXT DEFAULT '1 tháng',
  features TEXT[] DEFAULT '{}',
  zalo_number TEXT DEFAULT '0785000270',
  icon TEXT DEFAULT 'Bot',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rental requests table
CREATE TABLE public.bot_rental_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bot_id UUID NOT NULL REFERENCES public.zalo_bot_rentals(id),
  status TEXT DEFAULT 'pending',
  receipt_url TEXT,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zalo_bot_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_rental_requests ENABLE ROW LEVEL SECURITY;

-- RLS for zalo_bot_rentals - everyone can read active bots
CREATE POLICY "Anyone can view active bots" ON public.zalo_bot_rentals
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage bots" ON public.zalo_bot_rentals
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS for bot_rental_requests
CREATE POLICY "Users can view their own requests" ON public.bot_rental_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests" ON public.bot_rental_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests" ON public.bot_rental_requests
  FOR ALL USING (public.is_admin(auth.uid()));

-- Insert default bots
INSERT INTO public.zalo_bot_rentals (name, description, price, duration, features, icon, sort_order) VALUES
('Bot Zalo Basic', 'Bot tự động trả lời tin nhắn cơ bản', 50000, '1 tháng', ARRAY['Tự động trả lời', 'Lời chào tự động', 'Hỗ trợ 24/7'], 'MessageCircle', 1),
('Bot Zalo Pro', 'Bot nâng cao với nhiều tính năng', 100000, '1 tháng', ARRAY['Tất cả tính năng Basic', 'Quản lý đơn hàng', 'Gửi tin nhắn hàng loạt', 'Thống kê chi tiết'], 'Zap', 2),
('Bot Zalo Enterprise', 'Bot chuyên nghiệp cho doanh nghiệp', 200000, '1 tháng', ARRAY['Tất cả tính năng Pro', 'Tùy chỉnh không giới hạn', 'API tích hợp', 'Hỗ trợ ưu tiên'], 'Crown', 3);

-- Add trigger for updated_at
CREATE TRIGGER update_zalo_bot_rentals_updated_at
  BEFORE UPDATE ON public.zalo_bot_rentals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_rental_requests_updated_at
  BEFORE UPDATE ON public.bot_rental_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();