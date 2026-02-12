
-- Table to track active user sessions (single session enforcement)
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  os TEXT,
  browser TEXT,
  ip_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track device registrations (1 device = 1 account)
CREATE TABLE public.device_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL,
  user_id UUID NOT NULL,
  device_name TEXT,
  os TEXT,
  browser TEXT,
  user_agent TEXT,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on device_fingerprint for device_registrations
CREATE UNIQUE INDEX idx_device_registrations_fingerprint ON public.device_registrations(device_fingerprint);

-- Create index for fast session lookups
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view/manage their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: Device registrations - users can view their own, insert for themselves
CREATE POLICY "Users can view own device registrations" ON public.device_registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can check device registration" ON public.device_registrations
  FOR SELECT USING (true);

CREATE POLICY "Users can insert device registration" ON public.device_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for sessions (to detect kicks)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
