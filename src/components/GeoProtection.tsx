import { useState, useEffect, useCallback } from 'react';
import { Shield, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { BanScreen } from '@/components/BanScreen';

const CAPTCHA_KEY = 'bonz_captcha_verified';
const GEO_KEY = 'bonz_geo_verified';
const CAPTCHA_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface GeoData {
  country_code: string;
  country_name: string;
  city?: string;
}

export function GeoProtection({ children }: { children: React.ReactNode }) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaComplete, setCaptchaComplete] = useState(false);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [captchaNumbers, setCaptchaNumbers] = useState<number[]>([]);
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [captchaError, setCaptchaError] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');

  // Generate random captcha
  const generateCaptcha = useCallback(() => {
    const numbers = Array.from({ length: 9 }, () => Math.floor(Math.random() * 99) + 1);
    const target = numbers[Math.floor(Math.random() * numbers.length)];
    setCaptchaNumbers(numbers);
    setTargetNumber(target);
    setCaptchaError('');
  }, []);

  // Check if already verified
  useEffect(() => {
    const checkVerification = async () => {
      // Check IP ban first (unauthenticated - just checks IP)
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (SUPABASE_URL && SUPABASE_KEY) {
          const banRes = await fetch(`${SUPABASE_URL}/functions/v1/check-ban`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
            },
            body: JSON.stringify({ action: 'check' }),
          });
          if (banRes.ok) {
            const banData = await banRes.json();
            if (banData.banned) {
              setIsBanned(true);
              setBanReason(banData.reason || '');
              setIsVerifying(false);
              return;
            }
          }
        }
      } catch (err) {
        console.log('[GeoProtection] Ban check failed (non-critical):', err);
      }

      // Check captcha verification
      const captchaData = localStorage.getItem(CAPTCHA_KEY);
      if (captchaData) {
        const { timestamp } = JSON.parse(captchaData);
        if (Date.now() - timestamp < CAPTCHA_EXPIRY) {
          setCaptchaComplete(true);
        }
      }

      // Check geo verification
      const geoVerified = sessionStorage.getItem(GEO_KEY);
      if (geoVerified === 'VN') {
        setIsVerifying(false);
        if (!captchaData) {
          setShowCaptcha(true);
          generateCaptcha();
        }
        return;
      }

      // Verify geo location
      try {
        const response = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) throw new Error('Geo check failed');
        
        const data = await response.json();
        setGeoData(data);

        if (data.country_code === 'VN') {
          sessionStorage.setItem(GEO_KEY, 'VN');
          setIsVerifying(false);
          
          if (!captchaData || Date.now() - JSON.parse(captchaData).timestamp >= CAPTCHA_EXPIRY) {
            setShowCaptcha(true);
            generateCaptcha();
          }
        } else {
          console.log('[GeoProtection] Blocked country:', data.country_code);
          setIsBlocked(true);
          setRedirecting(true);
          setTimeout(() => {
            window.location.href = 'https://www.google.com';
          }, 2000);
        }
      } catch (error) {
        console.error('[GeoProtection] Error:', error);
        setIsVerifying(false);
        if (!captchaData) {
          setShowCaptcha(true);
          generateCaptcha();
        }
      }
    };

    checkVerification();
  }, [generateCaptcha]);

  // Handle captcha click
  const handleCaptchaClick = (number: number) => {
    if (number === targetNumber) {
      localStorage.setItem(CAPTCHA_KEY, JSON.stringify({ timestamp: Date.now() }));
      setCaptchaComplete(true);
      setShowCaptcha(false);
    } else {
      setCaptchaError('Sai rồi! Thử lại nhé.');
      generateCaptcha();
    }
  };

  // Ban screen - highest priority
  if (isBanned) {
    return <BanScreen reason={banReason} />;
  }

  // Blocked screen (geo)
  if (isBlocked) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
        <div className="text-center p-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
            <MapPin className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            🚫 TRUY CẬP BỊ TỪ CHỐI
          </h1>
          <p className="text-red-400 text-lg mb-2">
            Website chỉ dành cho người dùng tại Việt Nam
          </p>
          {geoData && (
            <p className="text-muted-foreground mb-6">
              Quốc gia của bạn: {geoData.country_name} ({geoData.country_code})
            </p>
          )}
          {redirecting && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang chuyển hướng đến Google...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading screen
  if (isVerifying) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[9999]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // Captcha screen
  if (showCaptcha && !captchaComplete) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[9999] p-4">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-6 sm:p-8 border border-primary/30">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Xác thực bảo mật</h1>
              <p className="text-muted-foreground text-sm">
                Chọn số <span className="text-primary font-bold text-2xl">{targetNumber}</span> để tiếp tục
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {captchaNumbers.map((num, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCaptchaClick(num)}
                  className="h-16 sm:h-20 rounded-xl bg-muted/50 hover:bg-primary/20 border-2 border-transparent hover:border-primary transition-all duration-200 text-2xl font-bold active:scale-95"
                >
                  {num}
                </button>
              ))}
            </div>

            {captchaError && (
              <div className="text-center text-red-500 text-sm mb-4 animate-pulse">
                {captchaError}
              </div>
            )}

            <div className="text-center text-xs text-muted-foreground">
              <p>🇻🇳 Website chỉ dành cho người dùng Việt Nam</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verified - show success briefly
  if (captchaComplete && showCaptcha) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[9999]">
        <div className="text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-xl font-bold text-green-500">Xác thực thành công!</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
