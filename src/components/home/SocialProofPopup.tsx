import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RecentOrder {
  buyer_name: string;
  product_title: string;
  time_ago: string;
}

export function SocialProofPopup() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    fetchRecentOrders();
  }, []);

  useEffect(() => {
    if (orders.length === 0 || isDismissed) return;

    // Show first popup after 5 seconds
    const initialTimer = setTimeout(() => setIsVisible(true), 5000);

    // Cycle through orders
    const cycleInterval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % orders.length);
        if (!isDismissed) setIsVisible(true);
      }, 500);
    }, 8000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(cycleInterval);
    };
  }, [orders, isDismissed]);

  const fetchRecentOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('created_at, buyer_id, product_id, account_id')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return;

    // Get product/account titles
    const recentOrders: RecentOrder[] = [];
    for (const order of data.slice(0, 5)) {
      let title = 'một sản phẩm';
      if (order.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('title')
          .eq('id', order.product_id)
          .single();
        if (product) title = product.title;
      } else if (order.account_id) {
        const { data: account } = await supabase
          .from('accounts')
          .select('title')
          .eq('id', order.account_id)
          .single();
        if (account) title = account.title;
      }

      // Get buyer display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', order.buyer_id)
        .single();

      const name = profile?.display_name || 'Người dùng';
      const masked = name.substring(0, 2) + '***';

      const minutesAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
      const timeAgo = minutesAgo < 60
        ? `${minutesAgo} phút trước`
        : minutesAgo < 1440
          ? `${Math.floor(minutesAgo / 60)} giờ trước`
          : `${Math.floor(minutesAgo / 1440)} ngày trước`;

      recentOrders.push({
        buyer_name: masked,
        product_title: title.length > 30 ? title.substring(0, 30) + '...' : title,
        time_ago: timeAgo,
      });
    }

    setOrders(recentOrders);
  };

  if (orders.length === 0 || isDismissed) return null;

  const current = orders[currentIndex];

  return (
    <AnimatePresence>
      {isVisible && current && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-6 z-50 max-w-xs"
        >
          <div className="glass-strong rounded-2xl p-4 shadow-xl border border-primary/20">
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary">{current.buyer_name}</span> vừa mua
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {current.product_title}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">{current.time_ago}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
