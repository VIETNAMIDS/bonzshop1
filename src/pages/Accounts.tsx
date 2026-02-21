import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ProductViewDialog } from "@/components/ProductViewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Loader2, CheckCircle, Clock, XCircle, Eye, EyeOff, Copy, Package, Minus, Plus, Coins } from "lucide-react";
import { getPurchasedCredentials } from "@/hooks/useAdminApi";

interface Seller {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

interface Account {
  id: string;
  title: string;
  description: string | null;
  account_username: string;
  price: number;
  category: string;
  image_url: string | null;
  is_sold: boolean;
  is_free: boolean;
  created_at: string;
  seller_id: string | null;
  sellers?: Seller | null;
}

interface Order {
  id: string;
  account_id: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  created_at: string;
  accounts?: { title: string };
}

interface AccountCredentials {
  title: string;
  account_username: string;
  account_password: string;
  account_email: string | null;
  account_phone: string | null;
}

// Group accounts by title (product type) for quantity-based purchasing
interface ProductGroup {
  title: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_free: boolean;
  seller: Seller | null;
  accounts: Account[];
  availableCount: number;
  originalPrice?: number; // for discount display
}

const Accounts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  // Purchase modal
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [userCoinBalance, setUserCoinBalance] = useState(0);

  // Orders
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [showOrdersModal, setShowOrdersModal] = useState(false);

  // Credentials
  const [viewingCredentials, setViewingCredentials] = useState<AccountCredentials | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Product view
  const [viewingProduct, setViewingProduct] = useState<Account | null>(null);
  const [showProductView, setShowProductView] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, title, description, account_username, price, category, image_url, is_sold, is_free, created_at, seller_id')
        .eq('is_sold', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const accountsWithSellers = await Promise.all(
        (data || []).map(async (account: any) => {
          let sellerInfo = null;
          if (account.seller_id) {
            const { data: seller } = await supabase
              .from('sellers_public')
              .select('id, display_name, avatar_url')
              .eq('id', account.seller_id)
              .single();
            sellerInfo = seller;
          }
          return { ...account, sellers: sellerInfo, is_free: account.is_free || false };
        })
      );

      setAccounts(accountsWithSellers as Account[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Không thể tải danh sách tài khoản');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("name");
    setCategories(data?.map(c => c.name) || []);
  }, []);

  const fetchUserOrders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select(`id, account_id, status, amount, created_at, accounts (title)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setUserOrders((data as unknown as Order[]) || []);
  }, [user]);

  const fetchUserCoinBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    setUserCoinBalance(data?.balance || 0);
  };

  useEffect(() => { fetchAccounts(); fetchCategories(); }, [fetchAccounts, fetchCategories]);
  useEffect(() => { if (user) { fetchUserOrders(); fetchUserCoinBalance(); } }, [user, fetchUserOrders]);

  // Group accounts by title+category to form product groups
  const productGroups: ProductGroup[] = (() => {
    const grouped: Record<string, ProductGroup> = {};
    const filtered = accounts.filter(acc => {
      const matchesSearch = acc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesCategory = selectedCategory === "all" || acc.category === selectedCategory;
      return matchesSearch && matchesCategory && !acc.is_sold;
    });

    filtered.forEach(acc => {
      const key = `${acc.title}__${acc.category}`;
      if (!grouped[key]) {
        grouped[key] = {
          title: acc.title,
          description: acc.description,
          price: acc.price,
          category: acc.category,
          image_url: acc.image_url,
          is_free: acc.is_free,
          seller: acc.sellers || null,
          accounts: [],
          availableCount: 0,
        };
      }
      grouped[key].accounts.push(acc);
      grouped[key].availableCount++;
    });

    return Object.values(grouped);
  })();

  // Unique categories from accounts
  const uniqueCategories = [...new Set(accounts.map(a => a.category).filter(Boolean))];

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN").format(price) + 'đ';

  const handleOpenPurchase = (product: ProductGroup) => {
    if (!user) { navigate("/auth"); return; }
    setSelectedProduct(product);
    setQuantity(1);
    setShowPurchaseModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !user) return;
    setSubmitting(true);

    try {
      const accountsToBuy = selectedProduct.accounts.slice(0, quantity);
      const totalCoinCost = Math.ceil(selectedProduct.price / 1000) * quantity;

      if (userCoinBalance < totalCoinCost) {
        toast.error(`Không đủ xu! Cần ${totalCoinCost} xu, bạn có ${userCoinBalance} xu.`);
        setSubmitting(false);
        return;
      }

      // Deduct coins
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({ balance: userCoinBalance - totalCoinCost, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (coinError) throw coinError;

      // Create orders and mark accounts as sold
      for (const acc of accountsToBuy) {
        await supabase.from("orders").insert({
          account_id: acc.id,
          buyer_id: user.id,
          user_id: user.id,
          amount: Math.ceil(acc.price / 1000),
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        });

        await supabase.from('accounts').update({
          is_sold: true,
          sold_to: user.id,
          sold_at: new Date().toISOString()
        }).eq('id', acc.id);
      }

      setUserCoinBalance(prev => prev - totalCoinCost);
      toast.success(`Mua thành công ${quantity} tài khoản!`);
      setShowPurchaseModal(false);
      fetchAccounts();
      fetchUserOrders();
      navigate('/my-orders');
    } catch (err) {
      console.error("Error purchasing:", err);
      toast.error("Không thể mua tài khoản");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimFree = async (product: ProductGroup) => {
    if (!user) { navigate("/auth"); return; }
    const acc = product.accounts[0];
    try {
      await supabase.from('accounts').update({
        is_sold: true, sold_to: user.id, sold_at: new Date().toISOString()
      }).eq('id', acc.id).eq('is_free', true).eq('is_sold', false);

      await supabase.from("orders").insert({
        account_id: acc.id, buyer_id: user.id, user_id: user.id,
        amount: 0, status: 'approved', approved_at: new Date().toISOString(), approved_by: user.id,
      });

      toast.success("Nhận tài khoản miễn phí thành công!");
      fetchAccounts();
      navigate('/my-orders');
    } catch (error) {
      toast.error("Không thể nhận tài khoản miễn phí");
    }
  };

  const handleViewCredentials = async (orderId: string) => {
    setLoadingCredentials(orderId);
    try {
      const credentials = await getPurchasedCredentials(orderId);
      setViewingCredentials(credentials);
    } catch { toast.error("Không thể tải thông tin tài khoản"); }
    finally { setLoadingCredentials(null); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Chờ duyệt</Badge>;
      case 'approved': return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Đã duyệt</Badge>;
      case 'rejected': return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Từ chối</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageWrapper>
        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mua Tài Khoản</h1>
              <p className="text-sm text-muted-foreground mt-1">Tìm và mua các tài khoản chất lượng</p>
            </div>
            {user && (
              <Button variant="outline" onClick={() => setShowOrdersModal(true)} className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Đơn hàng ({userOrders.filter(o => o.status === 'pending').length})
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty */}
          {!loading && productGroups.length === 0 && (
            <div className="text-center py-20">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Không tìm thấy sản phẩm</h3>
              <p className="text-muted-foreground">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}

          {/* Product Grid - Divine Shop Style */}
          {!loading && productGroups.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {productGroups.map((product, idx) => {
                const coinPrice = Math.ceil(product.price / 1000);
                return (
                  <div
                    key={idx}
                    className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer relative"
                    onClick={() => product.is_free ? handleClaimFree(product) : handleOpenPurchase(product)}
                  >
                    {/* Product Image */}
                    <div className="aspect-[16/10] relative overflow-hidden bg-secondary/30">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                          <Package className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}

                      {/* Stock badge */}
                      {product.availableCount <= 3 && product.availableCount > 0 && !product.is_free && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                            Còn {product.availableCount}
                          </Badge>
                        </div>
                      )}

                      {/* Available count */}
                      {product.availableCount > 3 && (
                        <div className="absolute top-2 left-2">
                          <Badge className="text-[10px] px-1.5 py-0.5 bg-primary/90">
                            Còn {product.availableCount}
                          </Badge>
                        </div>
                      )}

                      {product.is_free && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-500 text-white text-[10px]">Miễn phí</Badge>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
                        {product.title}
                      </h3>

                      {product.category && (
                        <Badge variant="outline" className="text-[10px] mb-2">{product.category}</Badge>
                      )}

                      {/* Price */}
                      <div className="mt-auto">
                        {product.is_free ? (
                          <span className="text-lg font-bold text-green-500">Miễn phí</span>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base font-bold text-primary">
                                {formatPrice(product.price)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Coins className="h-3 w-3 text-yellow-500" />
                              <span>{coinPrice} xu</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Purchase Modal with Quantity */}
        <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mua tài khoản</DialogTitle>
              <DialogDescription>Chọn số lượng và xác nhận thanh toán</DialogDescription>
            </DialogHeader>

            {selectedProduct && (() => {
              const coinPerUnit = Math.ceil(selectedProduct.price / 1000);
              const totalCoin = coinPerUnit * quantity;
              const maxQty = selectedProduct.availableCount;

              return (
                <div className="space-y-4">
                  {/* Product info */}
                  <div className="flex gap-3 p-3 rounded-lg bg-secondary/50">
                    {selectedProduct.image_url ? (
                      <img src={selectedProduct.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-2">{selectedProduct.title}</h4>
                      <p className="text-primary font-bold mt-1">{formatPrice(selectedProduct.price)} / tài khoản</p>
                      <p className="text-xs text-muted-foreground">{coinPerUnit} xu / tài khoản</p>
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Số lượng (tối đa {maxQty})</label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={maxQty}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-20 text-center font-bold text-lg"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                        disabled={quantity >= maxQty}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-2 p-3 rounded-lg border border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Đơn giá:</span>
                      <span>{coinPerUnit} xu</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Số lượng:</span>
                      <span>x{quantity}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold">
                      <span>Tổng cộng:</span>
                      <span className="text-primary">{totalCoin} xu</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Số dư hiện tại:</span>
                      <span>{userCoinBalance} xu</span>
                    </div>
                    {userCoinBalance < totalCoin && (
                      <p className="text-destructive text-xs mt-1">⚠️ Không đủ xu. Vui lòng nạp thêm.</p>
                    )}
                  </div>
                </div>
              );
            })()}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowPurchaseModal(false)}>Hủy</Button>
              {selectedProduct && userCoinBalance < Math.ceil(selectedProduct.price / 1000) * quantity ? (
                <Button onClick={() => { setShowPurchaseModal(false); navigate('/buy-coins'); }}>Nạp xu</Button>
              ) : (
                <Button onClick={handlePurchase} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Xác nhận mua
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Orders Modal */}
        <Dialog open={showOrdersModal} onOpenChange={setShowOrdersModal}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Đơn hàng của tôi</DialogTitle>
              <DialogDescription>Theo dõi trạng thái đơn hàng</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {userOrders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Bạn chưa có đơn hàng nào</p>
              ) : (
                userOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{order.accounts?.title || 'Tài khoản'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    {order.status === 'approved' && (
                      <Button size="sm" variant="outline" className="gap-1 w-full" onClick={() => handleViewCredentials(order.id)} disabled={loadingCredentials === order.id}>
                        {loadingCredentials === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                        Xem thông tin
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Credentials Modal */}
        <Dialog open={!!viewingCredentials} onOpenChange={() => { setViewingCredentials(null); setShowPassword(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Thông tin tài khoản
              </DialogTitle>
            </DialogHeader>
            {viewingCredentials && (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tài khoản:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-secondary px-2 py-1 rounded font-mono text-sm">{viewingCredentials.account_username}</code>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(viewingCredentials.account_username, 'username')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mật khẩu:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-secondary px-2 py-1 rounded font-mono text-sm">
                        {showPassword ? viewingCredentials.account_password : '••••••••'}
                      </code>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(viewingCredentials.account_password, 'mật khẩu')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {viewingCredentials.account_email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-secondary px-2 py-1 rounded font-mono text-xs">{viewingCredentials.account_email}</code>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(viewingCredentials.account_email!, 'email')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Vui lòng đổi mật khẩu sau khi đăng nhập.
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => { setViewingCredentials(null); setShowPassword(false); }}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product View Dialog */}
        <ProductViewDialog
          product={viewingProduct}
          open={showProductView}
          onClose={() => setShowProductView(false)}
          onBuy={(acc) => { setShowProductView(false); navigate(`/checkout?account=${acc.id}`); }}
          onClaimFree={(acc) => { setShowProductView(false); handleClaimFree({ ...productGroups[0], accounts: [acc as any] } as any); }}
        />
      </PageWrapper>
    </div>
  );
};

export default Accounts;
