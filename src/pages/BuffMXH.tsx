import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SEOHead } from '@/components/seo/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Zap, TrendingUp, CheckCircle, Clock, XCircle, ArrowLeft, Coins, AlertTriangle } from 'lucide-react';
import { ScrollReveal } from '@/components/motion';

interface BuffService {
  id: string;
  platform: string;
  service_type: string;
  label: string;
  icon: string;
  price_per_unit: number;
  min_quantity: number;
  max_quantity: number;
  description: string | null;
}

interface BuffOrder {
  id: string;
  service_type: string;
  target_url: string;
  quantity: number;
  total_price: number;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Chờ xử lý', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  processing: { label: 'Đang buff', color: 'bg-blue-500/20 text-blue-400', icon: Loader2 },
  completed: { label: 'Hoàn thành', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  refunded: { label: 'Đã hoàn xu', color: 'bg-purple-500/20 text-purple-400', icon: ArrowLeft },
};

export default function BuffMXH() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<BuffService[]>([]);
  const [orders, setOrders] = useState<BuffOrder[]>([]);
  const [selectedService, setSelectedService] = useState<BuffService | null>(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [servicesRes, ordersRes, coinsRes] = await Promise.all([
      supabase.from('buff_services').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('buff_orders').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('user_coins').select('balance').eq('user_id', user!.id).single(),
    ]);
    setServices((servicesRes.data as any[]) || []);
    setOrders((ordersRes.data as any[]) || []);
    setUserBalance(coinsRes.data?.balance || 0);
    setLoading(false);
  };

  const totalPrice = selectedService ? Math.ceil(quantity * selectedService.price_per_unit) : 0;

  const handleSubmit = async () => {
    if (!selectedService || !targetUrl.trim() || submitting) return;

    if (!targetUrl.includes('tiktok.com')) {
      toast.error('Vui lòng nhập link TikTok hợp lệ');
      return;
    }

    if (userBalance < totalPrice) {
      toast.error(`Không đủ xu! Cần ${totalPrice.toLocaleString()} xu, bạn có ${userBalance.toLocaleString()} xu`);
      return;
    }

    setSubmitting(true);
    try {
      // Deduct coins
      const { error: coinErr } = await supabase
        .from('user_coins')
        .update({ balance: userBalance - totalPrice, updated_at: new Date().toISOString() })
        .eq('user_id', user!.id);

      if (coinErr) throw coinErr;

      // Create order
      const { error: orderErr } = await supabase.from('buff_orders').insert({
        user_id: user!.id,
        platform: 'tiktok',
        service_type: selectedService.service_type,
        target_url: targetUrl.trim(),
        quantity,
        price_per_unit: selectedService.price_per_unit,
        total_price: totalPrice,
      });

      if (orderErr) {
        // Rollback coins
        await supabase.from('user_coins').update({ balance: userBalance }).eq('user_id', user!.id);
        throw orderErr;
      }

      // Log coin history
      await supabase.from('coin_history').insert({
        user_id: user!.id,
        amount: -totalPrice,
        type: 'buff_purchase',
        description: `Buff ${selectedService.label} x${quantity}`,
      });

      // Notify admins
      const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            title: '🔥 Đơn Buff MXH mới',
            message: `${selectedService.label} x${quantity} - ${totalPrice} xu`,
            type: 'buff_order',
          });
        }
      }

      toast.success('Đã đặt đơn buff thành công! Admin sẽ xử lý sớm.');
      setSelectedService(null);
      setTargetUrl('');
      setQuantity(100);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message || 'Không thể đặt đơn'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEOHead title="Buff MXH TikTok - BonzShop" description="Dịch vụ tăng followers, likes, views TikTok giá rẻ" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Buff MXH</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Buff TikTok</h1>
            <p className="text-muted-foreground">Tăng followers, likes, views nhanh chóng</p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
              <Coins className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Số dư: <strong className="text-accent">{userBalance.toLocaleString()} xu</strong></span>
            </div>
          </div>
        </ScrollReveal>

        {/* Service Selection */}
        {!selectedService ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {services.map((service) => (
              <Card
                key={service.id}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group"
                onClick={() => {
                  setSelectedService(service);
                  setQuantity(service.min_quantity);
                }}
              >
                <CardContent className="p-5">
                  <div className="text-3xl mb-3">{service.icon}</div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{service.label}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{service.price_per_unit} xu/1</Badge>
                    <span className="text-xs text-muted-foreground">{service.min_quantity} - {service.max_quantity.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Order Form */
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{selectedService.icon}</span>
                  {selectedService.label}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedService(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Link TikTok</label>
                <Input
                  placeholder="https://www.tiktok.com/@username/video/..."
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedService.service_type === 'followers' ? 'Dán link profile TikTok' : 'Dán link video TikTok'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Số lượng: <strong className="text-primary">{quantity.toLocaleString()}</strong></label>
                  <span className="text-xs text-muted-foreground">{selectedService.min_quantity} - {selectedService.max_quantity.toLocaleString()}</span>
                </div>
                <Slider
                  value={[quantity]}
                  onValueChange={([v]) => setQuantity(v)}
                  min={selectedService.min_quantity}
                  max={selectedService.max_quantity}
                  step={selectedService.min_quantity >= 100 ? 100 : 10}
                />
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đơn giá:</span>
                  <span>{selectedService.price_per_unit} xu / 1 {selectedService.service_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Số lượng:</span>
                  <span>{quantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-border/50 pt-2">
                  <span>Tổng:</span>
                  <span className="text-primary">{totalPrice.toLocaleString()} xu</span>
                </div>
              </div>

              {userBalance < totalPrice && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Không đủ xu. Vui lòng nạp thêm {(totalPrice - userBalance).toLocaleString()} xu.
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting || !targetUrl.trim() || userBalance < totalPrice}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang xử lý...</>
                ) : (
                  <><TrendingUp className="h-4 w-4 mr-2" /> Đặt đơn Buff - {totalPrice.toLocaleString()} xu</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Order History */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Lịch sử đơn Buff
        </h2>
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Chưa có đơn buff nào
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const st = statusMap[order.status] || statusMap.pending;
              const Icon = st.icon;
              return (
                <Card key={order.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm capitalize">{order.service_type}</span>
                        <Badge className={st.color + ' text-xs'}>{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{order.target_url}</p>
                      {order.admin_note && (
                        <p className="text-xs text-accent mt-1">📝 {order.admin_note}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm">{order.quantity.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{order.total_price.toLocaleString()} xu</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
