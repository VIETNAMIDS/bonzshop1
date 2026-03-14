import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink, RotateCcw, Zap } from 'lucide-react';

interface BuffOrder {
  id: string;
  user_id: string;
  platform: string;
  service_type: string;
  target_url: string;
  quantity: number;
  total_price: number;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-purple-500/20 text-purple-400',
};

export default function AdminBuffOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<BuffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [editOrder, setEditOrder] = useState<BuffOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase.from('buff_orders').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query.limit(100);
    const orderData = (data as any[]) || [];
    setOrders(orderData);

    // Load profiles
    const userIds = [...new Set(orderData.map(o => o.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
      const map: Record<string, string> = {};
      profs?.forEach(p => { map[p.user_id] = p.display_name || 'Ẩn danh'; });
      setProfiles(map);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!editOrder || !newStatus || updating) return;
    setUpdating(true);
    try {
      // If refunding, return coins
      if (newStatus === 'refunded' && editOrder.status !== 'refunded') {
        const { data: coins } = await supabase.from('user_coins').select('balance').eq('user_id', editOrder.user_id).single();
        if (coins) {
          await supabase.from('user_coins').update({
            balance: coins.balance + editOrder.total_price,
            updated_at: new Date().toISOString(),
          }).eq('user_id', editOrder.user_id);

          await supabase.from('coin_history').insert({
            user_id: editOrder.user_id,
            amount: editOrder.total_price,
            type: 'buff_refund',
            description: `Hoàn xu đơn buff #${editOrder.id.slice(0, 8)}`,
            reference_id: editOrder.id,
          });
        }
      }

      await supabase.from('buff_orders').update({
        status: newStatus,
        admin_note: adminNote || null,
        processed_by: user!.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', editOrder.id);

      // Notify user
      const statusLabels: Record<string, string> = {
        processing: 'đang được xử lý',
        completed: 'đã hoàn thành',
        cancelled: 'đã bị hủy',
        refunded: 'đã được hoàn xu',
      };

      await supabase.from('notifications').insert({
        user_id: editOrder.user_id,
        title: `🔥 Đơn Buff ${statusLabels[newStatus] || newStatus}`,
        message: `${editOrder.service_type} x${editOrder.quantity}${adminNote ? ' - ' + adminNote : ''}`,
        type: 'buff_order',
        reference_id: editOrder.id,
      });

      toast.success('Đã cập nhật đơn buff');
      setEditOrder(null);
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Quản lý Buff MXH
          </h1>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Chờ xử lý</SelectItem>
              <SelectItem value="processing">Đang buff</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
              <SelectItem value="refunded">Hoàn xu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Không có đơn nào</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold capitalize">{order.service_type}</span>
                        <Badge className={statusColors[order.status] + ' text-xs'}>{order.status}</Badge>
                        <span className="text-xs text-muted-foreground">x{order.quantity.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">👤 {profiles[order.user_id] || 'Ẩn danh'}</p>
                      <a href={order.target_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {order.target_url}
                      </a>
                      {order.admin_note && <p className="text-xs text-accent mt-1">📝 {order.admin_note}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold">{order.total_price.toLocaleString()} xu</div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setEditOrder(order);
                          setNewStatus(order.status);
                          setAdminNote(order.admin_note || '');
                        }}
                      >
                        Xử lý
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editOrder} onOpenChange={(open) => !open && setEditOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xử lý đơn Buff</DialogTitle>
            </DialogHeader>
            {editOrder && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-secondary/50 text-sm space-y-1">
                  <p><strong>Dịch vụ:</strong> {editOrder.service_type} x{editOrder.quantity.toLocaleString()}</p>
                  <p><strong>Giá:</strong> {editOrder.total_price.toLocaleString()} xu</p>
                  <a href={editOrder.target_url} target="_blank" rel="noopener" className="text-primary hover:underline text-xs break-all">
                    {editOrder.target_url}
                  </a>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Trạng thái</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Chờ xử lý</SelectItem>
                      <SelectItem value="processing">Đang buff</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="cancelled">Hủy</SelectItem>
                      <SelectItem value="refunded">Hoàn xu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Ghi chú admin</label>
                  <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Ghi chú..." rows={2} />
                </div>

                {newStatus === 'refunded' && editOrder.status !== 'refunded' && (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    Sẽ hoàn {editOrder.total_price.toLocaleString()} xu cho người dùng
                  </div>
                )}

                <Button onClick={handleUpdate} disabled={updating} className="w-full">
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Cập nhật
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
