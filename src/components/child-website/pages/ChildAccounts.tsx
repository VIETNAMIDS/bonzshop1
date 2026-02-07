import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Package, Coins, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface Account {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  platform: string;
  account_type: string;
  features: string[] | null;
  is_sold: boolean;
  category: string | null;
}

export function ChildAccounts() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { website, primaryColor, secondaryColor } = useChildWebsite();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCoinBalance, setUserCoinBalance] = useState(0);
  
  // Purchase modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
    if (user) {
      fetchCoinBalance();
    }
  }, [website, user]);

  const fetchCoinBalance = async () => {
    const { data } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user?.id)
      .single();
    
    if (data) setUserCoinBalance(data.balance);
  };

  const fetchAccounts = async () => {
    if (!website) return;
    
    try {
      // Fetch accounts linked to this child website
      const { data: linkedProducts } = await supabase
        .from('child_website_products')
        .select('account_id')
        .eq('website_id', website.id);
      
      if (linkedProducts && linkedProducts.length > 0) {
        const accountIds = linkedProducts.map(p => p.account_id).filter(Boolean) as string[];
        
        if (accountIds.length > 0) {
          const { data } = await supabase
            .from('accounts_public')
            .select('*')
            .in('id', accountIds)
            .eq('is_active', true)
            .eq('is_sold', false);
          
          setAccounts(data || []);
        }
      } else {
        // If no linked accounts, show all available accounts
        const { data } = await supabase
          .from('accounts_public')
          .select('*')
          .eq('is_active', true)
          .eq('is_sold', false)
          .limit(50);
        
        setAccounts(data || []);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = (account: Account) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSelectedAccount(account);
    setShowConfirm(true);
  };

  const performPurchase = async () => {
    if (!selectedAccount || !user) return;
    
    setSubmitting(true);
    try {
      if (userCoinBalance < selectedAccount.price) {
        toast.error('Bạn không đủ xu. Vui lòng nạp thêm.');
        return;
      }

      // Deduct coins
      await supabase
        .from('user_coins')
        .update({ 
          balance: userCoinBalance - selectedAccount.price,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Create order
      await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          user_id: user.id,
          account_id: selectedAccount.id,
          amount: selectedAccount.price,
          status: 'approved',
          approved_at: new Date().toISOString()
        });

      setUserCoinBalance(prev => prev - selectedAccount.price);
      toast.success('Mua thành công!');
      navigate(`/store/${slug}/my-orders`);
    } catch (err) {
      console.error('Error purchasing:', err);
      toast.error('Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
      setSelectedAccount(null);
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Mua <span style={{ color: primaryColor }}>Tài khoản</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Khám phá các tài khoản chất lượng cao với giá tốt nhất
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tài khoản..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12"
            />
          </div>
        </div>

        {/* Accounts Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Chưa có tài khoản nào.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAccounts.map((account) => (
              <Card 
                key={account.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
                style={{ borderColor: primaryColor + '20' }}
              >
                <div className="aspect-video relative bg-secondary/30 overflow-hidden">
                  {account.image_url ? (
                    <img 
                      src={account.image_url} 
                      alt={account.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge style={{ background: primaryColor, color: 'white' }}>
                      {account.platform}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-1 line-clamp-1">{account.title}</h4>
                  {account.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {account.description}
                    </p>
                  )}
                  
                  {account.features && account.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {account.features.slice(0, 3).map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-lg font-bold" style={{ color: primaryColor }}>
                      <Coins className="h-5 w-5 text-yellow-500" />
                      {account.price.toLocaleString()} xu
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handlePurchase(account)}
                      style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                    >
                      Mua ngay
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận mua</DialogTitle>
            <DialogDescription>
              Bạn sẽ thanh toán {selectedAccount?.price} xu cho "{selectedAccount?.title}"
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
            {selectedAccount && userCoinBalance < selectedAccount.price && (
              <p className="text-destructive text-sm mt-2">
                Bạn không đủ xu. Vui lòng nạp thêm.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Hủy
            </Button>
            <Button 
              onClick={performPurchase}
              disabled={submitting || (selectedAccount ? userCoinBalance < selectedAccount.price : false)}
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
