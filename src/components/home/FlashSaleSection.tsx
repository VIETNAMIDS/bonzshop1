import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  is_free: boolean;
  category: string;
  image_url: string | null;
  tech_stack: string[] | null;
  download_url: string | null;
  original_price?: number | null;
  seller?: { id: string; display_name: string } | null;
}

function CountdownTimer({ endTime }: { endTime: Date }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endTime));

  function getTimeLeft(end: Date) {
    const diff = Math.max(0, end.getTime() - Date.now());
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(endTime)), 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/30 flex items-center justify-center"
      >
        <span className="text-xl md:text-2xl font-bold font-mono text-destructive">
          {String(value).padStart(2, '0')}
        </span>
      </motion.div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <TimeBox value={timeLeft.hours} label="Giờ" />
      <span className="text-xl font-bold text-destructive mb-4">:</span>
      <TimeBox value={timeLeft.minutes} label="Phút" />
      <span className="text-xl font-bold text-destructive mb-4">:</span>
      <TimeBox value={timeLeft.seconds} label="Giây" />
    </div>
  );
}

export function FlashSaleSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [endTime] = useState(() => {
    // Flash sale ends at midnight today
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  });

  useEffect(() => {
    fetchFlashSaleProducts();
  }, []);

  const fetchFlashSaleProducts = async () => {
    // Get products with original_price set (means they're on sale)
    const { data } = await supabase
      .from('products')
      .select('*, seller:sellers_public(id, display_name)')
      .not('original_price', 'is', null)
      .gt('original_price', 0)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(4);

    if (data && data.length > 0) {
      setProducts(data as Product[]);
    } else {
      // Fallback: show cheapest products as "deals"
      const { data: fallback } = await supabase
        .from('products')
        .select('*, seller:sellers_public(id, display_name)')
        .eq('is_active', true)
        .eq('is_free', false)
        .order('price', { ascending: true })
        .limit(4);
      if (fallback) setProducts(fallback as Product[]);
    }
  };

  if (products.length === 0) return null;

  return (
    <section className="py-12 md:py-16 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-destructive/10 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto relative">
        <ScrollReveal variant="fadeUp">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-destructive to-destructive/70 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="h-7 w-7 text-destructive-foreground" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">Flash Sale</h2>
                  <Flame className="h-6 w-6 text-destructive animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Ưu đãi kết thúc sau
                </p>
              </div>
            </div>
            <CountdownTimer endTime={endTime} />
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.08}>
          {products.map((product) => (
            <StaggerItem key={product.id}>
              <div className="relative">
                {product.original_price && product.original_price > product.price && (
                  <Badge className="absolute -top-2 -right-2 z-10 bg-destructive text-destructive-foreground font-bold animate-pulse">
                    -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                  </Badge>
                )}
                <ProductCard product={product} />
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
