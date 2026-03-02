import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';
import { ScrollReveal, StaggerContainer, StaggerItem, CountUp } from '@/components/motion';

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
  sales?: number | null;
  seller?: { id: string; display_name: string } | null;
}

export function TopSellingSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [viewingNow, setViewingNow] = useState(0);

  useEffect(() => {
    fetchTopProducts();
    fetchTodayStats();
    // Simulate viewing count that changes
    setViewingNow(Math.floor(Math.random() * 20) + 5);
    const interval = setInterval(() => {
      setViewingNow(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTopProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, seller:sellers_public(id, display_name)')
      .eq('is_active', true)
      .order('sales', { ascending: false, nullsFirst: false })
      .limit(4);
    if (data) setProducts(data as Product[]);
  };

  const fetchTodayStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    setTodaySales(count || 0);
  };

  if (products.length === 0) return null;

  return (
    <section className="py-12 md:py-16 px-4 relative">
      <div className="container mx-auto">
        <ScrollReveal variant="fadeUp">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-none bg-warning/10 border-2 border-warning/30 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-warning" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">Bán chạy nhất</h2>
                <p className="text-sm text-muted-foreground font-mono">Sản phẩm được mua nhiều nhất</p>
              </div>
            </div>

            {/* Realtime stats */}
            <div className="flex items-center gap-4">
              <motion.div 
                className="flex items-center gap-2 px-4 py-2 rounded-none bg-success/10 border-2 border-success/30"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-success animate-pulse" />
                <Eye className="h-4 w-4 text-success" />
                <span className="text-sm font-bold text-success font-mono">
                  {Math.max(5, viewingNow)} đang xem
                </span>
              </motion.div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-none bg-primary/10 border-2 border-primary/30">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary font-mono">
                  <CountUp end={todaySales} /> đơn hôm nay
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.08}>
          {products.map((product, index) => (
            <StaggerItem key={product.id}>
              <div className="relative">
                <div className="absolute -top-2 -left-2 z-10 w-8 h-8 bg-warning border-2 border-warning-foreground/20 flex items-center justify-center">
                  <span className="text-xs font-black text-warning-foreground font-mono">#{index + 1}</span>
                </div>
                <ProductCard product={product} />
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
