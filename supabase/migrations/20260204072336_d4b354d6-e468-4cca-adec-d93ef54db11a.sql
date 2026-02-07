-- Create otp_codes table for storing OTP verification codes
CREATE TABLE public.otp_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    code text NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No public policies needed - this table is only accessed by service role key in edge functions