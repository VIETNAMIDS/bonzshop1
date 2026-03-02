import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Package, ShoppingBag, CheckCircle, Clock, XCircle, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  login_credentials: any;
  product?: {
    id: string;
    title: string;
    image_url: string | null;
    download_url: string | null;
  };
  account?: {
    id: string;
    title: string;
    image_url: string | null;
    platform: string;
  };
}

export function ChildMyOrders() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { website, primaryColor, secondaryColor } = useChildWebsite();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(id, title, image_url, download_url),
          account:accounts_public(id, title, image_url, platform)
        `)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Đã duyệt</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Chờ duyệt</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-4"
            style={{ 
              background: `linear-gradient(to right, ${primaryColor}10, ${secondaryColor}10)`,
              borderColor: primaryColor + '30'
            }}
          >
            <ShoppingBag className="h-4 w-4" style={{ color: primaryColor }} />
            <span className="text-sm font-medium" style={{ color: primaryColor }}>Lịch sử mua hàng</span>
          </div>
          <h1 className="text-3xl font-bold">
            Đơn hàng <span style={{ color: primaryColor }}>của tôi</span>
          </h1>
        </div>

        {/* Orders */}
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto mb-4" style={{ color: primaryColor + '50' }} />
            <p className="text-muted-foreground mb-4">Bạn chưa có đơn hàng nào</p>
            <Button 
              onClick={() => navigate(`/store/${slug}/accounts`)}
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
            >
              Mua ngay
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const item = order.product || order.account;
              
              return (
                <Card 
                  key={order.id}
                  className="overflow-hidden"
                  style={{ borderColor: primaryColor + '20' }}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary/50 flex-shrink-0">
                        {item?.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item?.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold line-clamp-1">
                              {item?.title || 'Sản phẩm'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold" style={{ color: primaryColor }}>
                            {order.amount} xu
                          </span>
                          
                          <div className="flex gap-2">
                            {order.status === 'approved' && order.login_credentials && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Xem
                              </Button>
                            )}
                            {order.status === 'approved' && order.product?.download_url && (
                              <Button 
                                size="sm"
                                onClick={() => window.open(order.product?.download_url, '_blank')}
                                style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Tải xuống
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Credentials Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thông tin tài khoản</DialogTitle>
            </DialogHeader>
            
            {selectedOrder?.login_credentials && (
              <div className="space-y-3">
                {Object.entries(selectedOrder.login_credentials).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-muted-foreground capitalize">{key}:</span>
                    <span className="font-mono font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
