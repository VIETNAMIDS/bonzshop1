-- Add missing columns to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS account_email TEXT,
ADD COLUMN IF NOT EXISTS account_phone TEXT;

-- Add missing columns to seller_coins table
ALTER TABLE public.seller_coins 
ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0;

-- Add missing columns to sellers table
ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add missing column to orders table for user_id (alias for buyer_id)
-- Note: We'll use buyer_id as user_id in queries

-- Add storage bucket for chat files if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for chat files
CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);