
-- Create daily_checkins table
CREATE TABLE public.daily_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  streak integer NOT NULL DEFAULT 1,
  coins_earned integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- Enable RLS
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own checkins" ON public.daily_checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins" ON public.daily_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create wheel_spins table
CREATE TABLE public.wheel_spins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  spin_date date NOT NULL DEFAULT CURRENT_DATE,
  prize_label text NOT NULL,
  coins_won integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

-- Enable RLS
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own spins" ON public.wheel_spins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spins" ON public.wheel_spins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
