-- Add missing columns to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS account_password TEXT;

-- Create seller_coins table  
CREATE TABLE IF NOT EXISTS public.seller_coins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own coins" 
ON public.seller_coins 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid())
);

CREATE POLICY "Admins can manage seller coins" 
ON public.seller_coins 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add bank_qr_url to withdrawal_requests
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS bank_qr_url TEXT;

-- Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post likes" 
ON public.post_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can like posts" 
ON public.post_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" 
ON public.post_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-deleted comments" 
ON public.post_comments 
FOR SELECT 
USING (is_deleted = false);

CREATE POLICY "Authenticated users can comment" 
ON public.post_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.post_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_seller_coins_updated_at
BEFORE UPDATE ON public.seller_coins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();