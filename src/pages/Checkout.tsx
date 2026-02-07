import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, ShoppingCart, Store, Coins, 
  CheckCircle, ArrowLeft, CreditCard, Package,
  AlertTriangle, Shield, Clock, Truck,
  ChevronRight, Sparkles, Gift, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CheckoutSuccess } from '@/components/checkout/CheckoutSuccess';
import { DiscountCode } from '@/components/checkout/DiscountCode';
import { ShareOrder } from '@/components/checkout/ShareOrder';

interface ProductData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  icon: string | null;
  category: string;
  seller_id: string | null;
  seller?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface AccountData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  platform: string;
  account_type: string;
  features: string[] | null;
  seller_id: string;
  seller?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const productId = searchParams.get('product');
  const accountId = searchParams.get('account');
  const type = productId ? 'product' : 'account';

  const [item, setItem] = useState<ProductData | AccountData | null>(null);
  const [userCoins, setUserCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Discount state
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, productId, accountId]);

  const fetchData = async () => {
    try {
      const { data: coinsData } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user!.id)
        .single();
      
      setUserCoins(coinsData?.balance || 0);

      if (productId) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error) throw error;
        
        // Fetch seller info separately from public view
        let sellerInfo = null;
        if (data.seller_id) {
          const { data: seller } = await supabase
            .from('sellers_public')
            .select('display_name, avatar_url, is_verified')
            .eq('id', data.seller_id)
            .single();
          sellerInfo = seller;
        }
        setItem({ ...data, seller: sellerInfo });
      } else if (accountId) {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .single();

        if (error) throw error;
        
        // Fetch seller info separately from public view
        let sellerInfo = null;
        if (data.seller_id) {
          const { data: seller } = await supabase
            .from('sellers_public')
            .select('display_name, avatar_url, is_verified')
            .eq('id', data.seller_id)
            .single();
          sellerInfo = seller;
        }
        setItem({ ...data, seller: sellerInfo });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin sản phẩm',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = (amount: number, code: string) => {
    setDiscountAmount(amount);
    setAppliedCode(code);
  };

  const handleRemoveDiscount = () => {
    setDiscountAmount(0);
    setAppliedCode(null);
  };

  const finalPrice = item ? Math.max(0, item.price - discountAmount) : 0;

  const handlePurchase = async () => {
    if (!user || !item) return;

    if (userCoins < finalPrice) {
      toast({
        title: 'Không đủ xu',
        description: 'Vui lòng nạp thêm xu để mua sản phẩm này',
        variant: 'destructive',
      });
      navigate('/buy-coins');
      return;
    }

    setProcessing(true);
    setCurrentStep(2);
    
    try {
      const { data, error } = await supabase.functions.invoke('purchase-with-coins', {
        body: {
          accountId: type === 'account' ? item.id : undefined,
          productId: type === 'product' ? item.id : undefined,
          requiredCoins: finalPrice,
        },
      });

      if (error) throw error;

      setCurrentStep(3);
      setShowSuccess(true);
    } catch (error: any) {
      console.error('Error processing purchase:', error);
      setCurrentStep(1);
      toast({
        title: 'Lỗi mua hàng',
        description: error.message || 'Không thể xử lý đơn hàng',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSuccessComplete = () => {
    navigate('/my-orders');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div className="absolute inset-0 h-12 w-12 animate-ping bg-primary/20 rounded-full mx-auto" />
          </div>
          <p className="text-muted-foreground animate-pulse">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Không tìm thấy sản phẩm</h1>
            <p className="text-muted-foreground mb-6">Sản phẩm này có thể đã bị xóa hoặc không tồn tại.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show success animation
  if (showSuccess) {
    return <CheckoutSuccess onComplete={handleSuccessComplete} />;
  }

  const seller = (item as any).seller;
  const canAfford = userCoins >= finalPrice;
  const originalDiscount = (item as ProductData).original_price 
    ? Math.round(((item as ProductData).original_price! - item.price) / (item as ProductData).original_price! * 100)
    : 0;

  const steps = [
    { id: 1, name: 'Xác nhận', icon: ShoppingCart },
    { id: 2, name: 'Thanh toán', icon: CreditCard },
    { id: 3, name: 'Hoàn tất', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Quay lại</span>
            </Button>
            
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Thanh Toán
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <ShareOrder 
                itemTitle={item.title}
                itemPrice={item.price}
                itemImage={item.image_url}
                productId={productId || undefined}
                accountId={accountId || undefined}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-card/50 border-b border-border/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300",
                  currentStep >= step.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <step.icon className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">{step.name}</span>
                  <span className="text-sm font-medium sm:hidden">{step.id}</span>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className={cn(
                    "h-4 w-4 mx-1 sm:mx-2 transition-colors",
                    currentStep > step.id ? "text-primary" : "text-muted-foreground/30"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 lg:py-10">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Product Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Card */}
            <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in">
              <div className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Chi tiết sản phẩm</h2>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Product Image */}
                  <div className="relative group">
                    <div className="w-full sm:w-40 h-40 rounded-xl bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 flex items-center justify-center overflow-hidden border border-border/50">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                      ) : (
                        <span className="text-5xl">{(item as ProductData).icon || '📦'}</span>
                      )}
                    </div>
                    {originalDiscount > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-destructive to-warning text-white border-0 shadow-lg">
                        -{originalDiscount}%
                      </Badge>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {type === 'product' ? (item as ProductData).category : (item as AccountData).platform}
                      </Badge>
                      {type === 'account' && (
                        <Badge variant="outline">{(item as AccountData).account_type}</Badge>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold line-clamp-2">{item.title}</h3>
                    
                    {item.description && (
                      <p className="text-muted-foreground text-sm line-clamp-3">{item.description}</p>
                    )}

                    {/* Account Features */}
                    {type === 'account' && (item as AccountData).features && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {(item as AccountData).features!.slice(0, 4).map((feat, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs border border-success/20"
                          >
                            <CheckCircle className="h-3 w-3" />
                            {feat}
                          </span>
                        ))}
                        {(item as AccountData).features!.length > 4 && (
                          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                            +{(item as AccountData).features!.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Seller Card */}
            {seller && (
              <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="p-4 sm:p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-accent" />
                    <h2 className="font-semibold">Thông tin người bán</h2>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                        {seller.avatar_url ? (
                          <img src={seller.avatar_url} alt={seller.display_name} className="w-full h-full object-cover" />
                        ) : (
                          seller.display_name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      {seller.is_verified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{seller.display_name}</span>
                        {seller.is_verified && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                            Đã xác minh
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">Người bán uy tín</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {[
                { icon: Shield, label: 'Bảo mật', desc: 'An toàn 100%', color: 'text-success' },
                { icon: Zap, label: 'Nhanh chóng', desc: 'Giao ngay', color: 'text-warning' },
                { icon: Gift, label: 'Ưu đãi', desc: 'Giá tốt', color: 'text-accent' },
              ].map((badge, i) => (
                <Card key={i} className="p-3 sm:p-4 text-center border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
                  <badge.icon className={cn("h-6 w-6 mx-auto mb-2", badge.color)} />
                  <p className="font-medium text-sm">{badge.label}</p>
                  <p className="text-xs text-muted-foreground">{badge.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column - Payment Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Payment Card */}
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl shadow-primary/5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                <div className="p-4 sm:p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Thanh toán</h2>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giá sản phẩm</span>
                      <span className="font-medium">{item.price} xu</span>
                    </div>
                    
                    {(item as ProductData).original_price && (item as ProductData).original_price! > item.price && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Giá gốc</span>
                        <span className="line-through text-muted-foreground">
                          {(item as ProductData).original_price} xu
                        </span>
                      </div>
                    )}
                    
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mã giảm giá</span>
                        <span className="text-success font-medium">
                          -{discountAmount} xu
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Discount Code Input */}
                  <DiscountCode
                    originalPrice={item.price}
                    onApply={handleApplyDiscount}
                    onRemove={handleRemoveDiscount}
                    appliedCode={appliedCode}
                    discountAmount={discountAmount}
                  />

                  <Separator />
                    
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Tổng thanh toán</span>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                        <Coins className="h-6 w-6" />
                        <span>{finalPrice} xu</span>
                      </div>
                      {discountAmount > 0 && (
                        <span className="text-xs text-success flex items-center gap-1 justify-end">
                          <Sparkles className="h-3 w-3" />
                          Tiết kiệm {discountAmount} xu
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Wallet Balance */}
                  <div className={cn(
                    "p-4 rounded-xl border transition-all",
                    canAfford 
                      ? "bg-gradient-to-r from-primary/5 to-success/5 border-primary/20" 
                      : "bg-gradient-to-r from-destructive/5 to-warning/5 border-destructive/20"
                  )}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Số dư ví của bạn</p>
                        <div className={cn(
                          "flex items-center gap-1.5 font-bold text-lg",
                          canAfford ? "text-primary" : "text-destructive"
                        )}>
                          <Coins className="h-5 w-5" />
                          {userCoins} xu
                        </div>
                      </div>
                      {canAfford ? (
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-success" />
                        </div>
                      ) : (
                        <Badge variant="destructive" className="animate-pulse">
                          Thiếu {finalPrice - userCoins} xu
                        </Badge>
                      )}
                    </div>
                    
                    {canAfford && (
                      <p className="text-xs text-success mt-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Còn lại sau thanh toán: {userCoins - finalPrice} xu
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  {canAfford ? (
                    <Button 
                      className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]" 
                      onClick={handlePurchase}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <Package className="h-5 w-5" />
                          Xác nhận mua hàng
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-warning to-accent hover:from-warning/90 hover:to-accent/90 shadow-lg" 
                      onClick={() => navigate('/buy-coins')}
                    >
                      <Coins className="h-5 w-5" />
                      Nạp thêm xu
                    </Button>
                  )}

                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    Bằng việc nhấn "Xác nhận mua hàng", bạn đồng ý với điều khoản sử dụng của chúng tôi. 
                    Thông tin sẽ được gửi vào mục "Đơn hàng của tôi".
                  </p>
                </div>
              </Card>

              {/* Quick Info */}
              <Card className="p-4 border-border/50 bg-card/50 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                <div className="space-y-3">
                  {[
                    { icon: Clock, text: 'Giao hàng tức thì sau thanh toán' },
                    { icon: Shield, text: 'Đảm bảo hoàn tiền nếu có vấn đề' },
                    { icon: Truck, text: 'Hỗ trợ 24/7' },
                  ].map((info, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <info.icon className="h-4 w-4 text-primary shrink-0" />
                      <span>{info.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
