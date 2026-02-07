
-- Create discount_codes table for admin-managed discount codes
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percent')),
  min_order_amount INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can view active codes, only admins can manage
CREATE POLICY "Anyone can view active discount codes"
ON public.discount_codes
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage discount codes"
ON public.discount_codes
FOR ALL
USING (is_admin(auth.uid()));

-- Create table to track which users used which codes
CREATE TABLE public.discount_code_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_code_uses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own code uses"
ON public.discount_code_uses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own code uses"
ON public.discount_code_uses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all code uses"
ON public.discount_code_uses
FOR SELECT
USING (is_admin(auth.uid()));

-- Insert some default BONZ codes
INSERT INTO public.discount_codes (code, discount_amount, discount_type, min_order_amount) VALUES
('BONZ10K', 10, 'fixed', 50),
('BONZ20K', 20, 'fixed', 100),
('BONZ30K', 30, 'fixed', 150),
('BONZ40K', 40, 'fixed', 200),
('BONZ50K', 50, 'fixed', 250),
('BONZ100K', 100, 'fixed', 500),
('BONZVIP200K', 200, 'fixed', 1000);
