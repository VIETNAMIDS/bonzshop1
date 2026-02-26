import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const PRIZES = [
  { label: '1 xu', amount: 1 },
  { label: '2 xu', amount: 2 },
  { label: '5 xu', amount: 5 },
  { label: '0 xu', amount: 0 },
  { label: '3 xu', amount: 3 },
  { label: '10 xu', amount: 10 },
  { label: '0 xu', amount: 0 },
  { label: '1 xu', amount: 1 },
];

export function WheelOfFortune() {
  const { user } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinsToday, setSpinsToday] = useState(0);
  const maxSpins = 1;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (user) checkSpinStatus();
  }, [user]);

  useEffect(() => {
    drawWheel();
  }, [rotation]);

  const checkSpinStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await (supabase as any)
      .from('wheel_spins')
      .select('id')
      .eq('user_id', user!.id)
      .eq('spin_date', today);

    const count = data?.length || 0;
    setSpinsToday(count);
    setCanSpin(count < maxSpins);
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const segAngle = (2 * Math.PI) / PRIZES.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);

    PRIZES.forEach((prize, i) => {
      const startAngle = i * segAngle;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.amount > 0 ? (i % 2 === 0 ? '#8b5cf6' : '#d946ef') : '#374151';
      ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(prize.label, radius - 20, 5);
      ctx.restore();
    });

    ctx.restore();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(center + radius + 5, center);
    ctx.lineTo(center + radius - 15, center - 10);
    ctx.lineTo(center + radius - 15, center + 10);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Center
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937';
    ctx.fill();
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const spin = async () => {
    if (!user || spinning || !canSpin) return;
    setSpinning(true);

    const weights = PRIZES.map(p => p.amount === 0 ? 30 : p.amount <= 2 ? 25 : p.amount <= 5 ? 12 : 3);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let winIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) { winIndex = i; break; }
    }

    const prize = PRIZES[winIndex];
    const segAngle = 360 / PRIZES.length;
    const targetAngle = 360 - (winIndex * segAngle + segAngle / 2);
    const totalRotation = rotation + 360 * 5 + targetAngle;

    const startTime = Date.now();
    const duration = 4000;
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setRotation(startRotation + (totalRotation - startRotation) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        finishSpin(prize);
      }
    };
    requestAnimationFrame(animate);
  };

  const finishSpin = async (prize: typeof PRIZES[0]) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await (supabase as any).from('wheel_spins').insert({
        user_id: user!.id,
        prize_type: 'coins',
        prize_amount: prize.amount,
        spin_date: today,
      });

      if (prize.amount > 0) {
        const { data: userCoins } = await supabase
          .from('user_coins')
          .select('balance')
          .eq('user_id', user!.id)
          .single();

        if (userCoins) {
          await supabase
            .from('user_coins')
            .update({ balance: userCoins.balance + prize.amount })
            .eq('user_id', user!.id);
        } else {
          await supabase
            .from('user_coins')
            .insert({ user_id: user!.id, balance: prize.amount });
        }

        await supabase.from('coin_history').insert({
          user_id: user!.id,
          amount: prize.amount,
          type: 'wheel_spin',
          description: `Vòng quay may mắn: +${prize.amount} xu`,
        });

        toast.success(`🎉 Chúc mừng! Bạn nhận được ${prize.amount} xu!`);
      } else {
        toast.info('Chúc bạn may mắn lần sau! 🍀');
      }

      setSpinsToday(prev => prev + 1);
      setCanSpin(false);
    } catch (err) {
      console.error('Spin error:', err);
      toast.error('Có lỗi xảy ra');
    } finally {
      setSpinning(false);
    }
  };

  return (
    <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          🎡 Vòng quay may mắn
        </CardTitle>
        <p className="text-xs text-muted-foreground">Quay miễn phí {maxSpins} lần/ngày</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={260}
            height={260}
            className="rounded-full"
          />
        </div>

        <Button
          onClick={spin}
          disabled={spinning || !canSpin}
          className="w-full gap-2"
          variant={canSpin ? 'gradient' : 'outline'}
        >
          {spinning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Đang quay...</>
          ) : canSpin ? (
            <>🎰 Quay ngay!</>
          ) : (
            <>✅ Đã quay hôm nay ({spinsToday}/{maxSpins})</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
