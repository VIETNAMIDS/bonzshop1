import { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, ChevronLeft, Sparkles, ShoppingBag, MessageCircle, Coins, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientText, LetterReveal, FloatingParticles, NeonText } from '@/components/motion/TextEffects';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

const OnboardingScene3D = lazy(() => 
  import('@/components/onboarding/OnboardingScene3D').then(m => ({ default: m.OnboardingScene3D }))
);

const STEPS = [
  {
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500',
    title: 'Chào mừng đến BonzShop! 🎉',
    description: 'Nền tảng mua bán tài khoản game và sản phẩm số uy tín hàng đầu Việt Nam. Chúng tôi rất vui khi bạn ở đây!'
  },
  {
    icon: ShoppingBag,
    gradient: 'from-blue-500 to-cyan-500',
    title: 'Khám phá sản phẩm 🛍️',
    description: 'Hàng nghìn tài khoản game, phần mềm và sản phẩm số chất lượng đang chờ bạn. Duyệt theo danh mục hoặc tìm kiếm ngay.'
  },
  {
    icon: Coins,
    gradient: 'from-amber-500 to-orange-500',
    title: 'Mua sắm với Xu 💰',
    description: 'Nạp xu để mua sắm an toàn. Giao dịch được bảo vệ và hoàn tiền nếu có vấn đề. 1.000đ = 1 Xu.'
  },
  {
    icon: MessageCircle,
    gradient: 'from-green-500 to-emerald-500',
    title: 'Kết nối cộng đồng 💬',
    description: 'Chat với mọi người, kết bạn và chia sẻ kinh nghiệm trong cộng đồng BonzShop.'
  }
];

export default function Welcome() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const handleComplete = async () => {
    if (user) {
      try {
        await supabase
          .from('user_onboarding')
          .upsert({ user_id: user.id, completed_at: new Date().toISOString() });
      } catch (error) {
        console.error('Error saving onboarding:', error);
      }
    }
    navigate('/');
  };

  const handleSkip = async () => {
    if (user) {
      try {
        await supabase
          .from('user_onboarding')
          .upsert({ user_id: user.id, skipped: true });
      } catch (error) {
        console.error('Error saving onboarding:', error);
      }
    }
    navigate('/');
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-gradient-to-r transition-all duration-1000",
          step.gradient
        )} />
        <div className={cn(
          "absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-gradient-to-r transition-all duration-1000",
          step.gradient
        )} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[200px] opacity-10 bg-primary" />
      </div>

      {/* Skip button */}
      <div className="relative z-10 flex justify-end p-4 md:p-6">
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted/50"
        >
          Bỏ qua →
        </button>
      </div>

      {/* Floating particles */}
      <FloatingParticles count={30} className="fixed" />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Logo */}
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 0.8, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <img 
            src={bonzshopLogo} 
            alt="BonzShop" 
            className="h-16 md:h-20 w-auto object-contain"
          />
        </motion.div>

        {/* 3D Scene */}
        <div className="w-full max-w-lg mb-6">
          <Suspense fallback={
            <div className="w-full h-56 md:h-72 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          }>
            <OnboardingScene3D step={currentStep} />
          </Suspense>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div 
            className="text-center max-w-md mx-auto" 
            key={currentStep}
            initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.div 
              className={cn(
                "inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-gradient-to-r",
                step.gradient
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <step.icon className="h-7 w-7 text-white" />
            </motion.div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
              <NeonText>{step.title}</NeonText>
            </h1>
            <motion.p 
              className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {step.description}
            </motion.p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2.5 mb-8">
            {STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-500",
                  index === currentStep
                    ? `bg-gradient-to-r ${step.gradient} w-10`
                    : "bg-muted hover:bg-muted-foreground/50 w-2.5"
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 max-w-xs mx-auto">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep} className="flex-1 h-12 text-base">
                <ChevronLeft className="h-5 w-5 mr-1" />
                Trước
              </Button>
            )}
            <Button
              onClick={nextStep}
              className={cn("flex-1 h-12 text-base bg-gradient-to-r text-white shadow-lg", step.gradient)}
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  <Check className="h-5 w-5 mr-1" />
                  Bắt đầu khám phá
                </>
              ) : (
                <>
                  Tiếp theo
                  <ChevronRight className="h-5 w-5 ml-1" />
                </>
              )}
            </Button>
          </div>
          </motion.div>
        </AnimatePresence>

        {/* Step counter */}
        <div className="mt-8 text-xs text-muted-foreground">
          {currentStep + 1} / {STEPS.length}
        </div>
      </div>
    </div>
  );
}
