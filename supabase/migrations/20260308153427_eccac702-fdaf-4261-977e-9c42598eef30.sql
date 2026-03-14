
CREATE TABLE public.bot_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'gemini',
  api_key text NOT NULL,
  model text NOT NULL DEFAULT 'gemini-2.0-flash',
  base_url text NOT NULL DEFAULT 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  is_active boolean NOT NULL DEFAULT true,
  usage_count bigint NOT NULL DEFAULT 0,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.bot_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot api keys"
  ON public.bot_api_keys FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));
