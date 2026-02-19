import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, XCircle, Loader2, ShieldCheck, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

type ScanState = 'scanning' | 'confirm' | 'confirming' | 'success' | 'error';

export default function QrScannerPage() {
  const [state, setState] = useState<ScanState>('scanning');
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Initialize scanner
  useEffect(() => {
    if (state !== 'scanning') return;

    let html5QrcodeScanner: any = null;

    const initScanner = async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (!containerRef.current) return;

      html5QrcodeScanner = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrcodeScanner;

      try {
        await html5QrcodeScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            // Parse the QR URL to extract token
            try {
              const url = new URL(decodedText);
              const token = url.searchParams.get('qr_token');
              if (token) {
                setScannedToken(token);
                setState('confirm');
                // Stop scanner
                html5QrcodeScanner.stop().catch(() => {});
              }
            } catch {
              // Not a valid URL, ignore
            }
          },
          () => {
            // QR code scan error (ignore, keep scanning)
          }
        );
      } catch (err: any) {
        console.error('Camera error:', err);
        setErrorMsg('Không thể mở camera. Vui lòng cấp quyền truy cập camera.');
        setState('error');
      }
    };

    initScanner();

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().catch(() => {});
      }
    };
  }, [state]);

  const handleConfirm = async () => {
    if (!scannedToken || !user) return;

    setState('confirming');
    try {
      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { action: 'confirm', token: scannedToken },
      });

      if (error) throw error;
      if (data.error) {
        setErrorMsg(data.error === 'QR code expired' ? 'Mã QR đã hết hạn' : data.error);
        setState('error');
        return;
      }

      setState('success');
      toast({
        title: '✅ Xác nhận thành công',
        description: 'Máy tính đã được đăng nhập!',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi');
      setState('error');
    }
  };

  const handleRetry = () => {
    setScannedToken(null);
    setErrorMsg('');
    setState('scanning');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass rounded-2xl p-6 shadow-elevated text-center max-w-sm w-full">
          <QrCode className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Đăng nhập trước</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Bạn cần đăng nhập trên điện thoại trước khi quét QR.
          </p>
          <Button onClick={() => navigate('/auth')} variant="gradient" className="w-full">
            Đăng nhập ngay
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-sm mx-auto pt-4">
        {/* Header */}
        <div className="flex justify-center mb-4">
          <img src={bonzshopLogo} alt="BonzShop" className="h-16 w-auto object-contain" />
        </div>

        <div className="glass rounded-2xl p-5 shadow-elevated">
          {/* Scanning State */}
          {state === 'scanning' && (
            <div className="space-y-4">
              <div className="text-center">
                <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-bold">Quét mã QR</h2>
                <p className="text-xs text-muted-foreground">
                  Hướng camera vào mã QR trên màn hình máy tính
                </p>
              </div>

              <div
                id="qr-reader"
                ref={containerRef}
                className="rounded-xl overflow-hidden border-2 border-primary/30"
              />

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate(-1)}
              >
                Hủy
              </Button>
            </div>
          )}

          {/* Confirm State */}
          {state === 'confirm' && (
            <div className="text-center space-y-4 py-4">
              <ShieldCheck className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-xl font-bold">Xác nhận đăng nhập</h2>
              <p className="text-sm text-muted-foreground">
                Đăng nhập vào máy tính với tài khoản{' '}
                <span className="font-medium text-foreground">{user.email}</span>?
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                ⚠️ Chỉ xác nhận nếu bạn là người mở mã QR trên máy tính
              </div>
              <Button
                onClick={handleConfirm}
                variant="gradient"
                className="w-full"
              >
                Xác nhận đăng nhập
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRetry}
              >
                Quét lại
              </Button>
            </div>
          )}

          {/* Confirming State */}
          {state === 'confirming' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Đang xác nhận...</p>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-primary">Thành công!</h2>
              <p className="text-sm text-muted-foreground">
                Máy tính của bạn đã được đăng nhập thành công.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Về trang chủ
              </Button>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="text-center py-4 space-y-4">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-xl font-bold text-destructive">Thất bại</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button onClick={handleRetry} variant="gradient" className="w-full">
                Thử lại
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Về trang chủ
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
