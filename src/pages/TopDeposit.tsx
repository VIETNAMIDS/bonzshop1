import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Coins, ChevronDown, ChevronUp, Trophy, Medal, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollReveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TopUser {
  user_id: string;
  total: number;
  display_name: string;
  avatar_url: string | null;
}

const rankIcons = ['🥇', '🥈', '🥉'];

export default function TopDeposit() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const isMobile = useIsMobile();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchTopDepositors();
  }, [user]);

  const fetchTopDepositors = async () => {
    setLoading(true);
    try {
      const { data: purchases } = await supabase
        .from('coin_purchases')
        .select('user_id, amount')
        .eq('status', 'approved');

      if (!purchases || purchases.length === 0) {
        setLoading(false);
        return;
      }

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
    } catch (err) {
      console.error('Error fetching top depositors:', err);
    } finally {
      setLoading(false);
    }
  };

  const maskName = (name: string) => {
    if (name.length <= 2) return name + '***';
    return name.substring(0, 2) + '***';
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('vi-VN');
  };

  const displayUsers = showAll ? topUsers : topUsers.slice(0, 10);

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className={cn("transition-all duration-300 py-6 px-4", !isMobile && "ml-60")}>
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <ScrollReveal variant="fadeUp">
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 border border-warning/30 flex items-center justify-center">
                <Crown className="h-7 w-7 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bảng xếp hạng nạp xu</h1>
                <p className="text-sm text-muted-foreground">Top {topUsers.length} thành viên nạp xu nhiều nhất</p>
              </div>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : topUsers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Chưa có dữ liệu nạp xu</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-8 mt-8">
                {[1, 0, 2].map((i, index) => {
                  const u = topUsers[i];
                  if (!u) return <div key={index} />;
                  return (
                    <motion.div
                      key={u.user_id}
                      className={cn(
                        "relative p-4 md:p-6 rounded-2xl bg-card border text-center",
                        i === 0
                          ? 'border-warning/50 -mt-0 md:-mt-4 shadow-[0_0_40px_hsl(38_92%_50%/0.15)]'
                          : 'border-border/50'
                      )}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.15 }}
                    >
                      <span className="text-3xl md:text-4xl block mb-3">{rankIcons[i]}</span>
                      <div
                        className={cn(
                          "w-14 h-14 md:w-20 md:h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl bg-gradient-to-br from-secondary to-muted overflow-hidden",
                          i === 0 && 'ring-2 ring-warning ring-offset-2 ring-offset-card'
                        )}
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          '👤'
                        )}
                      </div>
                      <p className="font-semibold text-foreground text-sm md:text-base mb-1 truncate">
                        {maskName(u.display_name)}
                      </p>
                      <div className="flex items-center justify-center gap-1.5">
                        <Coins className="h-4 w-4 text-warning" />
                        <span className="font-bold text-warning text-base md:text-lg">
                          {formatAmount(u.total)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">xu</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Full Leaderboard Table */}
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
                        <span className="text-sm font-medium text-foreground truncate">
                          {maskName(user.display_name)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-warning" />
                        <span className="text-sm font-bold text-warning">{formatAmount(user.total)}</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
