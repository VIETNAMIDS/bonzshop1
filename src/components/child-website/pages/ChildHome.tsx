import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Sparkles, ShoppingCart, Loader2, TrendingUp, Users, Package, Star, Zap, Shield, Rocket, Coins } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

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
}

interface Stats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
}

const features = [
  { icon: Zap, title: 'Nhanh chóng', description: 'Mua và nhận sản phẩm ngay lập tức' },
  { icon: Shield, title: 'An toàn', description: 'Bảo mật thông tin tuyệt đối' },
  { icon: Rocket, title: 'Chất lượng', description: 'Source code được kiểm duyệt kỹ' }
];

export function ChildHome() {
  const { user } = useAuth();
  const { website, primaryColor, secondaryColor } = useChildWebsite();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalUsers: 0, totalOrders: 0 });
  const [userCoinBalance, setUserCoinBalance] = useState(0);
  
  // Coin purchase modal
  const [showCoinConfirm, setShowCoinConfirm] = useState(false);
  const [pendingCoinProduct, setPendingCoinProduct] = useState<Product | null>(null);
  const [pendingCoinRequired, setPendingCoinRequired] = useState<number | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStats();
    if (user) {
      fetchUserCoinBalance();
    }
  }, [website, user]);

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

  const fetchUserCoinBalance = async () => {
    try {
      const { data } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setUserCoinBalance(data.balance);
      }
    } catch (err) {
      console.error('Error fetching coin balance:', err);
    }
  };

  const fetchProducts = async () => {
    if (!website) return;
    
    try {
      // Fetch products linked to this website
      const { data: linkedProducts } = await supabase
        .from('child_website_products')
        .select('product_id')
        .eq('website_id', website.id);
      
      if (linkedProducts && linkedProducts.length > 0) {
        const productIds = linkedProducts.map(p => p.product_id).filter(Boolean) as string[];
        
        if (productIds.length > 0) {
          const { data } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds)
            .eq('is_active', true);
          
          setProducts(data || []);
        }
      } else {
        // If no linked products, show all available products
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .limit(20);
        
        setProducts(data || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (product: Product) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (product.is_free && product.download_url) {
      window.open(product.download_url, '_blank');
      toast.success(`Đang tải "${product.title}"`);
      return;
    }

    const requiredCoin = Math.ceil(product.price / 1000);
    setPendingCoinProduct(product);
    setPendingCoinRequired(requiredCoin);
    setShowCoinConfirm(true);
  };

  const performBuyProductWithCoin = async () => {
    if (!pendingCoinProduct || !pendingCoinRequired || !user) return;
    
    setSubmittingPayment(true);
    try {
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({
          balance: userCoinBalance - pendingCoinRequired,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (coinError) throw coinError;

      await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          user_id: user.id,
          product_id: pendingCoinProduct.id,
          amount: pendingCoinRequired,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        });

      setUserCoinBalance(prev => prev - pendingCoinRequired);
      toast.success('Mua thành công! Vui lòng vào Đơn hàng để tải xuống.');
      navigate(`/store/${slug}/my-orders`);
    } catch (err) {
      console.error('Error buying with coin:', err);
      toast.error('Không thể mua, vui lòng thử lại');
    } finally {
      setSubmittingPayment(false);
      setShowCoinConfirm(false);
      setPendingCoinProduct(null);
      setPendingCoinRequired(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 px-4">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-20 left-[10%] w-72 h-72 rounded-full blur-[120px] animate-float"
            style={{ backgroundColor: primaryColor + '30' }}
          />
          <div 
            className="absolute top-40 right-[15%] w-96 h-96 rounded-full blur-[100px] animate-float-reverse"
            style={{ backgroundColor: secondaryColor + '20' }}
          />
        </div>

        <div className="container mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mx-auto mb-8 animate-fade-in">
              <img 
                src={bonzshopLogo} 
                alt={website?.name} 
                className="h-32 md:h-48 w-auto object-contain mx-auto"
                style={{ filter: `drop-shadow(0 0 30px ${primaryColor}50)` }}
              />
            </div>

            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 mb-8 animate-fade-in backdrop-blur-sm"
              style={{ 
                background: `linear-gradient(to right, ${primaryColor}20, ${secondaryColor}20)`,
                borderColor: primaryColor + '40'
              }}
            >
              <Sparkles className="h-4 w-4 animate-pulse" style={{ color: primaryColor }} />
              <span 
                className="text-sm font-semibold"
                style={{ color: primaryColor }}
              >
                {website?.name}
              </span>
              <Star className="h-4 w-4" style={{ color: secondaryColor }} />
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in leading-tight">
              Chào mừng đến với{' '}
              <span style={{ color: primaryColor }}>
                {website?.name}
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground mb-10 animate-fade-in max-w-2xl mx-auto">
              {website?.description || 'Khám phá các sản phẩm chất lượng cao với giá tốt nhất.'}
            </p>

            {/* Search */}
            <div className="relative max-w-2xl mx-auto animate-fade-in mb-12">
              <div 
                className="absolute inset-0 blur-xl"
                style={{ background: `linear-gradient(to right, ${primaryColor}30, ${secondaryColor}30)` }}
              />
              <div className="relative glass-strong rounded-2xl p-2">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-14 h-14 text-base rounded-xl bg-background/50 border-0 focus:ring-2"
                    style={{ '--tw-ring-color': primaryColor } as any}
                  />
                  <Button 
                    size="lg" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg"
                    style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                  >
                    Tìm kiếm
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto animate-fade-in">
              <div className="stats-card rounded-xl p-4 md:p-6 transition-all duration-300">
                <Package className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2" style={{ color: primaryColor }} />
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.totalProducts}+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Sản phẩm</div>
              </div>
              <div className="stats-card rounded-xl p-4 md:p-6 transition-all duration-300">
                <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2" style={{ color: secondaryColor }} />
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.totalUsers}+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Người dùng</div>
              </div>
              <div className="stats-card rounded-xl p-4 md:p-6 transition-all duration-300">
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.totalOrders}+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Đơn hàng</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 border-y border-border/50">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="flex items-center gap-4 p-4 rounded-xl glass hover:border-primary/30 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}30)` }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12 md:py-20 px-4 relative">
        <div className="container mx-auto relative">
          <div className="text-center mb-12">
            <div 
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-4"
              style={{ 
                background: `linear-gradient(to right, ${primaryColor}10, ${secondaryColor}10)`,
                borderColor: primaryColor + '30'
              }}
            >
              <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
              <span className="text-sm font-medium" style={{ color: primaryColor }}>Được yêu thích nhất</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Sản phẩm <span style={{ color: primaryColor }}>nổi bật</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: primaryColor }} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Chưa có sản phẩm nào.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    is_free: product.is_free,
                    category: product.category,
                    image_url: product.image_url,
                    tech_stack: product.tech_stack,
                    download_url: product.download_url
                  }}
                  onPurchase={() => handlePurchase(product)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Coin Confirm Dialog */}
      <Dialog open={showCoinConfirm} onOpenChange={setShowCoinConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận mua bằng xu</DialogTitle>
            <DialogDescription>
              Bạn sẽ thanh toán {pendingCoinRequired} xu cho sản phẩm "{pendingCoinProduct?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <span>Số dư hiện tại:</span>
              <span className="font-bold flex items-center gap-1">
                <Coins className="h-4 w-4 text-yellow-500" />
                {userCoinBalance} xu
              </span>
            </div>
            {pendingCoinRequired && userCoinBalance < pendingCoinRequired && (
              <p className="text-destructive text-sm mt-2">
                Bạn không đủ xu. Vui lòng nạp thêm.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoinConfirm(false)}>
              Hủy
            </Button>
            <Button 
              onClick={performBuyProductWithCoin}
              disabled={submittingPayment || (pendingCoinRequired ? userCoinBalance < pendingCoinRequired : false)}
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
            >
              {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Xác nhận mua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
