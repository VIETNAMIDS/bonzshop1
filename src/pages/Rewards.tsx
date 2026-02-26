import { Navbar } from '@/components/Navbar';
import { DailyCheckin } from '@/components/gamification/DailyCheckin';
import { WheelOfFortune } from '@/components/gamification/WheelOfFortune';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Gift, Sparkles } from 'lucide-react';

export default function Rewards() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className={cn("transition-all duration-300 p-4 md:p-8", !isMobile && "ml-60")}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Phần thưởng</h1>
              <p className="text-sm text-muted-foreground">Điểm danh & quay thưởng mỗi ngày</p>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DailyCheckin />
            <WheelOfFortune />
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Mẹo nhận thêm xu
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Điểm danh liên tiếp 7 ngày để nhận xu bonus</li>
              <li>• Quay vòng quay may mắn 1 lần miễn phí mỗi ngày</li>
              <li>• Mời bạn bè đăng ký nhận 5 xu cho cả hai</li>
              <li>• Streak càng dài, xu nhận được càng nhiều</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
