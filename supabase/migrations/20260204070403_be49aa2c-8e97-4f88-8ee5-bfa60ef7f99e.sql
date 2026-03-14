-- Add missing columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS sold_to UUID;

-- Add sold_to column to accounts
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS sold_to UUID,
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Make order columns not required
ALTER TABLE public.orders ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN seller_id DROP NOT NULL;

-- Add slug column to categories if it doesn't have default value
ALTER TABLE public.categories ALTER COLUMN slug SET DEFAULT '';

-- Create public view for sellers to avoid direct relation issues
CREATE OR REPLACE VIEW public.sellers_public AS
SELECT id, display_name, avatar_url, description, is_verified
FROM public.sellers;