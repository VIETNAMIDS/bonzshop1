-- Create child_websites table for "Web Con" feature
CREATE TABLE public.child_websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  primary_color VARCHAR(20) DEFAULT '#8B5CF6',
  secondary_color VARCHAR(20) DEFAULT '#D946EF',
  banner_url TEXT,
  bank_name VARCHAR(100),
  bank_account_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_qr_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create child_website_products table for products in child websites
CREATE TABLE public.child_website_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES public.child_websites(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.child_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_website_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for child_websites
CREATE POLICY "Anyone can view active child websites"
ON public.child_websites
FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can view their own websites"
ON public.child_websites
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own websites"
ON public.child_websites
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own websites"
ON public.child_websites
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own websites"
ON public.child_websites
FOR DELETE
USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all child websites"
ON public.child_websites
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for child_website_products
CREATE POLICY "Anyone can view products of active websites"
ON public.child_website_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.child_websites 
    WHERE id = website_id AND is_active = true
  )
);

CREATE POLICY "Website owners can manage their products"
ON public.child_website_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.child_websites 
    WHERE id = website_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all child website products"
ON public.child_website_products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_child_websites_updated_at
BEFORE UPDATE ON public.child_websites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_child_websites_owner ON public.child_websites(owner_id);
CREATE INDEX idx_child_websites_slug ON public.child_websites(slug);
CREATE INDEX idx_child_website_products_website ON public.child_website_products(website_id);