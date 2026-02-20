import { useState, useEffect, useCallback, useRef } from 'react';
import { QrCode, RefreshCw, Loader2, Smartphone, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

interface QrLoginDesktopProps {
  onLoginSuccess: () => void;
}

export default function QrLoginDesktop({ onLoginSuccess }: QrLoginDesktopProps) {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  const generateQrSession = useCallback(async () => {
    setIsLoading(true);
    setIsConfirmed(false);
    try {
      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { action: 'create' },
      });

      if (error) throw error;

      setQrToken(data.token);
      setExpiresAt(new Date(data.expires_at));
    } catch (err: any) {
      toast({
        title: 'Lỗi tạo mã QR',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Generate QR on mount
  useEffect(() => {
    generateQrSession();
  }, [generateQrSession]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!qrToken) return;

    channelRef.current = supabase
      .channel(`qr-login-${qrToken}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'qr_login_sessions',
          filter: `token=eq.${qrToken}`,
        },
        async (payload) => {
          if (payload.new.status === 'confirmed') {
            setIsConfirmed(true);
            const sessionData = payload.new.session_data as any;

            // Use the magic link token to verify OTP and create session
            try {
              const { error } = await supabase.auth.verifyOtp({
                token_hash: sessionData.token_hash,
                type: sessionData.verification_type || 'magiclink',
              });

              if (error) {
                toast({
                  title: 'Xác thực thất bại',
                  description: error.message,
                  variant: 'destructive',
                });
                return;
              }

              toast({
                title: '✅ Đăng nhập thành công',
                description: 'Chào mừng bạn!',
              });
              onLoginSuccess();
            } catch (err: any) {
              toast({
                title: 'Lỗi đăng nhập',
                description: err.message,
                variant: 'destructive',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [qrToken, onLoginSuccess, toast]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Use published URL if available, otherwise current origin
  const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const qrUrl = qrToken
    ? `${baseUrl}/qr-confirm?qr_token=${qrToken}`
    : '';

  const isExpired = timeLeft <= 0 && !isLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={bonzshopLogo} alt="BonzShop" className="h-40 w-auto object-contain" />
        </div>

        {/* QR Card */}
        <div className="glass rounded-2xl p-8 shadow-elevated">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Đăng nhập bằng QR</h2>
            <p className="text-muted-foreground text-sm">
              Mở app trên điện thoại và quét mã QR bên dưới
            </p>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center mb-6">
            <div className="relative bg-white rounded-2xl p-4 shadow-md">
              {isLoading ? (
                <div className="w-52 h-52 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : isConfirmed ? (
                <div className="w-52 h-52 flex flex-col items-center justify-center gap-3">
                  <CheckCircle className="h-16 w-16 text-primary" />
                  <p className="text-sm font-medium text-primary">Đã xác nhận!</p>
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : isExpired ? (
                <div className="w-52 h-52 flex flex-col items-center justify-center gap-3">
                  <QrCode className="h-16 w-16 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Mã QR đã hết hạn</p>
                </div>
              ) : (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=208x208&data=${encodeURIComponent(qrUrl)}&color=000000&bgcolor=FFFFFF&margin=0`}
                  alt="QR Login Code"
                  className="w-52 h-52"
                />
              )}
            </div>
          </div>

          {/* Timer & Refresh */}
          <div className="text-center space-y-3">
            {!isLoading && !isConfirmed && (
              <>
                {!isExpired && (
                  <p className="text-sm text-muted-foreground">
                    Hết hạn sau: <span className="font-mono font-bold text-primary">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateQrSession}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {isExpired ? 'Tạo mã QR mới' : 'Làm mới'}
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Smartphone className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Hướng dẫn:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Mở trình duyệt trên điện thoại</li>
                  <li>Đăng nhập vào tài khoản BonzShop</li>
                  <li>Quét mã QR này bằng camera hoặc app quét QR</li>
                  <li>Xác nhận đăng nhập trên điện thoại</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
