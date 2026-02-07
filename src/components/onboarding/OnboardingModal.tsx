import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, ChevronLeft, Sparkles, ShoppingBag, MessageCircle, Coins, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500',
    title: 'Chào mừng đến BonzShop! 🎉',
    description: 'Nền tảng mua bán tài khoản game và sản phẩm số uy tín hàng đầu Việt Nam.'
  },
  {
    icon: ShoppingBag,
    gradient: 'from-blue-500 to-cyan-500',
    title: 'Khám phá sản phẩm 🛍️',
    description: 'Hàng nghìn tài khoản game, phần mềm và sản phẩm số chất lượng đang chờ bạn.'
  },
  {
    icon: Coins,
    gradient: 'from-amber-500 to-orange-500',
    title: 'Mua sắm với Xu 💰',
    description: 'Nạp xu để mua sắm an toàn. Giao dịch được bảo vệ và hoàn tiền nếu có vấn đề.'
  },
  {
    icon: MessageCircle,
    gradient: 'from-green-500 to-emerald-500',
    title: 'Kết nối cộng đồng 💬',
    description: 'Chat với mọi người, kết bạn và chia sẻ kinh nghiệm trong cộng đồng.'
  }
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  const handleComplete = async () => {
    if (user) {
      try {
        await supabase
          .from('user_onboarding')
          .upsert({
            user_id: user.id,
            completed_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error saving onboarding:', error);
      }
    }
    onClose();
  };

  const handleSkip = async () => {
    if (user) {
      try {
        await supabase
          .from('user_onboarding')
          .upsert({
            user_id: user.id,
            skipped: true
          });
      } catch (error) {
        console.error('Error saving onboarding:', error);
      }
    }
    onClose();
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

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="glass-strong border-primary/20 sm:max-w-md p-0 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={cn(
            "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30 bg-gradient-to-r",
            step.gradient
          )} />
          <div className={cn(
            "absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-30 bg-gradient-to-r",
            step.gradient
          )} />
        </div>

        <div className="relative p-6 text-center">
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Bỏ qua
          </button>

          {/* Icon */}
          <div className={cn(
            "mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-r",
            step.gradient
          )}>
            <Icon className="h-10 w-10 text-white" />
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
          <p className="text-muted-foreground mb-8">{step.description}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  index === currentStep 
                    ? `bg-gradient-to-r ${step.gradient} w-8`
                    : "bg-muted hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Trước
              </Button>
            )}
            <Button 
              onClick={nextStep}
              className={cn(
                "flex-1 bg-gradient-to-r text-white",
                step.gradient
              )}
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Bắt đầu
                </>
              ) : (
                <>
                  Tiếp theo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
