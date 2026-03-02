import { useState, useEffect } from 'react';
import { CalendarCheck, Flame, Coins, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function DailyCheckin() {
  const { user } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);

  useEffect(() => {
    if (user) checkTodayStatus();
  }, [user]);

  const checkTodayStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await (supabase as any)
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user!.id)
      .eq('checkin_date', today)
      .maybeSingle();

    if (data) {
      setCheckedIn(true);
      setStreak(data.streak);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data: yesterdayData } = await (supabase as any)
        .from('daily_checkins')
        .select('streak')
        .eq('user_id', user!.id)
        .eq('checkin_date', yesterday.toISOString().split('T')[0])
        .maybeSingle();
      setStreak(yesterdayData?.streak || 0);
    }
  };

  const handleCheckin = async () => {
    if (!user || checkedIn || loading) return;
    setLoading(true);

    try {
      const newStreak = streak + 1;
      const bonusCoins = Math.min(Math.floor(newStreak / 7), 5);
      const coins = 1 + bonusCoins;

      const today = new Date().toISOString().split('T')[0];
      const { error } = await (supabase as any)
        .from('daily_checkins')
        .insert({
          user_id: user.id,
          checkin_date: today,
          streak: newStreak,
          coins_earned: coins,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Bạn đã điểm danh hôm nay rồi!');
          setCheckedIn(true);
          return;
        }
        throw error;
      }

      // Add coins
      const { data: userCoins } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (userCoins) {
        await supabase
          .from('user_coins')
          .update({ balance: userCoins.balance + coins })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_coins')
          .insert({ user_id: user.id, balance: coins });
      }

      await supabase.from('coin_history').insert({
        user_id: user.id,
        amount: coins,
        type: 'daily_checkin',
        description: `Điểm danh ngày ${newStreak} liên tiếp (+${coins} xu)`,
      });

      setCheckedIn(true);
      setStreak(newStreak);
      setEarnedCoins(coins);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 3000);
      toast.success(`🎉 Điểm danh thành công! +${coins} xu`);
    } catch (err) {
      console.error('Checkin error:', err);
      toast.error('Không thể điểm danh, thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  const streakDays = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden relative">
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -20 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <Gift className="h-16 w-16 text-primary mx-auto mb-2" />
              </motion.div>
              <p className="text-2xl font-black text-primary">+{earnedCoins} xu</p>
              <p className="text-sm text-muted-foreground">Điểm danh thành công!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Điểm danh hàng ngày
          {streak > 0 && (
            <Badge variant="secondary" className="ml-auto gap-1">
              <Flame className="h-3 w-3 text-destructive" />
              {streak} ngày
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1.5 justify-center">
          {streakDays.map((day) => {
            const isCompleted = day <= (streak % 7 || (checkedIn ? 7 : 0));
            return (
              <div
                key={day}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground scale-105'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleCheckin}
          disabled={checkedIn || loading}
          className="w-full gap-2"
          variant={checkedIn ? 'outline' : 'gradient'}
        >
          {checkedIn ? (
            <>✅ Đã điểm danh hôm nay</>
          ) : loading ? (
            <>Đang xử lý...</>
          ) : (
            <>
              <Coins className="h-4 w-4" />
              Điểm danh nhận xu
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
