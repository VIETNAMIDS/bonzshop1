-- Create user_coins table for user wallet/coin balance
CREATE TABLE IF NOT EXISTS public.user_coins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_coins
CREATE POLICY "Users can view their own coins" 
ON public.user_coins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coins" 
ON public.user_coins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coins" 
ON public.user_coins 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create sellers table
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_profile_complete BOOLEAN NOT NULL DEFAULT false,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_qr_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sellers
CREATE POLICY "Anyone can view sellers" 
ON public.sellers 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own seller profile" 
ON public.sellers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seller profile" 
ON public.sellers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create accounts table for selling social media accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  login_email TEXT,
  login_username TEXT,
  login_password TEXT,
  login_phone TEXT,
  additional_info TEXT,
  features TEXT[],
  is_sold BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  buyer_id UUID,
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts
CREATE POLICY "Anyone can view active unsold accounts" 
ON public.accounts 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Sellers can insert their own accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE id = seller_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Sellers can update their own accounts" 
ON public.accounts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE id = seller_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Sellers can delete their own accounts" 
ON public.accounts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE id = seller_id AND user_id = auth.uid()
  )
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id),
  product_id UUID REFERENCES public.products(id),
  seller_id UUID REFERENCES public.sellers(id),
  order_type TEXT NOT NULL DEFAULT 'account',
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  login_credentials JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = buyer_id OR 
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE id = seller_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Orders can be updated by buyer or seller" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = buyer_id OR 
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE id = seller_id AND user_id = auth.uid()
  )
);

-- Create chat_messages table for community chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  file_url TEXT,
  file_name TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
CREATE POLICY "Anyone can view non-deleted messages" 
ON public.chat_messages 
FOR SELECT 
USING (is_deleted = false);

CREATE POLICY "Authenticated users can insert messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" 
ON public.chat_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_user_coins_updated_at
BEFORE UPDATE ON public.user_coins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sellers_updated_at
BEFORE UPDATE ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();