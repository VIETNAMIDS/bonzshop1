
-- Buff MXH orders table
CREATE TABLE public.buff_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL DEFAULT 'tiktok',
  service_type TEXT NOT NULL, -- 'followers', 'likes', 'views', 'shares', 'comments'
  target_url TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 100,
  price_per_unit NUMERIC NOT NULL DEFAULT 1, -- xu per unit
  total_price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, cancelled, refunded
  admin_note TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buff_orders ENABLE ROW LEVEL SECURITY;

-- Users can create their own orders
CREATE POLICY "Users can create buff orders" ON public.buff_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own orders
CREATE POLICY "Users can view own buff orders" ON public.buff_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all buff orders
CREATE POLICY "Admins can view all buff orders" ON public.buff_orders
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can update buff orders
CREATE POLICY "Admins can update buff orders" ON public.buff_orders
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can delete buff orders
CREATE POLICY "Admins can delete buff orders" ON public.buff_orders
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Buff service pricing table (admin configurable)
CREATE TABLE public.buff_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'tiktok',
  service_type TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '🔥',
  price_per_unit NUMERIC NOT NULL DEFAULT 1,
  min_quantity INTEGER NOT NULL DEFAULT 100,
  max_quantity INTEGER NOT NULL DEFAULT 10000,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.buff_services ENABLE ROW LEVEL SECURITY;

-- Anyone can view active services
CREATE POLICY "Anyone can view active buff services" ON public.buff_services
  FOR SELECT USING (is_active = true);

-- Admins can manage services
CREATE POLICY "Admins can manage buff services" ON public.buff_services
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));
