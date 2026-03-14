import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DURATION = 4 * 60 * 60 * 1000; // 4h

function isStandaloneMode() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0');
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowDialog(true);
    };

    const handleAppInstalled = () => {
      setShowBanner(false);
      setShowDialog(false);
      supabase.functions
        .invoke('report-app-install', {
          body: {
            userName: 'Khách (auto-prompt)',
            userEmail: null,
            userAgent: navigator.userAgent,
            referrer: document.referrer || window.location.hostname,
            appVersion: '1.2.0',
          },
        })
        .catch(console.error);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const timer = window.setTimeout(() => {
      setShowDialog(true);
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setShowDialog(false);
      }
      setDeferredPrompt(null);
      return;
    }

    setShowDialog(false);
    window.location.href = '/install';
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowDialog(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <>
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-primary" />
              Cài đặt BonzShop App
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Tải app BonzShop về điện thoại để truy cập nhanh hơn!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Download className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">BonzShop - Marketplace #1 VN</p>
                <p className="text-xs text-muted-foreground">Mua bán tài khoản & source code uy tín</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✅ Truy cập nhanh từ màn hình chính</li>
              <li>✅ Nhận thông báo đơn hàng</li>
              <li>✅ Hoạt động mượt như app gốc</li>
              <li>✅ Không cần tải từ App Store</li>
            </ul>
            {isIOS ? (
              <div className="p-3 rounded-lg bg-muted text-sm space-y-2">
                <p className="font-medium">📱 Hướng dẫn trên iPhone:</p>
                <p>Nhấn nút <strong>Chia sẻ</strong> (⎙) → <strong>Thêm vào MH chính</strong></p>
                <Button onClick={handleInstall} className="w-full gap-2" size="lg">
                  <Download className="h-5 w-5" />
                  Mở trang tải app
                </Button>
              </div>
            ) : (
              <Button onClick={handleInstall} className="w-full gap-2" size="lg">
                <Download className="h-5 w-5" />
                {deferredPrompt ? 'Cài đặt ngay' : 'Mở trang tải app'}
              </Button>
            )}
            <button onClick={handleDismiss} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1">
              Để sau
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {showBanner && !showDialog && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-5">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Cài đặt BonzShop App</p>
              <p className="text-xs text-muted-foreground">Truy cập nhanh từ màn hình chính!</p>
            </div>
            <Button size="sm" onClick={handleInstall} className="shrink-0">
              Cài đặt
            </Button>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
