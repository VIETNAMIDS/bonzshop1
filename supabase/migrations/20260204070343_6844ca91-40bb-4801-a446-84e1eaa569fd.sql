-- Add user_id column as alias reference to buyer_id for backward compatibility
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update existing rows to have user_id = buyer_id
UPDATE public.orders SET user_id = buyer_id WHERE user_id IS NULL;

-- Add trigger to keep user_id in sync with buyer_id
CREATE OR REPLACE FUNCTION public.sync_order_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = COALESCE(NEW.user_id, NEW.buyer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sync_orders_user_id
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_user_id();

-- Add processed_by column to withdrawal_requests
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS processed_by UUID;