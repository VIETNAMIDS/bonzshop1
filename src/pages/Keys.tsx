import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Loader2, Package, Coins, Key, Copy, Eye, EyeOff } from "lucide-react";

interface Seller {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

interface KeyItem {
  id: string;
  title: string;
  description: string | null;
  key_value: string;
  price: number;
  category: string;
  image_url: string | null;
  is_sold: boolean;
  seller_id: string | null;
  sellers?: Seller | null;
  created_at: string;
}

const Keys = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Purchase modal
  const [selectedKey, setSelectedKey] = useState<KeyItem | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userCoinBalance, setUserCoinBalance] = useState(0);

  const fetchKeys = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('keys')
        .select('id, title, description, key_value, price, category, image_url, is_sold, seller_id, created_at')
        .eq('is_sold', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const keysWithSellers = await Promise.all(
        (data || []).map(async (key: any) => {
          let sellerInfo = null;
          if (key.seller_id) {
            const { data: seller } = await supabase
              .from('sellers_public')
              .select('id, display_name, avatar_url')
              .eq('id', key.seller_id)
              .single();
            sellerInfo = seller;
          }
          return { ...key, sellers: sellerInfo };
        })
      );

      setKeys(keysWithSellers as KeyItem[]);
    } catch (error) {
      console.error('Error fetching keys:', error);
      toast.error('Không thể tải danh sách key');
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserCoinBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    setUserCoinBalance(data?.balance || 0);
  };

  useEffect(() => { fetchKeys(); }, [fetchKeys]);
  useEffect(() => { if (user) fetchUserCoinBalance(); }, [user]);

  const uniqueCategories = [...new Set(keys.map(k => k.category).filter(Boolean))];

  const filteredKeys = keys.filter(key => {
    const matchesSearch = key.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (key.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === "all" || key.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN").format(price) + ' VNĐ';

  const handleOpenPurchase = (key: KeyItem) => {
    if (!user) { navigate("/auth"); return; }
    setSelectedKey(key);
    setShowPurchaseModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedKey || !user) return;

    if (userCoinBalance < selectedKey.price) {
      toast.error(`Không đủ xu! Cần ${selectedKey.price} xu, bạn có ${userCoinBalance} xu.`);
      return;
    }

    setSubmitting(true);

    try {
      // Deduct coins
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({ balance: userCoinBalance - selectedKey.price, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (coinError) throw coinError;

      // Mark key as sold
      await supabase.from('keys').update({
        is_sold: true,
        sold_to: user.id,
        sold_at: new Date().toISOString(),
        buyer_id: user.id,
      }).eq('id', selectedKey.id);

      // Create order
      await supabase.from("orders").insert({
        buyer_id: user.id,
        user_id: user.id,
        amount: selectedKey.price,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        order_type: 'key_purchase',
        login_credentials: { key_value: selectedKey.key_value, key_title: selectedKey.title },
      });

      // Coin history
      await supabase.from('coin_history').insert({
        user_id: user.id,
        amount: -selectedKey.price,
        type: 'key_purchase',
        description: `Mua key "${selectedKey.title}"`,
      });

      // Send telegram notification
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${SUPABASE_URL}/functions/v1/send-telegram-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'key_purchase',
            userEmail: user.email,
            productTitle: selectedKey.title,
            amount: selectedKey.price,
          })
        });
      } catch {}

      setUserCoinBalance(prev => prev - selectedKey.price);
      toast.success("Mua key thành công! Xem trong Đơn hàng của tôi.");
      setShowPurchaseModal(false);
      fetchKeys();
      navigate('/my-orders');
    } catch (err) {
      console.error("Error purchasing key:", err);
      toast.error("Không thể mua key");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageWrapper>
        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Key className="h-7 w-7 text-primary" />
              Mua Key
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Mua key bản quyền phần mềm, game và nhiều hơn nữa</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm key..."
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
          {!loading && filteredKeys.length === 0 && (
            <div className="text-center py-20">
              <Key className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Không tìm thấy key</h3>
              <p className="text-muted-foreground">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}

          {/* Key Grid */}
          {!loading && filteredKeys.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredKeys.map((key) => (
                <div
                  key={key.id}
                  className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer"
                  onClick={() => handleOpenPurchase(key)}
                >
                  {/* Image */}
                  <div className="aspect-[16/10] relative overflow-hidden bg-secondary/30">
                    {key.image_url ? (
                      <img
                        src={key.image_url}
                        alt={key.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Key className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-primary/90">
                        🔑 Key
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
                      {key.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-bold text-sm">
                        {formatPrice(key.price)}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">
                        <Coins className="h-2.5 w-2.5 mr-0.5" />
                        {key.price} xu
                      </Badge>
                    </div>
                    {key.sellers && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {key.sellers.display_name}
                      </p>
                    )}
                    {key.category && (
                      <Badge variant="secondary" className="text-[10px] mt-1">{key.category}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Purchase Modal */}
          <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Mua Key
                </DialogTitle>
                <DialogDescription>Xác nhận mua key</DialogDescription>
              </DialogHeader>

              {selectedKey && (
                <div className="space-y-4">
                  {/* Key info */}
                  <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    {selectedKey.image_url ? (
                      <img src={selectedKey.image_url} alt={selectedKey.title} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Key className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedKey.title}</p>
                      <p className="text-sm text-primary font-bold">{formatPrice(selectedKey.price)}</p>
                      <p className="text-xs text-muted-foreground">{selectedKey.price} xu</p>
                    </div>
                  </div>

                  {/* Price summary */}
                  <div className="border border-border rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Đơn giá:</span>
                      <span>{selectedKey.price} xu</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                      <span>Tổng cộng:</span>
                      <span className="text-primary">{selectedKey.price} xu</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Số dư hiện tại:</span>
                      <span>{userCoinBalance} xu</span>
                    </div>
                  </div>

                  {userCoinBalance < selectedKey.price && (
                    <p className="text-sm text-destructive">
                      ⚠️ Không đủ xu! Cần thêm {selectedKey.price - userCoinBalance} xu.
                    </p>
                  )}
                </div>
              )}

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPurchaseModal(false)}>
                  HỦY
                </Button>
                <Button
                  variant="gradient"
                  onClick={handlePurchase}
                  disabled={submitting || !selectedKey || userCoinBalance < (selectedKey?.price || 0)}
                  className="gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  XÁC NHẬN MUA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </PageWrapper>
    </div>
  );
};

export default Keys;
