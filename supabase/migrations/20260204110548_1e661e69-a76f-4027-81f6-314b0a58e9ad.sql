-- Create scam_reports table for admin to post about scammers
CREATE TABLE public.scam_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  scammer_name TEXT,
  scammer_contact TEXT,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  image_url TEXT,
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'active', -- active, resolved
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scam_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can view active scam reports
CREATE POLICY "Anyone can view active scam reports"
ON public.scam_reports
FOR SELECT
USING (status = 'active');

-- Admins can manage all scam reports
CREATE POLICY "Admins can manage scam reports"
ON public.scam_reports
FOR ALL
USING (is_admin(auth.uid()));

-- Enable realtime for scam_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.scam_reports;