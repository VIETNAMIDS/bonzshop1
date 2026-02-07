 import { useState, useEffect, useCallback } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { useTaskProgress } from '@/hooks/useTaskProgress';
 import { Navbar } from '@/components/Navbar';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { toast } from 'sonner';
 import { 
   Coins, CheckCircle, Clock, Users, 
   Copy, Loader2, ArrowLeft, Target, Sparkles, ExternalLink
 } from 'lucide-react';
 import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 
 interface DailyTask {
   id: string;
   title: string;
   description: string;
   coin_reward: number;
   task_type: string;
   icon: string;
   action_url: string | null;
   action_type: string;
   tracked_action: string | null;
   required_count: number;
   is_completed?: boolean;
   current_progress?: number;
   can_claim?: boolean;
 }
 
 interface Referral {
   id: string;
   referred_id: string;
   coins_rewarded: number;
   is_rewarded: boolean;
   created_at: string;
   referred_name?: string;
 }
 
 const MAX_DAILY_TASKS = 20;
 
 export default function DailyTasks() {
   const { user } = useAuth();
   const navigate = useNavigate();
   const { trackAction, getAllProgress } = useTaskProgress();
   const [loading, setLoading] = useState(true);
   const [tasks, setTasks] = useState<DailyTask[]>([]);
   const [completedToday, setCompletedToday] = useState(0);
   const [referralCode, setReferralCode] = useState('');
   const [referrals, setReferrals] = useState<Referral[]>([]);
   const [showReferralDialog, setShowReferralDialog] = useState(false);
   const [userCoins, setUserCoins] = useState(0);
 
   const fetchData = useCallback(async () => {
     if (!user) return;
     setLoading(true);
     
     try {
       const today = new Date().toISOString().split('T')[0];
       
       const [tasksRes, completionsRes, profileRes, referralsRes, coinsRes, progressData] = await Promise.all([
         supabase.from('daily_tasks').select('*').eq('is_active', true).order('sort_order'),
         supabase.from('task_completions').select('task_id').eq('user_id', user.id).eq('completion_date', today),
         supabase.from('profiles').select('referral_code').eq('user_id', user.id).single(),
         supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false }),
         supabase.from('user_coins').select('balance').eq('user_id', user.id).single(),
         getAllProgress()
       ]);
 
       if (tasksRes.data) {
         const completedTaskIds = completionsRes.data?.map(c => c.task_id) || [];
         const progress = progressData || {};
         
         // Count successful referrals
         const referralCount = referralsRes.data?.filter(r => r.is_rewarded).length || 0;
         
         const tasksWithStatus = tasksRes.data.map(task => {
           let currentProgress = 0;
           
           if (task.tracked_action === 'referral') {
             currentProgress = referralCount;
           } else if (task.tracked_action) {
             currentProgress = progress[task.tracked_action] || 0;
           }
           
           const isCompleted = completedTaskIds.includes(task.id);
           const meetsRequirement = currentProgress >= (task.required_count || 1);
           
           return {
             ...task,
             current_progress: currentProgress,
             is_completed: isCompleted,
             can_claim: meetsRequirement && !isCompleted
           };
         });
         
         setTasks(tasksWithStatus);
         setCompletedToday(completedTaskIds.length);
       }
 
       if (profileRes.data?.referral_code) {
         setReferralCode(profileRes.data.referral_code);
       }
 
       if (referralsRes.data) {
         const referralsWithNames = await Promise.all(
           referralsRes.data.map(async (ref) => {
             const { data: profile } = await supabase
               .from('profiles')
               .select('display_name')
               .eq('user_id', ref.referred_id)
               .single();
             return {
               ...ref,
               referred_name: profile?.display_name || 'Người dùng'
             };
           })
         );
         setReferrals(referralsWithNames);
       }
 
       if (coinsRes.data) {
         setUserCoins(coinsRes.data.balance);
       }
     } catch (error) {
       console.error('Error fetching data:', error);
       toast.error('Không thể tải dữ liệu nhiệm vụ');
     } finally {
       setLoading(false);
     }
   }, [user, getAllProgress]);
 
   useEffect(() => {
     if (!user) {
       navigate('/auth');
       return;
     }
     // Track daily login when visiting tasks page
     trackAction('daily_login');
     fetchData();
   }, [user, navigate, trackAction, fetchData]);
 
   const handleClaimReward = async (task: DailyTask) => {
     if (!user || task.is_completed || !task.can_claim || completedToday >= MAX_DAILY_TASKS) return;
 
     try {
       const today = new Date().toISOString().split('T')[0];
       
       const { error: completionError } = await supabase
         .from('task_completions')
         .insert({
           user_id: user.id,
           task_id: task.id,
           coins_earned: task.coin_reward,
           completion_date: today
         });
 
       if (completionError) {
         if (completionError.code === '23505') {
           toast.error('Bạn đã hoàn thành nhiệm vụ này hôm nay rồi!');
         } else {
           throw completionError;
         }
         return;
       }
 
       const { data: currentCoins } = await supabase
         .from('user_coins')
         .select('balance')
         .eq('user_id', user.id)
         .single();
 
       if (currentCoins) {
         await supabase
           .from('user_coins')
           .update({ balance: currentCoins.balance + task.coin_reward })
           .eq('user_id', user.id);
       } else {
         await supabase
           .from('user_coins')
           .insert({ user_id: user.id, balance: task.coin_reward });
       }
 
         // Log coin history
         await supabase.from('coin_history').insert({
           user_id: user.id,
           amount: task.coin_reward,
           type: 'daily_task',
           description: `Hoàn thành nhiệm vụ: ${task.title}`,
           reference_id: task.id
         });
 
       toast.success(`🎉 Hoàn thành nhiệm vụ! +${task.coin_reward} xu`);
       
       setTasks(prev => prev.map(t => 
         t.id === task.id ? { ...t, is_completed: true, can_claim: false } : t
       ));
       setCompletedToday(prev => prev + 1);
       setUserCoins(prev => prev + task.coin_reward);
       
     } catch (error) {
       console.error('Error completing task:', error);
       toast.error('Không thể hoàn thành nhiệm vụ');
     }
   };
 
   const handleTaskAction = async (task: DailyTask) => {
     switch (task.tracked_action) {
       case 'view_product':
        navigate('/accounts');
        toast.info('Nhấp "Xem chi tiết" sản phẩm và chờ 10 giây để hoàn thành');
         break;
       case 'send_chat':
         navigate('/chat');
         break;
       case 'view_post':
         navigate('/posts');
         break;
       case 'view_notification':
         toast.info('Nhấn vào biểu tượng 🔔 chuông ở thanh điều hướng để xem thông báo');
         break;
       case 'complete_profile':
         navigate('/user-profile');
         break;
       case 'join_telegram':
         window.open('https://t.me/bonzshop', '_blank');
         await trackAction('join_telegram');
        toast.success('Đã mở Telegram! Quay lại trang nhiệm vụ để nhận thưởng.');
         setTimeout(() => fetchData(), 1500);
         break;
       case 'referral':
         setShowReferralDialog(true);
         break;
       case 'daily_login':
         // Auto-tracked, just refresh
         await trackAction('daily_login');
         fetchData();
         break;
       default:
         break;
     }
   };
 
   const copyReferralLink = () => {
     const link = `${window.location.origin}/auth?ref=${referralCode}`;
     navigator.clipboard.writeText(link);
     toast.success('Đã sao chép link giới thiệu!');
   };
 
   if (loading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   const progressPercent = (completedToday / MAX_DAILY_TASKS) * 100;
 
   return (
     <div className="min-h-screen bg-background">
       <Navbar />
       
       <div className="container mx-auto px-4 py-6">
         {/* Header */}
         <div className="flex items-center gap-3 mb-6">
           <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <div className="flex-1">
             <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
               <Target className="h-6 w-6 text-primary" />
               Nhiệm vụ hàng ngày
             </h1>
             <p className="text-sm text-muted-foreground">Hoàn thành nhiệm vụ để nhận xu thưởng</p>
           </div>
           <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 px-3 py-2 rounded-lg">
             <Coins className="h-5 w-5 text-orange-500" />
             <span className="font-bold text-orange-600">{userCoins} xu</span>
           </div>
         </div>
 
         {/* Progress Card */}
         <Card className="glass border-border/50 mb-6">
           <CardContent className="pt-6">
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                 <Sparkles className="h-5 w-5 text-primary" />
                 <span className="font-medium">Tiến độ hôm nay</span>
               </div>
               <Badge variant="secondary">
                 {completedToday}/{MAX_DAILY_TASKS} nhiệm vụ
               </Badge>
             </div>
             <Progress value={progressPercent} className="h-3" />
             {completedToday >= MAX_DAILY_TASKS && (
               <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                 <CheckCircle className="h-4 w-4" />
                 Bạn đã hoàn thành giới hạn nhiệm vụ hôm nay!
               </p>
             )}
           </CardContent>
         </Card>
 
         {/* Referral Stats */}
         <Card className="glass border-border/50 mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
           <CardHeader className="pb-3">
             <CardTitle className="flex items-center gap-2 text-lg">
               <Users className="h-5 w-5 text-purple-500" />
               Mời bạn bè
             </CardTitle>
             <CardDescription>
               Mời bạn bè đăng ký qua link và nhận 5 xu cho mỗi người
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex flex-col sm:flex-row gap-3 mb-4">
               <div className="flex-1 bg-background/50 rounded-lg p-3">
                 <p className="text-xs text-muted-foreground mb-1">Link giới thiệu:</p>
                 <code className="text-xs bg-secondary px-2 py-1 rounded block truncate">
                   {`${window.location.origin}/auth?ref=${referralCode}`}
                 </code>
               </div>
               <Button variant="gradient" size="sm" onClick={copyReferralLink} className="shrink-0">
                 <Copy className="h-4 w-4 mr-1" />
                 Sao chép link
               </Button>
             </div>
             
             {referrals.length > 0 && (
               <div className="border-t border-border/50 pt-3">
                 <p className="text-sm font-medium mb-2">Người đã mời ({referrals.length})</p>
                 <div className="space-y-2 max-h-40 overflow-y-auto">
                   {referrals.map((ref) => (
                     <div key={ref.id} className="flex items-center justify-between bg-background/50 rounded-lg p-2 text-sm">
                       <span>{ref.referred_name}</span>
                       <Badge variant={ref.is_rewarded ? "default" : "secondary"}>
                         {ref.is_rewarded ? `+${ref.coins_rewarded} xu` : 'Đang xử lý'}
                       </Badge>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* Task List */}
         <div className="grid gap-3">
           {tasks.map((task) => (
             <Card 
               key={task.id} 
               className={`glass border-border/50 transition-all ${
                 task.is_completed ? 'opacity-60' : 'hover:border-primary/50'
               }`}
             >
               <CardContent className="py-4">
                 <div className="flex items-center gap-4">
                   <div className="text-3xl">{task.icon}</div>
                   <div className="flex-1 min-w-0">
                     <h3 className="font-medium">{task.title}</h3>
                     <p className="text-sm text-muted-foreground">{task.description}</p>
                     {task.tracked_action && task.tracked_action !== 'referral' && !task.is_completed && (
                       <div className="mt-2">
                         <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              Tiến độ: {task.current_progress || 0}/{task.required_count}
                              {task.tracked_action === 'view_product' && ' (xem 10s/sản phẩm)'}
                            </span>
                         </div>
                         <Progress 
                           value={Math.min(((task.current_progress || 0) / task.required_count) * 100, 100)} 
                           className="h-1.5 mt-1" 
                         />
                       </div>
                     )}
                   </div>
                   <div className="flex items-center gap-2 shrink-0">
                     <Badge variant="outline" className="text-orange-600 border-orange-500/50 hidden sm:flex">
                       <Coins className="h-3 w-3 mr-1" />
                       +{task.coin_reward} xu
                     </Badge>
                     {task.is_completed ? (
                       <Button variant="outline" size="sm" disabled>
                         <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                         <span className="hidden sm:inline">Đã nhận</span>
                       </Button>
                     ) : completedToday >= MAX_DAILY_TASKS ? (
                       <Button variant="outline" size="sm" disabled>
                         <Clock className="h-4 w-4 mr-1" />
                         <span className="hidden sm:inline">Hết lượt</span>
                       </Button>
                     ) : task.can_claim ? (
                       <Button 
                         variant="gradient" 
                         size="sm"
                         onClick={() => handleClaimReward(task)}
                       >
                         <Coins className="h-4 w-4 mr-1" />
                         Nhận xu
                       </Button>
                     ) : (
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={() => handleTaskAction(task)}
                       >
                         <ExternalLink className="h-4 w-4 mr-1" />
                         <span className="hidden sm:inline">Làm nhiệm vụ</span>
                       </Button>
                     )}
                   </div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       </div>
 
       {/* Referral Dialog */}
       <Dialog open={showReferralDialog} onOpenChange={setShowReferralDialog}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Users className="h-5 w-5 text-primary" />
               Mời bạn bè
             </DialogTitle>
             <DialogDescription>
               Chia sẻ link để nhận 5 xu khi bạn bè đăng ký tài khoản
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <label className="text-sm font-medium">Link giới thiệu của bạn</label>
               <div className="flex gap-2">
                 <Input 
                   value={`${window.location.origin}/auth?ref=${referralCode}`}
                   readOnly
                   className="text-xs"
                 />
                 <Button variant="outline" onClick={copyReferralLink}>
                   <Copy className="h-4 w-4" />
                 </Button>
               </div>
             </div>
             
             <Button className="w-full" variant="gradient" onClick={copyReferralLink}>
               <Copy className="h-4 w-4 mr-2" />
               Sao chép link giới thiệu
             </Button>
             
             <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground">
               <p className="font-medium text-foreground mb-1">Cách nhận thưởng:</p>
               <ul className="list-disc list-inside space-y-1">
                 <li>Sao chép và gửi link cho bạn bè</li>
                 <li>Bạn bè nhấp vào link và đăng ký tài khoản</li>
                 <li>Bạn tự động nhận được 5 xu!</li>
               </ul>
             </div>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 }