
-- Add column to indicate account requires buyer's email for activation
ALTER TABLE public.accounts ADD COLUMN requires_buyer_email boolean NOT NULL DEFAULT false;

-- Add column to orders to store buyer's activation email  
ALTER TABLE public.orders ADD COLUMN buyer_email text;
