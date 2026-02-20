import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, XCircle, Loader2, ShieldCheck, QrCode, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

type ScanState = 'scanning' | 'confirm' | 'confirming' | 'success' | 'error' | 'manual';

export default function QrScannerPage() {
  const [state, setState] = useState<ScanState>('scanning');
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const extractToken = (text: string): string | null => {
    try {
      // Try as URL first
      const url = new URL(text);
      const token = url.searchParams.get('qr_token');
      if (token) return token;
    } catch {
      // Not a URL
    }
    // Try as raw token (hex string)
    if (/^[a-f0-9]{64}$/i.test(text.trim())) {
      return text.trim();
    }
    // Try to extract qr_token from partial URL
    const match = text.match(/qr_token=([a-f0-9]+)/i);
    if (match) return match[1];
    return null;
  };

  // Initialize scanner
  useEffect(() => {
    if (state !== 'scanning') return;

    let html5QrcodeScanner: any = null;
    let stopped = false;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        
        if (stopped || !containerRef.current) return;

        html5QrcodeScanner = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrcodeScanner;

        // Get available cameras
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setErrorMsg('Không tìm thấy camera. Hãy thử nhập link thủ công.');
          setState('error');
          return;
        }

        await html5QrcodeScanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText: string) => {
            const token = extractToken(decodedText);
            if (token) {
              setScannedToken(token);
              setState('confirm');
              html5QrcodeScanner.stop().catch(() => {});
            }
          },
          () => {}
        );
      } catch (err: any) {
        console.error('Camera error:', err);
        if (!stopped) {
          setErrorMsg('Không thể mở camera. Vui lòng cấp quyền camera hoặc nhập link thủ công.');
          setState('error');
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initScanner, 300);

    return () => {
      stopped = true;
      clearTimeout(timer);
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

  const handleManualSubmit = () => {
    const token = extractToken(manualUrl);
    if (token) {
      setScannedToken(token);
      setState('confirm');
    } else {
      toast({
        title: 'Link không hợp lệ',
        description: 'Vui lòng dán đúng link từ mã QR',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    setScannedToken(null);
    setErrorMsg('');
    setManualUrl('');
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
                style={{ minHeight: '280px' }}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(-1)}
                >
                  Hủy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setState('manual')}
                >
                  <Keyboard className="h-4 w-4" />
                  Nhập link
                </Button>
              </div>
            </div>
          )}

          {/* Manual Input State */}
          {state === 'manual' && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <Keyboard className="h-8 w-8 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-bold">Nhập link QR</h2>
                <p className="text-xs text-muted-foreground">
                  Nếu không quét được, hãy copy link từ mã QR và dán vào đây
                </p>
              </div>
              <Input
                placeholder="Dán link QR tại đây..."
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                autoFocus
              />
              <Button onClick={handleManualSubmit} variant="gradient" className="w-full">
                Xác nhận
              </Button>
              <Button variant="outline" className="w-full" onClick={handleRetry}>
                Quay lại quét
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
              <Button onClick={() => setState('manual')} variant="outline" className="w-full gap-1">
                <Keyboard className="h-4 w-4" />
                Nhập link thủ công
              </Button>
              <Button onClick={() => navigate('/')} variant="ghost" className="w-full">
                Về trang chủ
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
