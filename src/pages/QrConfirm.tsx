import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

export default function QrConfirm() {
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get('qr_token');
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'confirm' | 'success' | 'error' | 'needLogin'>('loading');
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!qrToken) {
      setStatus('error');
      setErrorMsg('Không tìm thấy mã QR');
      return;
    }

    if (!user) {
      setStatus('needLogin');
      return;
    }

    setStatus('confirm');
  }, [qrToken, user, authLoading]);

  const handleConfirm = async () => {
    if (!qrToken || !user) return;
    
    setIsConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { action: 'confirm', token: qrToken },
      });

      if (error) throw error;

      if (data.error) {
        setStatus('error');
        setErrorMsg(data.error);
        return;
      }

      setStatus('success');
      toast({
        title: '✅ Xác nhận thành công',
        description: 'Máy tính của bạn đã được đăng nhập!',
      });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Đã xảy ra lỗi');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleLoginFirst = () => {
    // Redirect to auth with return URL
    navigate(`/auth?redirect=${encodeURIComponent(`/qr-confirm?qr_token=${qrToken}`)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="flex justify-center mb-6">
          <img src={bonzshopLogo} alt="BonzShop" className="h-24 w-auto object-contain" />
        </div>

        <div className="glass rounded-2xl p-6 shadow-elevated text-center">
          {status === 'loading' && (
            <div className="py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Đang kiểm tra...</p>
            </div>
          )}

          {status === 'needLogin' && (
            <div className="py-4 space-y-4">
              <QrCode className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-xl font-bold">Đăng nhập trước</h2>
              <p className="text-sm text-muted-foreground">
                Bạn cần đăng nhập trên điện thoại trước khi xác nhận QR login cho máy tính.
              </p>
              <Button onClick={handleLoginFirst} variant="gradient" className="w-full">
                Đăng nhập ngay
              </Button>
            </div>
          )}

          {status === 'confirm' && (
            <div className="py-4 space-y-4">
              <ShieldCheck className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-xl font-bold">Xác nhận đăng nhập</h2>
              <p className="text-sm text-muted-foreground">
                Bạn có muốn đăng nhập vào máy tính với tài khoản <span className="font-medium text-foreground">{user?.email}</span>?
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                ⚠️ Chỉ xác nhận nếu bạn là người quét mã QR trên máy tính
              </div>
              <Button
                onClick={handleConfirm}
                variant="gradient"
                className="w-full"
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Đang xác nhận...
                  </>
                ) : (
                  'Xác nhận đăng nhập'
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Hủy
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 space-y-4">
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

          {status === 'error' && (
            <div className="py-4 space-y-4">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-xl font-bold text-destructive">Thất bại</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
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
