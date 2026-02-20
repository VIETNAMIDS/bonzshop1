import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { PageWrapper } from "@/components/layout/PageWrapper";
 import { ProductViewDialog } from "@/components/ProductViewDialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, ShoppingCart, Search, Filter, Loader2, QrCode, CheckCircle, Clock, XCircle, Eye, EyeOff, Copy, Grid3X3 } from "lucide-react";
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
  accounts?: {
    title: string;
  };
}

interface AccountCredentials {
  title: string;
  account_username: string;
  account_password: string;
  account_email: string | null;
  account_phone: string | null;
}

// Default bank info (fallback if seller has no bank info)
const DEFAULT_BANK_ACCOUNT = "0762694589";
const DEFAULT_BANK_NAME = "MB BANK";

// Full app catalog - all platforms with icons and colors
const APP_CATALOG = [
  // Mạng xã hội
  { name: 'Facebook', icon: '📘', color: '#1877F2', group: 'Mạng xã hội' },
  { name: 'Instagram', icon: '📸', color: '#E4405F', group: 'Mạng xã hội' },
  { name: 'TikTok', icon: '🎵', color: '#010101', group: 'Mạng xã hội' },
  { name: 'Twitter', icon: '🐦', color: '#1DA1F2', group: 'Mạng xã hội' },
  { name: 'Threads', icon: '🧵', color: '#000000', group: 'Mạng xã hội' },
  { name: 'Snapchat', icon: '👻', color: '#FFFC00', group: 'Mạng xã hội' },
  { name: 'Pinterest', icon: '📌', color: '#E60023', group: 'Mạng xã hội' },
  { name: 'Reddit', icon: '🟠', color: '#FF4500', group: 'Mạng xã hội' },
  { name: 'Zalo', icon: '💙', color: '#0068FF', group: 'Mạng xã hội' },
  { name: 'Telegram', icon: '✈️', color: '#0088CC', group: 'Mạng xã hội' },
  { name: 'Discord', icon: '💬', color: '#5865F2', group: 'Mạng xã hội' },
  { name: 'LinkedIn', icon: '💼', color: '#0A66C2', group: 'Mạng xã hội' },
  // Giải trí & Streaming
  { name: 'Netflix', icon: '🎬', color: '#E50914', group: 'Giải trí' },
  { name: 'Spotify', icon: '🎧', color: '#1DB954', group: 'Giải trí' },
  { name: 'YouTube', icon: '▶️', color: '#FF0000', group: 'Giải trí' },
  { name: 'YouTube Premium', icon: '🔴', color: '#FF0000', group: 'Giải trí' },
  { name: 'Disney+', icon: '🏰', color: '#113CCF', group: 'Giải trí' },
  { name: 'HBO Max', icon: '🎭', color: '#5822B4', group: 'Giải trí' },
  { name: 'Apple Music', icon: '🍎', color: '#FA2D48', group: 'Giải trí' },
  { name: 'SoundCloud', icon: '🔊', color: '#FF5500', group: 'Giải trí' },
  // Game
  { name: 'Steam', icon: '🎮', color: '#1B2838', group: 'Game' },
  { name: 'Epic Games', icon: '🕹️', color: '#313131', group: 'Game' },
  { name: 'Riot Games', icon: '⚔️', color: '#D32936', group: 'Game' },
  { name: 'Valorant', icon: '🔫', color: '#FF4655', group: 'Game' },
  { name: 'League of Legends', icon: '🏆', color: '#C89B3C', group: 'Game' },
  { name: 'Genshin Impact', icon: '⭐', color: '#4B7FBF', group: 'Game' },
  { name: 'Roblox', icon: '🧱', color: '#E2231A', group: 'Game' },
  { name: 'Minecraft', icon: '⛏️', color: '#62B47A', group: 'Game' },
  { name: 'PUBG', icon: '🪖', color: '#F2A900', group: 'Game' },
  { name: 'Free Fire', icon: '🔥', color: '#FF6F00', group: 'Game' },
  { name: 'Liên Quân', icon: '⚡', color: '#FF6600', group: 'Game' },
  { name: 'PlayStation', icon: '🎯', color: '#003087', group: 'Game' },
  { name: 'Xbox', icon: '🟢', color: '#107C10', group: 'Game' },
  { name: 'Nintendo', icon: '🍄', color: '#E60012', group: 'Game' },
  // Công cụ & Phần mềm
  { name: 'Canva', icon: '🎨', color: '#00C4CC', group: 'Công cụ' },
  { name: 'ChatGPT', icon: '🤖', color: '#10A37F', group: 'Công cụ' },
  { name: 'Adobe', icon: '🖌️', color: '#FF0000', group: 'Công cụ' },
  { name: 'Microsoft', icon: '🪟', color: '#0078D4', group: 'Công cụ' },
  { name: 'Google', icon: '🔍', color: '#4285F4', group: 'Công cụ' },
  { name: 'Notion', icon: '📝', color: '#000000', group: 'Công cụ' },
  { name: 'Figma', icon: '🎯', color: '#F24E1E', group: 'Công cụ' },
  { name: 'Grammarly', icon: '✍️', color: '#15C39A', group: 'Công cụ' },
  { name: 'VPN', icon: '🔒', color: '#4A90D9', group: 'Công cụ' },
  // Mua sắm
  { name: 'Shopee', icon: '🛒', color: '#EE4D2D', group: 'Mua sắm' },
  { name: 'Lazada', icon: '🛍️', color: '#0F146D', group: 'Mua sắm' },
  { name: 'Tiki', icon: '📦', color: '#1A94FF', group: 'Mua sắm' },
  { name: 'Amazon', icon: '📦', color: '#FF9900', group: 'Mua sắm' },
  { name: 'Grab', icon: '🚗', color: '#00B14F', group: 'Mua sắm' },
  // Khác
  { name: 'Email', icon: '📧', color: '#EA4335', group: 'Khác' },
  { name: 'Apple', icon: '🍎', color: '#555555', group: 'Khác' },
  { name: 'Khác', icon: '📱', color: '#888888', group: 'Khác' },
];

const APP_GROUPS = ['Mạng xã hội', 'Giải trí', 'Game', 'Công cụ', 'Mua sắm', 'Khác'];

const Accounts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [showSold, setShowSold] = useState(false);
  
  // Payment modal
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'vnd' | 'coin'>('vnd');
  const [userCoinBalance, setUserCoinBalance] = useState(0);
  
  // User orders
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  
  // Credentials viewing
  const [viewingCredentials, setViewingCredentials] = useState<AccountCredentials | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
 
   // Product view dialog
   const [viewingProduct, setViewingProduct] = useState<Account | null>(null);
   const [showProductView, setShowProductView] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      // Marketplace listing: query accounts table with RLS (anyone can view unsold accounts)
      // Only select public fields - password/email/phone are not exposed
      const { data, error } = await supabase
        .from('accounts')
        .select('id, title, description, account_username, price, category, image_url, is_sold, is_free, created_at, seller_id')
        .eq('is_sold', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      // Fetch seller info separately for each account
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
          return {
            ...account,
            sellers: sellerInfo,
            is_free: account.is_free || false,
          };
        })
      );

      setAccounts(accountsWithSellers as Account[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Không thể tải danh sách tài khoản. Vui lòng thử lại sau.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("name");
      
      if (error) throw error;
      setCategories(data?.map(c => c.name) || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchUserOrders = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          account_id,
          status,
          amount,
          created_at,
          accounts (
            title
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserOrders((data as unknown as Order[]) || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [user]);

  const fetchUserCoinBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
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

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, [fetchAccounts, fetchCategories]);

  useEffect(() => {
    if (user) {
      fetchUserOrders();
      fetchUserCoinBalance();
    }
  }, [user, fetchUserOrders]);

  const [showCoinConfirm, setShowCoinConfirm] = useState(false);
  const [pendingCoinAccount, setPendingCoinAccount] = useState<Account | null>(null);
  const [pendingCoinRequired, setPendingCoinRequired] = useState<number | null>(null);
  const [submittingCoin, setSubmittingCoin] = useState(false);

  const performBuyWithCoin = async (account: Account, requiredCoin: number) => {
    setSubmittingCoin(true);
    try {
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({
          balance: userCoinBalance - requiredCoin,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (coinError) throw coinError;

      const { data: orderData, error } = await supabase
        .from("orders")
        .insert({
          account_id: account.id,
          buyer_id: user?.id!,
          user_id: user?.id,
          amount: requiredCoin,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      setUserCoinBalance(prev => prev - requiredCoin);
      toast.success(`Mua thành công! Đã trừ ${requiredCoin} xu.`);
      fetchUserOrders();
      // Redirect to orders page
      navigate('/my-orders');
    } catch (err) {
      console.error("Error buying account with coin:", err);
      toast.error("Không thể mua bằng xu, vui lòng thử lại");
    } finally {
      setSubmittingCoin(false);
      setShowCoinConfirm(false);
      setPendingCoinAccount(null);
      setPendingCoinRequired(null);
    }
  };

  // Function to get credentials securely via edge function
  const handleViewCredentials = async (orderId: string) => {
    setLoadingCredentials(orderId);
    try {
      const credentials = await getPurchasedCredentials(orderId);
      setViewingCredentials(credentials);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      toast.error("Không thể tải thông tin tài khoản");
    } finally {
      setLoadingCredentials(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const generateQRUrl = (amount: number, accountTitle: string, bankAccount: string, bankCode: string = 'MB') => {
    // VietQR format
    const content = `Mua ${accountTitle}`.slice(0, 25);
    return `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`;
  };

  // Payment uses platform default bank info (seller banking is not public)
  const getSellerBankInfo = (_account: Account) => {
    return {
      bankName: DEFAULT_BANK_NAME,
      bankAccountNumber: DEFAULT_BANK_ACCOUNT,
      bankAccountName: 'Bonz Shop',
      sellerName: 'Bonz Shop',
    };
  };
 
   // Open product view dialog (click on product to view details with timer)
   const handleViewProduct = (account: Account) => {
     setViewingProduct(account);
     setShowProductView(true);
   };

  const handleBuy = (account: Account) => {
     setShowProductView(false);
    // Redirect to checkout page with account info
    navigate(`/checkout?account=${account.id}`);
  };

  // Handle claiming free accounts
  const handleClaimFreeAccount = async (account: Account) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để nhận tài khoản");
      navigate("/auth");
      return;
    }
     
     setShowProductView(false);

    if (account.is_sold) {
      toast.error("Tài khoản đã được lấy");
      return;
    }

    try {
      // Mark account as sold to this user
      const { error } = await supabase
        .from('accounts')
        .update({
          is_sold: true,
          sold_to: user.id,
          sold_at: new Date().toISOString()
        })
        .eq('id', account.id)
        .eq('is_free', true)
        .eq('is_sold', false);

      if (error) throw error;

      // Create order for free account
      await supabase
        .from("orders")
        .insert({
          account_id: account.id,
          buyer_id: user.id,
          user_id: user.id,
          amount: 0,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        });

      toast.success("Nhận tài khoản miễn phí thành công!");
      fetchAccounts();
      fetchUserOrders();
      navigate('/my-orders');
    } catch (error) {
      console.error("Error claiming free account:", error);
      toast.error("Không thể nhận tài khoản miễn phí");
    }
  };

  const handleBuyWithCoin = async (account: Account) => {
    // Show confirmation modal for coin purchase
    if (!user) {
      toast.error("Vui lòng đăng nhập để mua tài khoản");
      navigate("/auth");
      return;
    }

    if (account.is_sold) {
      toast.error("Tài khoản đã được bán");
      return;
    }

    // Calculate coin required: price / 1000
    const requiredCoin = Math.ceil(account.price / 1000);
    setPendingCoinAccount(account);
    setPendingCoinRequired(requiredCoin);
    setShowCoinConfirm(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedAccount || !user) return;

    setSubmittingPayment(true);

    try {
      // Always use coin payment
      const coinPrice = Math.ceil(selectedAccount.price / 1000);
      
      if (userCoinBalance < coinPrice) {
        toast.error(`Không đủ xu! Cần ${coinPrice} xu, bạn chỉ có ${userCoinBalance} xu.`);
        setSubmittingPayment(false);
        return;
      }

      // Deduct coins from user balance
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({
          balance: userCoinBalance - coinPrice,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (coinError) throw coinError;

      // Create order for coin purchase (auto-approved)
      const { data: orderData, error } = await supabase
        .from("orders")
        .insert({
          account_id: selectedAccount.id,
          buyer_id: user.id,
          user_id: user.id,
          amount: coinPrice,
          status: 'approved', // Auto-approved for coin purchases
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Mark account as sold
      await supabase
        .from('accounts')
        .update({
          is_sold: true,
          sold_to: user.id,
          sold_at: new Date().toISOString()
        })
        .eq('id', selectedAccount.id);

      // Update local balance
      setUserCoinBalance(prev => prev - coinPrice);

      toast.success(`Mua thành công! Đã trừ ${coinPrice} xu. Tài khoản đã sẵn sàng sử dụng.`);

      setShowPaymentModal(false);
      setSelectedAccount(null);
      fetchUserOrders();
      navigate('/my-orders');
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Không thể tạo đơn hàng");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Chờ xác nhận</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Đã duyệt</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Từ chối</Badge>;
      default:
        return null;
    }
  };

  const getPlatformIcon = (category: string) => {
    const app = APP_CATALOG.find(a => a.name.toLowerCase() === category?.toLowerCase());
    return app?.icon || '📱';
  };

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = account.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesCategory = selectedCategory === "all" || account.category === selectedCategory;
    const matchesApp = !selectedApp || account.category?.toLowerCase() === selectedApp.toLowerCase();
    const matchesSoldStatus = showSold || !account.is_sold;

    return matchesSearch && matchesCategory && matchesApp && matchesSoldStatus;
  });

  // Count accounts per app
  const accountCountByApp = accounts.reduce<Record<string, number>>((counts, acc) => {
    const cat = acc.category || 'Khác';
    counts[cat] = (counts[cat] || 0) + 1;
    return counts;
  }, {});


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageWrapper>
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Mua Tài Khoản
            </h1>
            <p className="text-muted-foreground">
              Tìm và mua các tài khoản chất lượng với giá tốt nhất
            </p>
          </div>
          
          {user && (
            <Button 
              variant="outline" 
              onClick={() => setShowOrdersModal(true)}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Đơn hàng ({userOrders.filter(o => o.status === 'pending').length})
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tài khoản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showSold ? "default" : "outline"}
            onClick={() => setShowSold(!showSold)}
            className="whitespace-nowrap"
          >
            {showSold ? "Ẩn đã bán" : "Hiện đã bán"}
          </Button>
        </div>

        {/* App Catalog Grid */}
        {!selectedApp && !searchTerm && (
          <div className="mb-8 space-y-6">
            {APP_GROUPS.map(group => {
              const appsInGroup = APP_CATALOG.filter(a => a.group === group);
              if (appsInGroup.length === 0) return null;
              return (
                <div key={group}>
                  <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    {group === 'Mạng xã hội' && '💬'}
                    {group === 'Giải trí' && '🎬'}
                    {group === 'Game' && '🎮'}
                    {group === 'Công cụ' && '🛠️'}
                    {group === 'Mua sắm' && '🛒'}
                    {group === 'Khác' && '📱'}
                    {group}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {appsInGroup.map(app => {
                      const count = accountCountByApp[app.name] || 0;
                      return (
                        <button
                          key={app.name}
                          onClick={() => {
                            setSelectedApp(app.name);
                            setSelectedCategory(app.name);
                          }}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/40 transition-all duration-200 group/app relative"
                        >
                          <span className="text-3xl">{app.icon}</span>
                          <span className="text-xs font-medium text-foreground truncate w-full text-center">{app.name}</span>
                          {count > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {count}
                            </span>
                          )}
                          {count === 0 && (
                            <span className="text-[10px] text-muted-foreground">Sắp có</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected App Filter Bar */}
        {selectedApp && (
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-secondary/50 border border-border">
            <span className="text-2xl">{APP_CATALOG.find(a => a.name === selectedApp)?.icon || '📱'}</span>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">{selectedApp}</h3>
              <p className="text-xs text-muted-foreground">{filteredAccounts.length} tài khoản có sẵn</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSelectedApp(null); setSelectedCategory('all'); }}>
              ← Tất cả app
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!loading && (selectedApp || searchTerm) && filteredAccounts.length === 0 && (
          <div className="text-center py-20">
            <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {selectedApp ? `Chưa có tài khoản ${selectedApp}` : 'Không tìm thấy tài khoản'}
            </h3>
            <p className="text-muted-foreground">
              {selectedApp ? 'Tài khoản sẽ được cập nhật sớm!' : 'Thử thay đổi bộ lọc hoặc tìm kiếm khác'}
            </p>
          </div>
        )}

        {/* Accounts List - shown when app selected or searching */}
        {(selectedApp || searchTerm) && filteredAccounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAccounts.map((account) => (
              <Card 
                key={account.id} 
                className={`group hover:shadow-lg transition-all duration-300 ${
                  account.is_sold ? "opacity-60" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    {account.image_url ? (
                      <img 
                        src={account.image_url} 
                        alt={account.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
                        {getPlatformIcon(account.category)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">
                        {account.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {account.category}
                        </Badge>
                        {account.is_sold && (
                          <Badge variant="destructive" className="text-xs">
                            Đã bán
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {account.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {account.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{account.account_username}</span>
                  </div>

                  {account.sellers && (
                    <div className="text-xs text-muted-foreground">
                      Người bán: <span className="font-medium text-foreground">{account.sellers.display_name}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    {account.is_free ? (
                      <div className="text-2xl font-bold text-green-500">
                        Miễn phí
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-primary">
                          {formatPrice(account.price)}
                        </div>
                        <div className="text-sm font-bold text-orange-600">
                          {Math.ceil(account.price / 1000)} xu
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full" 
                    disabled={account.is_sold}
                    onClick={() => handleViewProduct(account)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {account.is_sold ? "Đã bán" : "Xem chi tiết"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Thanh toán
            </DialogTitle>
            <DialogDescription>
              Chọn phương thức thanh toán phù hợp với bạn
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (() => {
            const coinPrice = Math.ceil(selectedAccount.price / 1000);

            return (
              <div className="space-y-4">
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Tài khoản:</p>
                  <p className="font-medium">{selectedAccount.title}</p>
                  {selectedAccount.sellers && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Người bán: <span className="font-medium text-foreground">{selectedAccount.sellers.display_name}</span>
                    </p>
                  )}
                  <p className="text-2xl font-bold text-primary mt-2">
                    {coinPrice} xu
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Số dư: {userCoinBalance} xu
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <div className="text-green-600 dark:text-green-400 text-sm">
                    💰 Thanh toán bằng xu - Mua ngay không cần chờ duyệt!
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tài khoản sẽ được kích hoạt ngay lập tức sau khi thanh toán.
                  </p>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentModal(false)}
              className="w-full sm:w-auto"
            >
              Hủy
            </Button>
            <Button 
              onClick={handleConfirmPayment}
              disabled={submittingPayment}
              className="w-full sm:w-auto"
            >
              {submittingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mua bằng xu
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coin confirmation dialog */}
      <Dialog open={showCoinConfirm} onOpenChange={setShowCoinConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận mua bằng xu</DialogTitle>
            <DialogDescription>Kiểm tra số dư và xác nhận thanh toán bằng xu</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Tài khoản:</p>
              <p className="font-medium">{pendingCoinAccount?.title}</p>
            </div>

            <div className="flex justify-between px-2">
              <div className="text-sm text-muted-foreground">Số xu cần:</div>
              <div className="font-medium">{pendingCoinRequired ?? '-' } xu</div>
            </div>
            <div className="flex justify-between px-2">
              <div className="text-sm text-muted-foreground">Số dư hiện tại:</div>
              <div className="font-medium">{userCoinBalance} xu</div>
            </div>
            <div className="flex justify-between px-2">
              <div className="text-sm text-muted-foreground">Số dư sau khi mua:</div>
              <div className="font-medium">{(userCoinBalance - (pendingCoinRequired ?? 0))} xu</div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCoinConfirm(false)} className="w-full sm:w-auto">Hủy</Button>
            {pendingCoinRequired !== null && userCoinBalance < pendingCoinRequired ? (
              <Button
                variant="default"
                onClick={() => {
                  setShowCoinConfirm(false);
                  navigate('/buy-coins');
                }}
                className="w-full sm:w-auto"
              >
                Nạp xu
              </Button>
            ) : (
              <Button
                onClick={() => pendingCoinAccount && pendingCoinRequired !== null && performBuyWithCoin(pendingCoinAccount, pendingCoinRequired)}
                disabled={submittingCoin}
                className="w-full sm:w-auto"
              >
                {submittingCoin ? 'Đang xử lý...' : 'Xác nhận mua bằng xu'}
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
            <DialogDescription>
              Theo dõi trạng thái đơn hàng và xem thông tin tài khoản đã mua
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {userOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Bạn chưa có đơn hàng nào
              </div>
            ) : (
              userOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{order.accounts?.title || 'Tài khoản'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <p className="text-lg font-bold text-primary">
                    {formatPrice(order.amount)}
                  </p>

                  {/* Show button to view credentials if approved */}
                  {order.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleViewCredentials(order.id)}
                      disabled={loadingCredentials === order.id}
                    >
                      {loadingCredentials === order.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      Xem thông tin tài khoản
                    </Button>
                  )}

                  {order.status === 'pending' && (
                    <p className="text-sm text-muted-foreground">
                      ⏳ Đang chờ Admin xác nhận thanh toán...
                    </p>
                  )}

                  {order.status === 'rejected' && (
                    <p className="text-sm text-red-500">
                      ❌ Đơn hàng bị từ chối. Vui lòng liên hệ Admin.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal - Secure view */}
      <Dialog open={!!viewingCredentials} onOpenChange={() => { setViewingCredentials(null); setShowPassword(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Thông tin tài khoản
            </DialogTitle>
            <DialogDescription>
              Thông tin đăng nhập của tài khoản bạn đã mua
            </DialogDescription>
          </DialogHeader>

          {viewingCredentials && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-secondary px-2 py-1 rounded font-mono">{viewingCredentials.account_username}</code>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(viewingCredentials.account_username, 'username')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mật khẩu:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-secondary px-2 py-1 rounded font-mono">
                      {showPassword ? viewingCredentials.account_password : '••••••••'}
                    </code>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(viewingCredentials.account_password, 'mật khẩu')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {viewingCredentials.account_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-secondary px-2 py-1 rounded font-mono text-sm">{viewingCredentials.account_email}</code>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(viewingCredentials.account_email!, 'email')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {viewingCredentials.account_phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SĐT:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-secondary px-2 py-1 rounded font-mono">{viewingCredentials.account_phone}</code>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(viewingCredentials.account_phone!, 'SĐT')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Vui lòng đổi mật khẩu sau khi đăng nhập để bảo vệ tài khoản của bạn.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => { setViewingCredentials(null); setShowPassword(false); }}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
       
       {/* Product View Dialog with Timer */}
       <ProductViewDialog
         product={viewingProduct}
         open={showProductView}
         onClose={() => setShowProductView(false)}
         onBuy={handleBuy}
         onClaimFree={handleClaimFreeAccount}
       />
      </PageWrapper>
    </div>
  );
};

export default Accounts;
