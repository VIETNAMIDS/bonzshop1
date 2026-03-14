-- Add target_user_id column to discount_codes for user-specific codes
ALTER TABLE public.discount_codes 
ADD COLUMN IF NOT EXISTS target_user_id UUID DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.discount_codes.target_user_id IS 'If set, only this specific user can use the discount code';

-- Create an index for faster lookup
CREATE INDEX IF NOT EXISTS idx_discount_codes_target_user ON public.discount_codes(target_user_id) WHERE target_user_id IS NOT NULL;