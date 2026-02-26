import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ShoppingCart, Coins, TrendingUp, Package, BarChart3 } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  todayOrders: number;
  todayUsers: number;
  pendingCoinPurchases: number;
  pendingWithdrawals: number;
}

export default function AdminDashboard() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalOrders: 0, totalRevenue: 0, totalProducts: 0,
    todayOrders: 0, todayUsers: 0, pendingCoinPurchases: 0, pendingWithdrawals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/');
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) fetchStats();
  }, [user, isAdmin]);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        ordersRes,
        productsRes,
        pendingCoinsRes,
        pendingWithdrawalsRes,
        recentOrdersRes,
        approvedOrdersRes,
      ] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('coin_purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('id, amount, status, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('orders').select('amount').eq('status', 'approved'),
      ]);

      const totalRevenue = (approvedOrdersRes.data || []).reduce((sum, o) => sum + (o.amount || 0), 0);

      setStats({
        totalUsers: 0, // Can't count auth.users from client
        totalOrders: ordersRes.count || 0,
        totalRevenue,
        totalProducts: productsRes.count || 0,
        todayOrders: 0,
        todayUsers: 0,
        pendingCoinPurchases: pendingCoinsRes.count || 0,
        pendingWithdrawals: pendingWithdrawalsRes.count || 0,
      });
      setRecentOrders(recentOrdersRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAdmin) return null;

  const statCards = [
    { title: 'Tổng đơn hàng', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Doanh thu (xu)', value: stats.totalRevenue.toLocaleString('vi-VN'), icon: Coins, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { title: 'Tổng sản phẩm', value: stats.totalProducts, icon: Package, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Chờ duyệt nạp xu', value: stats.pendingCoinPurchases, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Chờ rút tiền', value: stats.pendingWithdrawals, icon: Coins, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className={cn("transition-all duration-300 p-4 md:p-8", !isMobile && "ml-60")}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Tổng quan hệ thống</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((stat, i) => (
              <Card key={i} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bg)}>
                      <stat.icon className={cn("h-5 w-5", stat.color)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-lg font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Chưa có đơn hàng</p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-mono text-muted-foreground">{order.id.slice(0, 8)}...</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{order.amount?.toLocaleString('vi-VN')} xu</p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          order.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                          order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        )}>
                          {order.status === 'approved' ? 'Đã duyệt' : order.status === 'pending' ? 'Chờ duyệt' : order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
