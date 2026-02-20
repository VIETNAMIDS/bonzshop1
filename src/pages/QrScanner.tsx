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
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const extractToken = (text: string): string | null => {
    try {
      const url = new URL(text);
      const token = url.searchParams.get('qr_token');
      if (token) return token;
    } catch {
      // Not a URL
    }
    if (/^[a-f0-9]{64}$/i.test(text.trim())) {
      return text.trim();
    }
    const match = text.match(/qr_token=([a-f0-9]+)/i);
    if (match) return match[1];
    return null;
  };

  // Initialize scanner
  useEffect(() => {
    if (state !== 'scanning') return;

    let html5QrcodeInstance: any = null;
    let stopped = false;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        
        if (stopped) return;

        // Ensure the container exists
        const container = document.getElementById('qr-reader-container');
        if (!container) return;

        html5QrcodeInstance = new Html5Qrcode('qr-reader-container');
        scannerRef.current = html5QrcodeInstance;

        await html5QrcodeInstance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText: string) => {
            const token = extractToken(decodedText);
            if (token) {
              setScannedToken(token);
              setState('confirm');
              html5QrcodeInstance.stop().catch(() => {});
            }
          },
          () => {}
        );

        setCameraReady(true);
      } catch (err: any) {
        console.error('Camera error:', err);
        if (!stopped) {
          setErrorMsg('Không thể mở camera. Vui lòng cấp quyền camera hoặc nhập link thủ công.');
          setState('error');
        }
      }
    };

    // Longer delay to ensure DOM is fully ready
    const timer = setTimeout(initScanner, 500);

    return () => {
      stopped = true;
      clearTimeout(timer);
      if (html5QrcodeInstance) {
        html5QrcodeInstance.stop().catch(() => {});
      }
      setCameraReady(false);
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

              {/* Camera container with proper styling */}
              <div className="relative rounded-xl overflow-hidden border-2 border-primary/30 bg-black" style={{ minHeight: '300px' }}>
                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">Đang mở camera...</p>
                  </div>
                )}
                <div 
                  id="qr-reader-container" 
                  style={{ width: '100%', minHeight: '300px' }}
                />
              </div>

              {/* Force video to show properly */}
              <style>{`
                #qr-reader-container video {
                  width: 100% !important;
                  height: auto !important;
                  object-fit: cover !important;
                  border-radius: 0.75rem;
                }
                #qr-reader-container img[alt="Info icon"] {
                  display: none !important;
                }
                #qr-reader-container > div {
                  border: none !important;
                }
                #qr-reader-container #qr-shaded-region {
                  border-color: hsl(var(--primary)) !important;
                }
              `}</style>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (scannerRef.current) scannerRef.current.stop().catch(() => {});
                    navigate(-1);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => {
                    if (scannerRef.current) scannerRef.current.stop().catch(() => {});
                    setState('manual');
                  }}
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
              <Button onClick={handleConfirm} variant="gradient" className="w-full">
                Xác nhận đăng nhập
              </Button>
              <Button variant="outline" className="w-full" onClick={handleRetry}>
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
