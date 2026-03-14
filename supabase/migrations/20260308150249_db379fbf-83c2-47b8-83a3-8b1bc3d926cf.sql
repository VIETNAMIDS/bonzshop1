
CREATE OR REPLACE FUNCTION public.auto_moderate_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip if already deleted or system messages
  IF NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;

  -- Skip for admins
  IF public.is_admin(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Check for inappropriate content (same patterns as client-side)
  IF NEW.content ~* '\m(sex|porn|xxx|nude|nsfw|hentai|javhd|jav|onlyfan)\M'
    OR NEW.content ~* '(khi[eê]u\s*d[aâ]m|d[aâ]m\s*d[uụ]c|th[uủ]\s*d[aâ]m|l[oồ]n|c[aặ]c|đ[iị]t|đ[uụ]|ch[iị]ch|lo[aạ]n\s*lu[aâ]n|h[ií]p\s*d[aâ]m)'
    OR NEW.content ~* '\m(gi[eế]t\s*ng[uư][oờ]i|m[aạ]i\s*d[aâ]m|ma\s*t[uú]y|c[aầ]n\s*sa|thu[oố]c\s*l[aắ]c|heroin|cocaine|ketamine|ecstasy)\M'
    OR NEW.content ~* '\m(hack|ddos|c[aạ]rd|carding|scam|phish|keylog|trojan|malware|ransomware|exploit|bypass|crack|fake\s*login|rat\s*tool)\M'
    OR NEW.content ~* '(l[uừ]a\s*đ[aả]o|b[oẻ]\s*kh[oó]a|ch[eế]at)'
  THEN
    NEW.is_deleted := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_auto_moderate_chat ON public.chat_messages;

-- Create trigger BEFORE INSERT
CREATE TRIGGER trg_auto_moderate_chat
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_moderate_chat_message();
