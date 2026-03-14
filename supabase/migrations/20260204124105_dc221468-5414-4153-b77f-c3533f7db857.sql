-- Add Telegram settings to site_settings
INSERT INTO public.site_settings (key, value) 
VALUES 
  ('telegram_bot_token', null),
  ('telegram_chat_id', null)
ON CONFLICT (key) DO NOTHING;