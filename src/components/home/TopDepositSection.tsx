import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Coins, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollReveal, StaggerContainer, StaggerItem, CountUp } from '@/components/motion';

interface TopUser {
  user_id: string;
  total: number;
  display_name: string;
  avatar_url: string | null;
}

const rankColors = [
  'from-warning to-warning/70 text-warning-foreground',
  'from-muted-foreground/60 to-muted-foreground/40 text-foreground',
  'from-[hsl(20,90%,55%)] to-[hsl(20,90%,45%)] text-foreground',
];

const rankIcons = ['🥇', '🥈', '🥉'];

export function TopDepositSection() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);

  useEffect(() => {
    fetchTopDepositors();
  }, []);

  const fetchTopDepositors = async () => {
    // Get approved coin purchases grouped by user
    const { data: purchases } = await supabase
      .from('coin_purchases')
      .select('user_id, amount')
      .eq('status', 'approved');

    if (!purchases || purchases.length === 0) return;

    // Aggregate by user
    const userTotals: Record<string, number> = {};
    purchases.forEach(p => {
      userTotals[p.user_id] = (userTotals[p.user_id] || 0) + p.amount;
    });

    // Sort and take top 5
    const sorted = Object.entries(userTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Get profiles
    const userIds = sorted.map(([id]) => id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    const profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {};
    profiles?.forEach(p => {
      profileMap[p.user_id] = { display_name: p.display_name || 'Ẩn danh', avatar_url: p.avatar_url };
    });

    const result: TopUser[] = sorted.map(([userId, total]) => ({
      user_id: userId,
      total,
      display_name: profileMap[userId]?.display_name || 'Ẩn danh',
      avatar_url: profileMap[userId]?.avatar_url || null,
    }));

    setTopUsers(result);
  };

  if (topUsers.length === 0) return null;

  const maskName = (name: string) => {
    if (name.length <= 2) return name + '***';
    return name.substring(0, 2) + '***';
  };

  return (
    <section className="py-12 md:py-16 px-4 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-warning/5 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto relative">
        <ScrollReveal variant="fadeUp">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 border border-warning/30 flex items-center justify-center">
              <Crown className="h-7 w-7 text-warning" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Top nạp xu</h2>
              <p className="text-sm text-muted-foreground">Những thành viên nạp xu nhiều nhất</p>
            </div>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" staggerDelay={0.1}>
          {topUsers.map((user, index) => (
            <StaggerItem key={user.user_id}>
              <motion.div
                className="relative p-5 rounded-2xl bg-card border border-border/50 hover:border-warning/30 transition-all duration-300 text-center"
                whileHover={{ y: -6, boxShadow: '0 20px 50px -15px hsl(38 92% 50% / 0.15)' }}
              >
                {/* Rank badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {index < 3 ? (
                    <span className="text-2xl">{rankIcons[index]}</span>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                    </div>
                  )}
                </div>

                {/* Avatar */}
                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl ${
                  index === 0 ? 'ring-2 ring-warning ring-offset-2 ring-offset-card' : ''
                } bg-gradient-to-br from-secondary to-muted`}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '👤'
                  )}
                </div>

                {/* Name */}
                <p className="font-semibold text-foreground text-sm mb-1">{maskName(user.display_name)}</p>

                {/* Total */}
                <div className="flex items-center justify-center gap-1">
                  <Coins className="h-4 w-4 text-warning" />
                  <span className="font-bold text-warning">
                    <CountUp end={user.total} />
                  </span>
                  <span className="text-xs text-muted-foreground">xu</span>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
