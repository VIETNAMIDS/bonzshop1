import { useEffect, useState } from 'react';
import { CheckCircle, Sparkles, Gift, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
  'bg-pink-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-indigo-500', 'bg-amber-500'
];

export function CheckoutSuccess({ onComplete }: { onComplete: () => void }) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Generate confetti
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 100; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
      });
    }
    setConfetti(pieces);
    
    setTimeout(() => setShow(true), 100);
    
    // Auto complete after animation
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className={cn(
              "absolute rounded-sm animate-confetti-fall",
              piece.color
            )}
            style={{
              left: `${piece.x}%`,
              width: piece.size,
              height: piece.size * 1.5,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Fireworks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-firework"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 60}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            {[...Array(12)].map((_, j) => (
              <div
                key={j}
                className={cn(
                  "absolute w-2 h-2 rounded-full animate-firework-particle",
                  COLORS[Math.floor(Math.random() * COLORS.length)]
                )}
                style={{
                  transform: `rotate(${j * 30}deg) translateY(-30px)`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Success Content */}
      <div className={cn(
        "relative z-10 text-center space-y-6 transition-all duration-700",
        show ? "scale-100 opacity-100" : "scale-50 opacity-0"
      )}>
        {/* Success Icon */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50">
            <CheckCircle className="h-16 w-16 text-white animate-bounce-in" />
          </div>
          
          {/* Sparkles around */}
          <Sparkles className="absolute -top-4 -left-4 h-8 w-8 text-yellow-400 animate-pulse" />
          <Sparkles className="absolute -top-2 -right-6 h-6 w-6 text-pink-400 animate-pulse delay-100" />
          <Gift className="absolute -bottom-2 -left-6 h-7 w-7 text-purple-400 animate-bounce" />
          <PartyPopper className="absolute -bottom-4 -right-4 h-8 w-8 text-orange-400 animate-bounce delay-200" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
            🎉 Mua hàng thành công!
          </h2>
          <p className="text-muted-foreground text-lg">
            Đang chuyển hướng đến đơn hàng của bạn...
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mx-auto">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-progress"
          />
        </div>
      </div>
    </div>
  );
}
