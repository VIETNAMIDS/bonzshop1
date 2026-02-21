import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollReveal, CountUp } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface TopUser {
  user_id: string;
  total: number;
  display_name: string;
  avatar_url: string | null;
}

const rankIcons = ['🥇', '🥈', '🥉'];

export function TopDepositSection() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchTopDepositors();
  }, []);

  const fetchTopDepositors = async () => {
    const { data: purchases } = await supabase
      .from('coin_purchases')
      .select('user_id, amount')
      .eq('status', 'approved');

    if (!purchases || purchases.length === 0) return;

    const userTotals: Record<string, number> = {};
    purchases.forEach(p => {
      userTotals[p.user_id] = (userTotals[p.user_id] || 0) + p.amount;
    });

    const sorted = Object.entries(userTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 100);

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

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
    return amount.toString();
  };

  const displayUsers = showAll ? topUsers : topUsers.slice(0, 10);

  return (
    <section className="py-12 md:py-16 px-4 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-warning/5 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto relative">
        <ScrollReveal variant="fadeUp">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 border border-warning/30 flex items-center justify-center">
              <Crown className="h-7 w-7 text-warning" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Top nạp xu</h2>
              <p className="text-sm text-muted-foreground">Bảng xếp hạng {topUsers.length} thành viên nạp xu nhiều nhất</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Top 3 highlight */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-8">
          {topUsers.slice(0, 3).map((user, index) => {
            const order = [1, 0, 2]; // Show #2, #1, #3 for podium effect
            const i = order[index];
            const u = topUsers[i];
            if (!u) return null;
            return (
              <motion.div
                key={u.user_id}
                className={`relative p-4 md:p-6 rounded-2xl bg-card border text-center ${
                  i === 0 ? 'border-warning/50 -mt-0 md:-mt-4 shadow-[0_0_40px_hsl(38_92%_50%/0.15)]' : 'border-border/50'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
              >
                <span className="text-2xl md:text-3xl block mb-2">{rankIcons[i]}</span>
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-xl ${
                  i === 0 ? 'ring-2 ring-warning ring-offset-2 ring-offset-card' : ''
                } bg-gradient-to-br from-secondary to-muted overflow-hidden`}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    '👤'
                  )}
                </div>
                <p className="font-semibold text-foreground text-xs md:text-sm mb-1 truncate">{maskName(u.display_name)}</p>
                <div className="flex items-center justify-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-warning" />
                  <span className="font-bold text-warning text-sm md:text-base">{formatAmount(u.total)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Full leaderboard table */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="w-10 text-center">Hạng</span>
            <span>Thành viên</span>
            <span className="text-right">Tổng nạp</span>
          </div>
          <div className="divide-y divide-border/30">
            {displayUsers.map((user, index) => (
              <motion.div
                key={user.user_id}
                className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 items-center hover:bg-secondary/30 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.5) }}
              >
                <div className="w-10 text-center">
                  {index < 3 ? (
                    <span className="text-lg">{rankIcons[index]}</span>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-sm shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{maskName(user.display_name)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-warning" />
                  <span className="text-sm font-bold text-warning">{user.total.toLocaleString('vi-VN')}</span>
                  <span className="text-xs text-muted-foreground">xu</span>
                </div>
              </motion.div>
            ))}
          </div>

          {topUsers.length > 10 && (
            <div className="p-4 text-center border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="rounded-full"
              >
                {showAll ? (
                  <>Thu gọn <ChevronUp className="h-4 w-4 ml-1" /></>
                ) : (
                  <>Xem tất cả {topUsers.length} người <ChevronDown className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
