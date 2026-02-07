 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { Navbar } from '@/components/Navbar';
 import { PageWrapper } from '@/components/layout/PageWrapper';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Skeleton } from '@/components/ui/skeleton';
 import { 
   ArrowLeft, Coins, TrendingUp, TrendingDown, Gift,
   ShoppingCart, Plus, Minus, History,
   Sparkles, ArrowUpRight, ArrowDownRight
 } from 'lucide-react';
 import { format } from 'date-fns';
 import { vi } from 'date-fns/locale';
 
 interface CoinHistoryItem {
   id: string;
   amount: number;
   type: string;
   description: string | null;
   reference_id: string | null;
   created_at: string;
 }
 
 const typeConfig: Record<string, { icon: any; label: string; color: string; bgColor: string }> = {
   referral_reward: { 
     icon: Gift, 
     label: 'Thưởng giới thiệu', 
     color: 'text-green-500',
     bgColor: 'bg-green-500/10'
   },
   referral_bonus: { 
     icon: Gift, 
     label: 'Bonus giới thiệu', 
     color: 'text-emerald-500',
     bgColor: 'bg-emerald-500/10'
   },
   purchase: { 
     icon: Plus, 
     label: 'Nạp xu', 
     color: 'text-primary',
     bgColor: 'bg-primary/10'
   },
   spend: { 
     icon: ShoppingCart, 
     label: 'Chi tiêu', 
     color: 'text-orange-500',
     bgColor: 'bg-orange-500/10'
   },
   seller_registration: { 
     icon: Minus, 
     label: 'Đăng ký Seller', 
     color: 'text-purple-500',
     bgColor: 'bg-purple-500/10'
   },
   account_purchase: { 
     icon: ShoppingCart, 
     label: 'Mua tài khoản', 
     color: 'text-orange-500',
     bgColor: 'bg-orange-500/10'
   },
   admin_add: { 
     icon: Plus, 
     label: 'Admin cộng xu', 
     color: 'text-purple-500',
     bgColor: 'bg-purple-500/10'
   },
   admin_deduct: { 
     icon: Minus, 
     label: 'Admin trừ xu', 
     color: 'text-red-500',
     bgColor: 'bg-red-500/10'
   },
 };
 
 export default function CoinHistory() {
   const { user, isLoading: authLoading } = useAuth();
   const navigate = useNavigate();
   const [history, setHistory] = useState<CoinHistoryItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [balance, setBalance] = useState(0);
   const [totalEarned, setTotalEarned] = useState(0);
   const [totalSpent, setTotalSpent] = useState(0);
 
   useEffect(() => {
     if (!authLoading && !user) {
       navigate('/auth');
     }
   }, [user, authLoading, navigate]);
 
   useEffect(() => {
     if (user) {
       fetchCoinData();
     }
   }, [user]);
 
   const fetchCoinData = async () => {
     try {
       // Fetch history
       const { data: historyData, error: historyError } = await supabase
         .from('coin_history')
         .select('*')
         .eq('user_id', user?.id)
         .order('created_at', { ascending: false })
         .limit(100);
 
       if (historyError) throw historyError;
       setHistory(historyData || []);
 
       // Calculate totals
       let earned = 0;
       let spent = 0;
       (historyData || []).forEach(item => {
         if (item.amount > 0) {
           earned += item.amount;
         } else {
           spent += Math.abs(item.amount);
         }
       });
       setTotalEarned(earned);
       setTotalSpent(spent);
 
       // Fetch balance
       const { data: balanceData } = await supabase
         .from('user_coins')
         .select('balance')
         .eq('user_id', user?.id)
         .single();
 
       setBalance(balanceData?.balance || 0);
 
     } catch (error) {
       console.error('Error fetching coin data:', error);
     } finally {
       setLoading(false);
     }
   };
 
   if (authLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <Coins className="h-8 w-8 animate-pulse text-primary" />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background">
       <Navbar />
       <PageWrapper>
       <div className="container mx-auto px-4 py-6">
         {/* Header */}
         <div className="flex items-center gap-3 mb-6">
           <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <div className="flex-1">
             <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
               <History className="h-6 w-6 text-primary" />
               Lịch sử xu
             </h1>
             <p className="text-sm text-muted-foreground">Theo dõi mọi giao dịch xu của bạn</p>
           </div>
           <Button onClick={() => navigate('/buy-coins')} className="bg-gradient-to-r from-primary to-accent">
             <Plus className="h-4 w-4 mr-2" />
             Nạp xu
           </Button>
         </div>
 
         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <Card className="glass border-primary/30 overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
             <CardContent className="pt-6 relative">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-muted-foreground">Số dư hiện tại</p>
                   <p className="text-3xl font-bold text-gradient mt-1">{balance}</p>
                 </div>
                 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                   <Coins className="h-7 w-7 text-white" />
                 </div>
               </div>
             </CardContent>
           </Card>
 
           <Card className="glass border-green-500/30 overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
             <CardContent className="pt-6 relative">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-muted-foreground">Tổng nhận được</p>
                   <p className="text-3xl font-bold text-green-500 mt-1">+{totalEarned}</p>
                 </div>
                 <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                   <TrendingUp className="h-7 w-7 text-green-500" />
                 </div>
               </div>
             </CardContent>
           </Card>
 
           <Card className="glass border-orange-500/30 overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
             <CardContent className="pt-6 relative">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-muted-foreground">Tổng đã chi</p>
                   <p className="text-3xl font-bold text-orange-500 mt-1">-{totalSpent}</p>
                 </div>
                 <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                   <TrendingDown className="h-7 w-7 text-orange-500" />
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* History List */}
         <Card className="glass border-border/50">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Sparkles className="h-5 w-5 text-primary" />
               Lịch sử giao dịch
             </CardTitle>
             <CardDescription>
               Tất cả giao dịch xu gần đây
             </CardDescription>
           </CardHeader>
           <CardContent>
             {loading ? (
               <div className="space-y-4">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30">
                     <Skeleton className="w-12 h-12 rounded-xl" />
                     <div className="flex-1">
                       <Skeleton className="h-4 w-32 mb-2" />
                       <Skeleton className="h-3 w-48" />
                     </div>
                     <Skeleton className="h-6 w-16" />
                   </div>
                 ))}
               </div>
             ) : history.length === 0 ? (
               <div className="text-center py-12">
                 <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                   <History className="h-10 w-10 text-muted-foreground" />
                 </div>
                 <p className="text-muted-foreground mb-4">Chưa có lịch sử giao dịch</p>
                <Button onClick={() => navigate('/buy-coins')} variant="outline">
                  Nạp xu ngay
                 </Button>
               </div>
             ) : (
               <div className="space-y-3">
                 {history.map((item, index) => {
                   const config = typeConfig[item.type] || { 
                     icon: Coins, 
                     label: item.type, 
                     color: 'text-muted-foreground',
                     bgColor: 'bg-muted/50'
                   };
                   const Icon = config.icon;
                   const isPositive = item.amount > 0;
 
                   return (
                     <div 
                       key={item.id}
                       className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all duration-300 animate-fade-in"
                       style={{ animationDelay: `${index * 50}ms` }}
                     >
                       <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0`}>
                         <Icon className={`h-6 w-6 ${config.color}`} />
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                           <p className="font-medium truncate">{config.label}</p>
                           {isPositive ? (
                             <ArrowUpRight className="h-4 w-4 text-green-500" />
                           ) : (
                             <ArrowDownRight className="h-4 w-4 text-red-500" />
                           )}
                         </div>
                         <p className="text-sm text-muted-foreground truncate">
                           {item.description || 'Không có mô tả'}
                         </p>
                         <p className="text-xs text-muted-foreground mt-1">
                           {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                         </p>
                       </div>
                       <div className={`text-lg font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                         {isPositive ? '+' : ''}{item.amount}
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
       </PageWrapper>
     </div>
   );
 }