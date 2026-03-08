import { useState, useEffect, useCallback } from 'react';
import { lovable } from '@/integrations/lovable';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import OtpVerification from '@/components/OtpVerification';
import ForgotPassword from '@/components/ForgotPassword';
import QrLoginDesktop from '@/components/QrLoginDesktop';
import { useIsMobile } from '@/hooks/use-mobile';

import { supabase } from '@/integrations/supabase/client';
import { validateEmailNotDisposable } from '@/lib/disposableEmails';
import { toast as sonnerToast } from 'sonner';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

import {
  registerSession,
  checkDeviceRegistration,
  registerDevice,
} from '@/hooks/useSessionManager';
import {
  checkLoginAttempts,
  recordLoginAttempt,
  resetLoginAttempts,
  isHoneypotTriggered,
  createFormTimer,
  behaviorAnalyzer,
  rateLimiter,
} from '@/lib/security';

// Ký tự không được phép
const specialCharRegex = /[<>{}[\]\\\/`~!#$%^&*()+|=;:'",?]/;

// Key lưu trữ trong localStorage
const VIOLATION_KEY = 'security_violations';
const BLOCKED_KEY = 'user_blocked';

// Lấy thông tin vi phạm từ localStorage
const getViolationCount = (): number => {
  try {
    return parseInt(localStorage.getItem(VIOLATION_KEY) || '0', 10);
  } catch {
    return 0;
  }
};

// Lưu số lần vi phạm
const setViolationCount = (count: number) => {
  try {
    localStorage.setItem(VIOLATION_KEY, count.toString());
  } catch {
    // Ignore
  }
};

// Kiểm tra người dùng đã bị block chưa
const isUserBlocked = (): boolean => {
  try {
    return localStorage.getItem(BLOCKED_KEY) === 'true';
  } catch {
    return false;
  }
};

// Block người dùng vĩnh viễn
const blockUser = () => {
  try {
    localStorage.setItem(BLOCKED_KEY, 'true');
    // Lưu thêm thông tin thiết bị
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      blockedAt: new Date().toISOString(),
    };
    localStorage.setItem('blocked_device_info', JSON.stringify(deviceInfo));
  } catch {
    // Ignore
  }
};

const authSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: 'Email không hợp lệ' })
    .max(255, { message: 'Email quá dài' })
    .refine((val) => !specialCharRegex.test(val.replace(/@/g, '').replace(/\./g, '')), {
      message: 'special_char_violation',
    }),
  password: z.string()
    .min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    .max(100, { message: 'Mật khẩu quá dài' }),
  displayName: z.string()
    .trim()
    .max(50, { message: 'Tên hiển thị quá dài' })
    .refine((val) => !val || !specialCharRegex.test(val), {
      message: 'special_char_violation',
    })
    .optional(),
});

type AuthView = 'login' | 'signup' | 'otp' | 'forgot-password';

export default function Auth() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<{ email: string; password: string; displayName: string } | null>(null);
  const [redirectToWelcome, setRedirectToWelcome] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formTimer] = useState(() => createFormTimer());
  const [lockoutMessage, setLockoutMessage] = useState('');
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const qrToken = searchParams.get('qr_token');
  const isMobile = useIsMobile();

  // Save referral code to localStorage on mount (for OAuth redirects)
  useEffect(() => {
    if (referralCode) {
      localStorage.setItem('pending_referral_code', referralCode.toUpperCase());
      console.log('Saved referral code to localStorage:', referralCode);
    }
  }, [referralCode]);

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Kiểm tra block khi load trang + kicked notification
  useEffect(() => {
    if (isUserBlocked()) {
      setIsBlocked(true);
    }
    if (searchParams.get('kicked') === 'true') {
      toast({
        title: '⚠️ Phiên đã bị kết thúc',
        description: 'Tài khoản của bạn đã đăng nhập trên thiết bị khác.',
        variant: 'destructive',
      });
    }
  }, []);


  useEffect(() => {
    if (user && !redirectToWelcome) {
      navigate('/');
    }
    if (user && redirectToWelcome) {
      navigate('/welcome');
    }
  }, [user, navigate, redirectToWelcome]);

  // Xử lý cảnh báo leo thang
  const handleSpecialCharViolation = useCallback(() => {
    const currentCount = getViolationCount();
    const newCount = currentCount + 1;
    setViolationCount(newCount);

    if (newCount >= 3) {
      // Block vĩnh viễn
      blockUser();
      setIsBlocked(true);
      toast({
        title: '🚫 TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN',
        description: 'Bạn đã vi phạm quá nhiều lần. Thiết bị của bạn đã bị ghi nhận và cấm sử dụng web.',
        variant: 'destructive',
        duration: 999999,
      });
      return 'Tài khoản đã bị khóa vĩnh viễn!';
    } else if (newCount === 2) {
      toast({
        title: '⚠️ CẢNH BÁO LẦN CUỐI',
        description: 'Vui lòng đéo nhập ký tự lạ vô web! Lần sau sẽ bị cấm vĩnh viễn!',
        variant: 'destructive',
        duration: 10000,
      });
      return 'Vui lòng đéo nhập ký tự lạ vô web! (Cảnh báo lần 2/3)';
    } else {
      toast({
        title: '❌ Ký tự không hợp lệ',
        description: 'Vui lòng không nhập ký tự lạ! Đây là cảnh báo lần 1.',
        variant: 'destructive',
        duration: 5000,
      });
      return 'Vui lòng không nhập ký tự lạ! (Cảnh báo lần 1/3)';
    }
  }, [toast]);

  const validate = () => {
    if (isBlocked) return false;

    try {
      authSchema.parse({ email, password, displayName: view === 'signup' ? displayName : undefined });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        let hasSpecialCharViolation = false;

        err.errors.forEach((e) => {
          if (e.path[0]) {
            if (e.message === 'special_char_violation') {
              hasSpecialCharViolation = true;
              newErrors[e.path[0] as string] = handleSpecialCharViolation();
            } else {
              newErrors[e.path[0] as string] = e.message;
            }
          }
        });

        setErrors(newErrors);
      }
      return false;
    }
  };

  // Kiểm tra ký tự realtime khi người dùng nhập
  const checkSpecialChars = useCallback((value: string, field: string) => {
    if (isBlocked) return;
    
    // Loại bỏ @ và . cho email trước khi kiểm tra
    const cleanValue = field === 'email' ? value.replace(/@/g, '').replace(/\./g, '') : value;
    
    if (specialCharRegex.test(cleanValue)) {
      const message = handleSpecialCharViolation();
      setErrors(prev => ({ ...prev, [field]: message }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [isBlocked, handleSpecialCharViolation]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    checkSpecialChars(value, 'email');
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayName(value);
    checkSpecialChars(value, 'displayName');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      toast({
        title: '🚫 TRUY CẬP BỊ TỪ CHỐI',
        description: 'Thiết bị của bạn đã bị cấm sử dụng web này vĩnh viễn.',
        variant: 'destructive',
      });
      return;
    }

    // Anti-bot: Honeypot check (ignore common browser autofill false-positives)
    const normalizedHoneypot = honeypot.trim();
    const isLikelyAutofillFalsePositive =
      normalizedHoneypot.length > 0 &&
      (normalizedHoneypot === email.trim() || normalizedHoneypot.includes('@'));

    if (isHoneypotTriggered(honeypot) && !isLikelyAutofillFalsePositive) {
      toast({
        title: '⚠️ Phát hiện yêu cầu bất thường',
        description: 'Vui lòng thử lại.',
        variant: 'destructive',
      });
      return;
    }

    if (isLikelyAutofillFalsePositive) {
      setHoneypot('');
    }

    // Anti-bot: Timing check
    if (formTimer.isSuspicious()) {
      toast({
        title: '⚠️ Hoạt động đáng ngờ',
        description: 'Vui lòng thử lại.',
        variant: 'destructive',
      });
      return;
    }

    // Anti-bot: Behavior analysis
    if (behaviorAnalyzer.isLikelyBot()) {
      toast({
        title: '🤖 Phát hiện bot',
        description: 'Hành vi tự động bị chặn.',
        variant: 'destructive',
      });
      return;
    }

    // Rate limiting
    if (!rateLimiter.check('auth_submit', 5, 60000)) {
      toast({
        title: '⏳ Quá nhiều lần thử',
        description: 'Vui lòng chờ 1 phút trước khi thử lại.',
        variant: 'destructive',
      });
      return;
    }

    // Brute force protection (login only)
    if (view === 'login') {
      const loginCheck = checkLoginAttempts();
      if (!loginCheck.allowed) {
        const remaining = loginCheck.lockoutEndTime 
          ? Math.ceil((loginCheck.lockoutEndTime - Date.now()) / 60000) 
          : 15;
        setLockoutMessage(`Tài khoản bị khóa tạm thời. Thử lại sau ${remaining} phút.`);
        toast({
          title: '🔒 Tạm khóa đăng nhập',
          description: `Quá nhiều lần thất bại. Thử lại sau ${remaining} phút.`,
          variant: 'destructive',
        });
        return;
      }
    }

    if (!validate()) return;

    setIsLoading(true);

    try {
      if (view === 'login') {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          recordLoginAttempt(); // Track failed attempt
          const loginCheck = checkLoginAttempts();
          toast({
            title: 'Đăng nhập thất bại',
            description: error.message === 'Invalid login credentials' 
              ? `Email hoặc mật khẩu không đúng (còn ${loginCheck.remainingAttempts} lần thử)` 
              : error.message,
            variant: 'destructive',
          });
        } else if (data.user) {
          resetLoginAttempts(); // Clear on success
          behaviorAnalyzer.reset();
          await registerSession(data.user.id);
          toast({
            title: 'Đăng nhập thành công',
            description: 'Chào mừng bạn trở lại!',
          });
          navigate('/');
        }
      } else if (view === 'signup') {
        // Check disposable/fake email
        const emailCheck = validateEmailNotDisposable(email);
        if (!emailCheck.isValid) {
          toast({
            title: '🚫 Email không hợp lệ',
            description: emailCheck.reason || 'Vui lòng sử dụng email thật.',
            variant: 'destructive',
            duration: 8000,
          });
          return;
        }

        // Check device registration limit
        const deviceCheck = await checkDeviceRegistration();
        if (deviceCheck.registered) {
          toast({
            title: '🚫 Thiết bị đã đạt giới hạn',
            description: `Mỗi thiết bị chỉ được tạo tối đa 2 tài khoản. Thiết bị này đã có ${deviceCheck.count} tài khoản.`,
            variant: 'destructive',
            duration: 10000,
          });
          return;
        }
        
        // Save pending signup data and show OTP verification
        setPendingSignup({ email, password, displayName });
        setView('otp');
        toast({
          title: '📧 Xác thực email',
          description: 'Vui lòng xác thực email trước khi hoàn tất đăng ký.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification success
  const handleOtpVerified = async () => {
    if (!pendingSignup) return;
    
    setIsLoading(true);
    try {
      const { error } = await signUp(pendingSignup.email, pendingSignup.password, pendingSignup.displayName);
      if (error) {
        toast({
          title: 'Đăng ký thất bại',
          description: error.message.includes('already registered')
            ? 'Email này đã được đăng ký'
            : error.message,
          variant: 'destructive',
        });
        setView('signup');
        setPendingSignup(null);
      } else {
        toast({
          title: '🎉 Đăng ký thành công',
          description: 'Tài khoản của bạn đã được tạo và xác thực!',
        });
        
        // Register device for this account
        try {
          const { data: currentUser } = await supabase.auth.getUser();
          if (currentUser.user) {
            await registerDevice(currentUser.user.id);
            await registerSession(currentUser.user.id);
          }
        } catch (devErr) {
          console.log('Device registration failed (non-critical):', devErr);
        }
        
        // Send Telegram notification to admin
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              type: 'new_registration',
              userEmail: pendingSignup.email,
              userName: pendingSignup.displayName || 'Chưa đặt tên'
            }
          });
           
           // Process referral if exists
           const savedReferralCode = referralCode || localStorage.getItem('pending_referral_code');
           if (savedReferralCode) {
             // Small delay to ensure user profile is created
             setTimeout(async () => {
               await processReferral(savedReferralCode, pendingSignup.displayName);
               localStorage.removeItem('pending_referral_code');
             }, 1000);
           }
        } catch (telegramError) {
          console.log('Telegram notification failed (non-critical):', telegramError);
        }
        
        // Redirect to welcome page for new users
        setRedirectToWelcome(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

   // Process referral reward
   const processReferral = async (code: string, newUserName: string) => {
     try {
       // Wait for profile to be created
       await new Promise(resolve => setTimeout(resolve, 2000));
       
       const { data: currentUser } = await supabase.auth.getUser();
       if (!currentUser.user) {
         console.log('No current user found for referral');
         return;
       }
       
       console.log('Processing referral with code:', code, 'for user:', currentUser.user.id);
       
       // Find referrer by code
       const { data: referrerProfile } = await supabase
         .from('profiles')
         .select('user_id, display_name')
         .eq('referral_code', code.toUpperCase())
         .single();
       
       if (!referrerProfile) {
         console.log('Referral code not found:', code);
         return;
       }
       
       // Don't allow self-referral
       if (referrerProfile.user_id === currentUser.user.id) {
         console.log('Self-referral not allowed');
         return;
       }
       
       // Check if already referred
       const { data: existingReferral } = await supabase
         .from('referrals')
         .select('id')
         .eq('referred_id', currentUser.user.id)
         .single();
       
       if (existingReferral) {
         console.log('User already has a referral');
         return;
       }
       
       console.log('Found referrer:', referrerProfile.display_name);
       
       // Create referral record
       const { error: refError } = await supabase
         .from('referrals')
         .insert({
           referrer_id: referrerProfile.user_id,
           referred_id: currentUser.user.id,
           referral_code: code.toUpperCase(),
           coins_rewarded: 5,
           is_rewarded: true,
           rewarded_at: new Date().toISOString()
         });
       
       if (refError) {
         console.error('Error creating referral:', refError);
         return;
       }
       
       console.log('Referral record created successfully');
       
       // Add coins to referrer
       const { data: referrerCoins } = await supabase
         .from('user_coins')
         .select('balance')
         .eq('user_id', referrerProfile.user_id)
         .single();
       
       if (referrerCoins) {
         await supabase
           .from('user_coins')
           .update({ balance: referrerCoins.balance + 5 })
           .eq('user_id', referrerProfile.user_id);
       } else {
         await supabase
           .from('user_coins')
           .insert({ user_id: referrerProfile.user_id, balance: 5 });
       }
       
       console.log('Added 5 coins to referrer');
       
       // Create notification for referrer
       await supabase.from('notifications').insert({
         user_id: referrerProfile.user_id,
         title: '🎉 Mời bạn thành công!',
         message: `Bạn đã mời thành công người dùng: ${newUserName || 'Người dùng mới'}. Bạn đã nhận được 5 xu thưởng!`,
         type: 'referral',
       });
       
       console.log('Referral notification sent');
       sonnerToast.success(`Người mời ${referrerProfile.display_name} đã nhận được 5 xu thưởng!`);
       
       // Also send Telegram notification
       try {
         await supabase.functions.invoke('send-telegram-notification', {
           body: {
             type: 'new_registration',
             userEmail: `Referral: ${newUserName || 'Người dùng mới'} đã đăng ký qua mã mời`,
             userName: `+5 xu cho ${referrerProfile.display_name}`
           }
         });
       } catch (e) {
         console.log('Telegram referral notification failed');
       }
     } catch (error) {
       console.error('Error processing referral:', error);
     }
   };
 
  // (onboarding is now on /welcome page)

  // Handle back from OTP
  const handleOtpBack = () => {
    setView('signup');
    setPendingSignup(null);
  };

  // Handle forgot password success
  const handleForgotPasswordSuccess = () => {
    setView('login');
    toast({
      title: '✅ Thành công',
      description: 'Vui lòng đăng nhập với mật khẩu mới.',
    });
  };

  // QR login removed - show normal login form on all devices

  // Màn hình blocked
  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="fixed inset-0 bg-destructive/10" />
        <div className="relative w-full max-w-md animate-fade-in text-center">
          <div className="glass rounded-2xl p-8 shadow-elevated border-2 border-destructive/50">
            <ShieldAlert className="h-20 w-20 text-destructive mx-auto mb-6 animate-pulse" />
            <h1 className="text-2xl font-bold text-destructive mb-4">
              🚫 TRUY CẬP BỊ TỪ CHỐI
            </h1>
            <p className="text-muted-foreground mb-4">
              Thiết bị của bạn đã bị ghi nhận và cấm sử dụng web này vĩnh viễn do vi phạm quy định nhiều lần.
            </p>
            <div className="bg-destructive/10 rounded-lg p-4 text-sm text-destructive/80">
              <p>Mã lỗi: DEVICE_PERMANENTLY_BLOCKED</p>
              <p>Thời gian: {new Date().toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OTP Verification screen
  if (view === 'otp' && pendingSignup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-6 md:mb-8">
            <img 
              src={bonzshopLogo} 
              alt="BonzShop" 
              className="h-32 md:h-40 w-auto object-contain"
            />
          </div>

          {/* OTP Form */}
          <div className="glass rounded-2xl p-6 md:p-8 shadow-elevated mx-2 md:mx-0">
            <OtpVerification 
              email={pendingSignup.email}
              onVerified={handleOtpVerified}
              onBack={handleOtpBack}
            />
          </div>
        </div>
      </div>
    );
  }

  // Forgot Password screen
  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-6 md:mb-8">
            <img 
              src={bonzshopLogo} 
              alt="BonzShop" 
              className="h-32 md:h-40 w-auto object-contain"
            />
          </div>

          {/* Forgot Password Form */}
          <div className="glass rounded-2xl p-6 md:p-8 shadow-elevated mx-2 md:mx-0">
            <ForgotPassword 
              onBack={() => setView('login')}
              onSuccess={handleForgotPasswordSuccess}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Brutalist background */}
      <div className="fixed inset-0 grid-pattern opacity-15 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-1 bg-primary pointer-events-none" />
      
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/10 animate-float"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 4 + 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="flex justify-center mb-6 md:mb-8">
          <img 
            src={bonzshopLogo} 
            alt="BonzShop" 
            className="h-28 md:h-36 w-auto object-contain animate-float"
            style={{ animationDuration: '6s' }}
          />
        </div>

        {/* Form */}
        <div className="glass rounded-none p-6 md:p-8 border-2 border-border mx-2 md:mx-0 relative overflow-hidden">
          {/* Animated top border */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
          
          <h2 className="text-2xl md:text-3xl font-black text-center mb-1 uppercase tracking-tight">
            {view === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </h2>
          <p className="text-muted-foreground text-center text-sm font-mono mb-6 md:mb-8">
            {view === 'login' ? 'Chào mừng bạn trở lại! ✨' : 'Tạo tài khoản mới 🚀'}
          </p>

          {/* Lockout message */}
          {lockoutMessage && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive text-center">
              🔒 {lockoutMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {/* Honeypot - hidden from humans, bots will fill this */}
            <div className="absolute opacity-0 pointer-events-none h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
              <input
                type="text"
                name="contact_field"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                tabIndex={-1}
              />
            </div>
            {view === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tên hiển thị</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Nhập tên của bạn"
                    value={displayName}
                    onChange={handleDisplayNameChange}
                    className="pl-10 h-11 md:h-10 text-base md:text-sm"
                    autoComplete="name"
                    disabled={isBlocked}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-xs md:text-sm text-destructive">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  className="pl-10 h-11 md:h-10 text-base md:text-sm"
                  required
                  autoComplete="email"
                  disabled={isBlocked}
                />
              </div>
              {errors.email && (
                <p className="text-xs md:text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Mật khẩu</label>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => setView('forgot-password')}
                    className="text-xs text-primary hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 md:h-10 text-base md:text-sm"
                  required
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  disabled={isBlocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs md:text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {view === 'signup' && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-5 w-5 min-w-[20px] rounded border-2 border-primary accent-primary cursor-pointer"
                />
                <label htmlFor="accept-terms" className="text-sm text-foreground cursor-pointer select-none leading-snug">
                  Tôi đã đọc và đồng ý với{' '}
                  <a href="/terms" target="_blank" className="text-primary hover:underline font-semibold">
                    Điều khoản sử dụng
                  </a>{' '}
                  của BonzShop
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 md:h-11 text-base md:text-sm"
              variant="gradient"
              size="lg"
              disabled={isLoading || isBlocked || (view === 'signup' && !acceptedTerms)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : view === 'login' ? (
                'Đăng nhập'
              ) : (
                'Đăng ký'
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">hoặc</span>
              </div>
            </div>

            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 md:h-11 text-base md:text-sm gap-3"
              disabled={isLoading || isBlocked}
              onClick={async () => {
                try {
                  setIsLoading(true);
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: 'https://bonzshop.site/auth',
                    },
                  });
                  if (error) throw error;
                } catch (err: any) {
                  toast({
                    title: 'Lỗi đăng nhập Google',
                    description: err?.message || 'Không thể kết nối với Google',
                    variant: 'destructive',
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Đăng nhập bằng Google
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setView(view === 'login' ? 'signup' : 'login');
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              disabled={isBlocked}
            >
              {view === 'login' ? (
                <>
                  Chưa có tài khoản?{' '}
                  <span className="font-medium text-primary">Đăng ký ngay</span>
                </>
              ) : (
                <>
                  Đã có tài khoản?{' '}
                  <span className="font-medium text-primary">Đăng nhập</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
