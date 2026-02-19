
-- Tighten INSERT policy: only allow inserting with default values (no confirmed_by, pending status)
DROP POLICY "Anyone can create QR sessions" ON public.qr_login_sessions;
CREATE POLICY "Anyone can create QR sessions" ON public.qr_login_sessions
  FOR INSERT WITH CHECK (status = 'pending' AND confirmed_by IS NULL);
