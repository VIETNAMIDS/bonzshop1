
-- Create keys table
CREATE TABLE public.keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  key_value TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_sold BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  seller_id UUID REFERENCES public.sellers(id),
  buyer_id UUID,
  sold_to UUID,
  sold_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.keys ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active unsold keys" ON public.keys
  FOR SELECT USING (is_active = true AND is_sold = false);

CREATE POLICY "Admins can manage all keys" ON public.keys
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Buyers can view their purchased keys" ON public.keys
  FOR SELECT USING (sold_to = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.keys;
