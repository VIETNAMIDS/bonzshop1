
-- QR Login sessions table
CREATE TABLE public.qr_login_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired')),
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '3 minutes'),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.qr_login_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create a QR session (desktop, no auth)
CREATE POLICY "Anyone can create QR sessions" ON public.qr_login_sessions
  FOR INSERT WITH CHECK (true);

-- Anyone can read QR sessions by token (for polling)
CREATE POLICY "Anyone can read QR sessions" ON public.qr_login_sessions
  FOR SELECT USING (true);

-- Authenticated users can confirm QR sessions
CREATE POLICY "Authenticated users can confirm QR sessions" ON public.qr_login_sessions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Enable realtime for instant QR confirmation
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_login_sessions;
