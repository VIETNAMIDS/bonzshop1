import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, Sparkles, ShoppingCart, QrCode, CheckCircle, Loader2, Clock, XCircle, Download, TrendingUp, Users, Package, Star, ArrowRight, Zap, Shield, Rocket } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { HeroBackgroundMedia } from '@/components/home/HeroBackgroundMedia';
import { ProductCard } from '@/components/ProductCard';
import { FlashSaleSection } from '@/components/home/FlashSaleSection';
import { TopSellingSection } from '@/components/home/TopSellingSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { SocialProofPopup } from '@/components/home/SocialProofPopup';
import { TopDepositSection } from '@/components/home/TopDepositSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import bonzshopLogo from '@/assets/bonzshop-logo.png';
import { ScrollReveal, StaggerContainer, StaggerItem, CountUp, FloatingElement } from '@/components/motion';

// Lazy load 3D components for performance
const Scene3DBackground = lazy(() => import('@/components/3d/Scene3DBackground').then(m => ({ default: m.Scene3DBackground })));
const FloatingLogo3D = lazy(() => import('@/components/3d/FloatingLogo3D').then(m => ({ default: m.FloatingLogo3D })));

interface Seller {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

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
  seller?: Seller | null;
}

interface Category {
  id: string;
  name: string;
}

interface Stats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
}

const filters = [
  { id: 'all', label: 'Tất cả' },
  { id: 'free', label: 'Miễn phí' },
  { id: 'premium', label: 'Premium' },
];

const features = [
  {
    icon: Zap,
    title: 'Nhanh chóng',
    description: 'Mua và nhận sản phẩm ngay lập tức'
  },
  {
    icon: Shield,
    title: 'An toàn',
    description: 'Bảo mật thông tin tuyệt đối'
  },
  {
    icon: Rocket,
    title: 'Chất lượng',
    description: 'Source code được kiểm duyệt kỹ'
  }
];

export default function Index() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalUsers: 0, totalOrders: 0 });

  // Payment modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'vnd' | 'coin'>('vnd');
  const [userCoinBalance, setUserCoinBalance] = useState(0);
  const [showCoinConfirm, setShowCoinConfirm] = useState(false);
  const [pendingCoinProduct, setPendingCoinProduct] = useState<Product | null>(null);
  const [pendingCoinRequired, setPendingCoinRequired] = useState<number | null>(null);

  // Parallax scroll
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCategories();
      fetchUserCoinBalance();
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory, selectedFilter]);

  const fetchStats = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'approved')
      ]);
      
      setStats({
        totalProducts: productsRes.count || 0,
        totalUsers: 1000,
        totalOrders: ordersRes.count || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchUserCoinBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching coin balance:', error);
      } else if (data) {
        setUserCoinBalance(data.balance);
      } else {
        setUserCoinBalance(0);
      }
    } catch (err) {
      console.error('Error fetching coin balance:', err);
      setUserCoinBalance(0);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:sellers_public(id, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const productsData = (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        is_free: p.is_free,
        category: p.category,
        image_url: p.image_url,
        tech_stack: p.tech_stack,
        download_url: p.download_url,
        seller: p.seller,
      }));
      setProducts(productsData);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    let result = [...products];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (selectedFilter === 'free') {
      result = result.filter((p) => p.is_free);
    } else if (selectedFilter === 'premium') {
      result = result.filter((p) => !p.is_free);
    }

    setFilteredProducts(result);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const handlePurchase = async (product: Product) => {
    if (product.is_free && product.download_url) {
      window.open(product.download_url, '_blank');
      toast.success(`Đang tải "${product.title}"`);
      return;
    }

    if (product.is_free) {
      toast.info('Sản phẩm miễn phí nhưng chưa có link tải');
      return;
    }

    const requiredCoin = product.price;
    await handleBuyProductWithCoin({ ...product });
  };

  const handleBuyProductWithCoin = async (product: Product) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để mua bằng xu');
      navigate('/auth');
      return;
    }

    const requiredCoin = product.price;
    setPendingCoinProduct(product);
    setPendingCoinRequired(requiredCoin);
    setShowCoinConfirm(true);
  };

  const performBuyProductWithCoin = async (product: Product, requiredCoin: number) => {
    setSubmittingPayment(true);
    try {
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({
          balance: userCoinBalance - requiredCoin,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (coinError) throw coinError;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          user_id: user.id,
          product_id: product.id,
          amount: requiredCoin,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      setUserCoinBalance(prev => prev - requiredCoin);
      toast.success('Mua thành công bằng xu! Vui lòng vào Đơn hàng để tải xuống.');
      navigate('/my-orders');
    } catch (err) {
      console.error('Error buying with coin:', err);
      toast.error('Không thể mua bằng xu, vui lòng thử lại');
    } finally {
      setSubmittingPayment(false);
      setShowCoinConfirm(false);
      setPendingCoinProduct(null);
      setPendingCoinRequired(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.img 
          src={bonzshopLogo} 
          alt="BonzShop" 
          className="h-40 md:h-56 w-auto"
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className={cn("transition-all duration-300", !isMobile && "ml-60")}>
      {/* 3D Background */}
      <Suspense fallback={null}>
        <Scene3DBackground />
      </Suspense>

      {/* Hero Section - Parallax */}
      <motion.section 
        className="relative overflow-hidden py-16 md:py-24 px-4"
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
      >
        <HeroBackgroundMedia />
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingElement className="absolute top-20 left-[10%]" yRange={[-20, 20]} duration={8}>
            <div className="w-72 h-72 bg-primary/20 rounded-full blur-[120px]" />
          </FloatingElement>
          <FloatingElement className="absolute top-40 right-[15%]" yRange={[-15, 25]} duration={10}>
            <div className="w-96 h-96 bg-accent/15 rounded-full blur-[100px]" />
          </FloatingElement>
          <FloatingElement className="absolute bottom-20 left-[30%]" xRange={[-15, 15]} duration={7}>
            <div className="w-80 h-80 bg-[hsl(20,90%,55%)]/10 rounded-full blur-[100px]" />
          </FloatingElement>
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern opacity-50" />

        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {!isMobile && [...Array(5)].map((_, i) => (
            <FloatingElement 
              key={i} 
              className="absolute" 
              xRange={[-30, 30]} 
              yRange={[-40, 40]} 
              duration={5 + i * 2}
            >
              <div 
                className="w-2 h-2 rounded-full bg-primary/40"
                style={{
                  top: `${20 + i * 15}%`,
                  left: `${10 + i * 20}%`,
                  boxShadow: '0 0 30px hsl(210 100% 60% / 0.2)',
                }}
              />
            </FloatingElement>
          ))}
        </div>

        <div className="container mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo with entrance animation */}
            <motion.div 
              className="mx-auto mb-8"
              initial={{ opacity: 0, scale: 0.5, rotateY: -30 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.img 
                src={bonzshopLogo} 
                alt="BonzShop" 
                className="h-48 md:h-64 lg:h-80 w-auto object-contain mx-auto drop-shadow-[0_0_30px_rgba(60,130,246,0.3)]"
                animate={{ 
                  filter: [
                    'drop-shadow(0 0 20px rgba(60,130,246,0.2))',
                    'drop-shadow(0 0 40px rgba(60,130,246,0.4))',
                    'drop-shadow(0 0 20px rgba(60,130,246,0.2))',
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>

            {/* Badge */}
            <motion.div 
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 px-5 py-2.5 mb-8 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                #1 Marketplace Source Code Việt Nam
              </span>
              <Star className="h-4 w-4 text-accent" />
            </motion.div>

            {/* Title with text reveal */}
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
            >
              Khám phá{' '}
              <span className="text-gradient animate-gradient bg-[length:200%_200%]">
                Source Code
              </span>
              <br />
              <span className="text-foreground/90">Chất lượng cao</span>
            </motion.h1>

            {/* Description */}
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Hàng nghìn source code từ web app, mobile đến game.
              Tiết kiệm thời gian với code sẵn sàng sử dụng.
            </motion.p>

            {/* Search */}
            <motion.div 
              className="relative max-w-2xl mx-auto mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl" />
              <div className="relative glass-strong rounded-2xl p-2">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm source code, templates, plugins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-14 h-14 text-base rounded-xl bg-background/50 border-0 focus:ring-2 focus:ring-primary/50"
                  />
                  <Button 
                    variant="gradient" 
                    size="lg" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg"
                  >
                    Tìm kiếm
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Stats with CountUp */}
            <motion.div 
              className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <motion.div 
                className="stats-card rounded-xl p-4 md:p-6 transition-all duration-300"
                whileHover={{ scale: 1.03 }}
              >
                <Package className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  <CountUp end={stats.totalProducts} suffix="+" />
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Sản phẩm</div>
              </motion.div>
              <motion.div 
                className="stats-card rounded-xl p-4 md:p-6 transition-all duration-300"
                whileHover={{ scale: 1.03 }}
              >
                <Users className="h-6 w-6 md:h-8 md:w-8 text-accent mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  <CountUp end={stats.totalUsers} suffix="+" />
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Người dùng</div>
              </motion.div>
              <motion.div 
                className="stats-card rounded-xl p-4 md:p-6 transition-all duration-300"
                whileHover={{ scale: 1.03 }}
              >
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-accent mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  <CountUp end={stats.totalOrders} suffix="+" />
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Đơn hàng</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Flash Sale Section */}
      <FlashSaleSection />

      {/* Top Selling Section */}
      <TopSellingSection />

      {/* Top Deposit Section */}
      <TopDepositSection />

      {/* Features Section - Stagger animation */}
      <section className="py-12 px-4 border-y border-border/50">
        <div className="container mx-auto">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <StaggerItem key={feature.title}>
                <motion.div 
                  className="flex items-center gap-4 p-4 rounded-xl glass hover:border-primary/30 transition-all duration-300"
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div 
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0"
                    whileHover={{ rotate: 10 }}
                  >
                    <feature.icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12 md:py-20 px-4 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[150px]" />
        </div>
        
        <div className="container mx-auto relative">
          {/* Section Header */}
          <ScrollReveal variant="fadeUp">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 px-4 py-1.5 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Được yêu thích nhất</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Sản phẩm <span className="text-gradient">nổi bật</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Khám phá các source code chất lượng cao, được cộng đồng đánh giá tốt
              </p>
            </div>
          </ScrollReveal>

          {/* Filter Tabs */}
          <ScrollReveal variant="fadeUp" delay={0.1}>
            <div className="flex flex-col items-center gap-6 mb-10">
              <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-2 justify-center min-w-max px-4">
                  <Button
                    variant={selectedCategory === 'all' ? 'gradient' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchParams({});
                    }}
                    className="rounded-full px-5 transition-all duration-300"
                  >
                    ✨ Tất cả
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.name ? 'gradient' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setSearchParams({ category: cat.name });
                      }}
                      className="rounded-full px-5 transition-all duration-300 whitespace-nowrap"
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-1 rounded-full bg-secondary/50 backdrop-blur-sm border border-border/50">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedFilter === filter.id
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Products Grid with stagger */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[380px] rounded-2xl bg-gradient-to-br from-secondary/50 to-secondary/30 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <StaggerContainer 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8"
              staggerDelay={0.06}
            >
              {filteredProducts.map((product) => (
                <StaggerItem key={product.id}>
                  <ProductCard product={product} onPurchase={handlePurchase} onBuyWithCoin={handleBuyProductWithCoin} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <ScrollReveal variant="scaleUp">
              <div className="text-center py-20 relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 blur-3xl" />
                </div>
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center mx-auto mb-6 border border-border/50">
                    <Package className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Chưa có sản phẩm nào
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc để khám phá thêm
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setSelectedFilter('all');
                      }}
                      className="rounded-full"
                    >
                      Xóa bộ lọc
                    </Button>
                    <Link to="/categories">
                      <Button variant="gradient" className="rounded-full">
                        Xem danh mục
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* View all link */}
          {filteredProducts.length > 0 && (
            <ScrollReveal variant="fadeUp">
              <div className="text-center mt-12">
                <Link to="/categories">
                  <Button variant="outline" size="lg" className="rounded-full group">
                    Xem tất cả sản phẩm
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* CTA Section */}
      <ScrollReveal variant="fadeUp">
        <section className="py-16 md:py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10" />
          <div className="absolute inset-0 grid-pattern opacity-30" />
          
          <div className="container mx-auto relative">
            <motion.div 
              className="max-w-3xl mx-auto text-center"
              whileInView={{ scale: [0.95, 1] }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Bạn là <span className="text-gradient">Developer</span>?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Trở thành seller và bắt đầu kiếm tiền từ source code của bạn ngay hôm nay!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="gradient" size="xl" onClick={() => navigate('/seller-setup')} className="btn-glow">
                    Trở thành Seller
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" size="xl" onClick={() => navigate('/contact')}>
                    Liên hệ hỗ trợ
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </ScrollReveal>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={bonzshopLogo} alt="BonzShop" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Bonz Shop. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Social Proof Popup */}
      <SocialProofPopup />

      {/* Coin Confirm Modal */}
      <Dialog open={showCoinConfirm} onOpenChange={setShowCoinConfirm}>
        <DialogContent className="glass-strong border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-xl">Xác nhận mua bằng xu</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn mua sản phẩm này?
            </DialogDescription>
          </DialogHeader>
          
          {pendingCoinProduct && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-card border border-border/50">
                <p className="font-semibold text-foreground mb-2">{pendingCoinProduct.title}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Giá:</span>
                  <span className="font-bold text-primary">{pendingCoinRequired} xu</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Số dư hiện tại:</span>
                  <span className="font-medium">{userCoinBalance} xu</span>
                </div>
                {userCoinBalance < (pendingCoinRequired || 0) && (
                  <p className="text-destructive text-sm mt-2">⚠️ Bạn không đủ xu để mua sản phẩm này</p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCoinConfirm(false)}>
              Hủy
            </Button>
            <Button
              variant="gradient"
              onClick={() => {
                if (pendingCoinProduct && pendingCoinRequired) {
                  performBuyProductWithCoin(pendingCoinProduct, pendingCoinRequired);
                }
              }}
              disabled={submittingPayment || userCoinBalance < (pendingCoinRequired || 0)}
            >
              {submittingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Xác nhận mua
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
