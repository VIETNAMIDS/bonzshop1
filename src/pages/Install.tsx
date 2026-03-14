import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEOHead } from '@/components/seo/SEOHead';
import { Progress } from '@/components/ui/progress';
import { Download, Smartphone, Monitor, CheckCircle2, Zap, Wifi, WifiOff, Shield, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const isMobile = useIsMobile();
  const { user, userProfile } = useAuth();

  const reportInstall = useCallback(async () => {
    try {
      await supabase.functions.invoke('report-app-install', {
        body: {
          userName: userProfile?.display_name || user?.email?.split('@')[0] || 'Khách',
          userEmail: user?.email || null,
          userAgent: navigator.userAgent,
          referrer: document.referrer || window.location.hostname,
          appVersion: '1.2.0',
        },
      });
    } catch (e) {
      console.error('Report install failed:', e);
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setProgress(100);
      setProgressLabel('Cài đặt hoàn tất!');
      toast.success('Cài đặt thành công! 🎉');
      reportInstall();
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [reportInstall]);

  const simulateProgress = useCallback(() => {
    setProgress(0);
    setProgressLabel('Đang chuẩn bị...');
    
    const steps = [
      { p: 15, label: 'Đang tải tài nguyên...' },
      { p: 35, label: 'Đang tải icon & manifest...' },
      { p: 55, label: 'Đang cấu hình ứng dụng...' },
      { p: 75, label: 'Đang cài đặt Service Worker...' },
      { p: 90, label: 'Gần xong...' },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i].p);
        setProgressLabel(steps[i].label);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    const cleanup = simulateProgress();
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setProgress(100);
        setProgressLabel('Cài đặt hoàn tất!');
        setIsInstalled(true);
      } else {
        setProgress(0);
        setProgressLabel('');
      }
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
      cleanup();
    }
  };

  const features = [
    { icon: Zap, title: 'Mở nhanh như app thật', desc: 'Không cần mở trình duyệt, truy cập trực tiếp từ màn hình chính' },
    { icon: WifiOff, title: 'Hỗ trợ offline', desc: 'Vẫn xem được nội dung cơ bản khi mất mạng' },
    { icon: Shield, title: 'An toàn & bảo mật', desc: 'Không cần tải từ nguồn lạ, cài trực tiếp từ website chính thức' },
    { icon: Wifi, title: 'Tự động cập nhật', desc: 'Luôn là phiên bản mới nhất, không cần cập nhật thủ công' },
  ];

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Tải ứng dụng BonzShop"
        description="Cài đặt ứng dụng BonzShop trực tiếp trên điện thoại hoặc máy tính. Truy cập nhanh, hỗ trợ offline."
        canonicalPath="/install"
      />
      <Navbar />
      <PageWrapper>
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/20 mb-6 animate-pulse">
                <Download className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Tải <span className="text-gradient">BonzShop</span> App
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Cài đặt ứng dụng trực tiếp trên {isMobile ? 'điện thoại' : 'máy tính'} của bạn.
                Không cần App Store hay CH Play!
              </p>
            </div>

            {/* Main CTA */}
            <div className="text-center mb-12">
              {isInstalled ? (
                <Card className="glass p-8 border-accent/30 inline-block">
                  <div className="flex items-center gap-3 text-accent">
                    <CheckCircle2 className="w-8 h-8" />
                    <div className="text-left">
                      <p className="text-xl font-bold">Đã cài đặt!</p>
                      <p className="text-sm text-muted-foreground">BonzShop đã có trên thiết bị của bạn</p>
                    </div>
                  </div>
                </Card>
              ) : deferredPrompt ? (
                <div className="space-y-4">
                  <Button
                    size="lg"
                    onClick={handleInstall}
                    disabled={installing}
                    className="text-xl px-12 py-8 gap-3 rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105"
                  >
                    {installing ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : (
                      <Download className="w-7 h-7" />
                    )}
                    {installing ? 'Đang cài đặt...' : 'Tải xuống ngay'}
                  </Button>
                  <p className="text-sm text-muted-foreground">Miễn phí • Dung lượng nhẹ • Cài trong 3 giây</p>

                  {/* Progress bar */}
                  {(installing || progress > 0) && (
                    <div className="max-w-sm mx-auto space-y-2 mt-4">
                      <Progress value={progress} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progressLabel}</span>
                        <span className="font-mono font-bold text-primary">{progress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Card className="glass p-8 border-border/50">
                  <div className="space-y-4">
                    <p className="text-lg font-semibold">Hướng dẫn cài đặt thủ công</p>

                    {isIOS ? (
                      <div className="space-y-3 text-left max-w-sm mx-auto">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-primary" />
                          <h3 className="font-bold">iPhone / iPad (Safari)</h3>
                        </div>
                        <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                          <li>Mở trang web bằng <strong className="text-foreground">Safari</strong></li>
                          <li>Nhấn nút <strong className="text-foreground">Chia sẻ</strong> (⎙ icon mũi tên lên)</li>
                          <li>Cuộn xuống chọn <strong className="text-foreground">"Thêm vào MH chính"</strong></li>
                          <li>Nhấn <strong className="text-foreground">"Thêm"</strong> để xác nhận</li>
                        </ol>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-6 text-left">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-primary" />
                            <h3 className="font-bold">Android (Chrome)</h3>
                          </div>
                          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                            <li>Mở trang web bằng <strong className="text-foreground">Chrome</strong></li>
                            <li>Nhấn <strong className="text-foreground">⋮</strong> (menu 3 chấm)</li>
                            <li>Chọn <strong className="text-foreground">"Cài đặt ứng dụng"</strong></li>
                            <li>Nhấn <strong className="text-foreground">"Cài đặt"</strong></li>
                          </ol>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-primary" />
                            <h3 className="font-bold">Máy tính (Chrome / Edge)</h3>
                          </div>
                          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                            <li>Nhấn icon <strong className="text-foreground">cài đặt</strong> ở thanh địa chỉ</li>
                            <li>Hoặc <strong className="text-foreground">Menu → Cài đặt ứng dụng</strong></li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((f) => (
                <Card key={f.title} className="glass p-6 border-border/50 card-hover">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </PageWrapper>
    </div>
  );
}
