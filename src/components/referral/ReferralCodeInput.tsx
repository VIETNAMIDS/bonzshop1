 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { toast } from 'sonner';
 import { Gift, Loader2, CheckCircle, Sparkles, Copy, Users, Share2 } from 'lucide-react';
 
 export function ReferralCodeInput() {
   const { user } = useAuth();
   const [code, setCode] = useState('');
   const [loading, setLoading] = useState(false);
   const [success, setSuccess] = useState(false);
   const [alreadyReferred, setAlreadyReferred] = useState(false);
   const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
   const [referralCount, setReferralCount] = useState(0);
   const [loadingMyCode, setLoadingMyCode] = useState(true);
 
   // Check if user already has a referral on mount
   useEffect(() => {
     if (user) {
       checkExistingReferral();
       fetchMyReferralCode();
     }
   }, [user]);
 
   const checkExistingReferral = async () => {
     if (!user) return;
     
     const { data } = await supabase
       .from('referrals')
       .select('id')
       .eq('referred_id', user.id)
       .maybeSingle();
     
     if (data) {
       setAlreadyReferred(true);
     }
   };
 
   const fetchMyReferralCode = async () => {
     if (!user) return;
     
     try {
       // Fetch my referral code
       const { data: profile } = await supabase
         .from('profiles')
         .select('referral_code')
         .eq('user_id', user.id)
         .single();
       
       if (profile?.referral_code) {
         setMyReferralCode(profile.referral_code);
       }
       
       // Fetch referral count
       const { count } = await supabase
         .from('referrals')
         .select('id', { count: 'exact', head: true })
         .eq('referrer_id', user.id);
       
       setReferralCount(count || 0);
     } catch (error) {
       console.error('Error fetching referral code:', error);
     } finally {
       setLoadingMyCode(false);
     }
   };
 
   const copyReferralCode = () => {
     if (myReferralCode) {
       navigator.clipboard.writeText(myReferralCode);
       toast.success('Đã sao chép mã giới thiệu!');
     }
   };
 
   const copyReferralLink = () => {
     if (myReferralCode) {
       const link = `${window.location.origin}/auth?ref=${myReferralCode}`;
       navigator.clipboard.writeText(link);
       toast.success('Đã sao chép link giới thiệu!');
     }
   };
 
   const handleSubmit = async () => {
     if (!user || !code.trim()) return;
     
     setLoading(true);
     try {
       const trimmedCode = code.trim().toUpperCase();
       
       // Check if already referred
       const { data: existingReferral } = await supabase
         .from('referrals')
         .select('id')
         .eq('referred_id', user.id)
         .maybeSingle();
       
       if (existingReferral) {
         toast.error('Bạn đã sử dụng mã giới thiệu rồi!');
         setAlreadyReferred(true);
         return;
       }
       
       // Find referrer by code
       const { data: referrerProfile } = await supabase
         .from('profiles')
         .select('user_id, display_name')
         .eq('referral_code', trimmedCode)
         .single();
       
       if (!referrerProfile) {
         toast.error('Mã giới thiệu không hợp lệ!');
         return;
       }
       
       // Don't allow self-referral
       if (referrerProfile.user_id === user.id) {
         toast.error('Bạn không thể tự giới thiệu chính mình!');
         return;
       }
       
        // Create referral record
        const { error: refError } = await supabase
          .from('referrals')
          .insert({
            referrer_id: referrerProfile.user_id,
            referred_id: user.id,
            referral_code: trimmedCode,
            coins_rewarded: 10,
            is_rewarded: true,
            rewarded_at: new Date().toISOString()
          });
       
        if (refError) throw refError;
        
        // Add coins to referrer
        const { data: referrerCoins } = await supabase
          .from('user_coins')
          .select('balance')
          .eq('user_id', referrerProfile.user_id)
          .single();
        
        if (referrerCoins) {
          await supabase
            .from('user_coins')
            .update({ balance: referrerCoins.balance + 5 })
            .eq('user_id', referrerProfile.user_id);
        } else {
          await supabase
            .from('user_coins')
            .insert({ user_id: referrerProfile.user_id, balance: 5 });
        }
        
        // Add coins to referred user (current user)
        const { data: myCoins } = await supabase
          .from('user_coins')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        if (myCoins) {
          await supabase
            .from('user_coins')
            .update({ balance: myCoins.balance + 5 })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_coins')
            .insert({ user_id: user.id, balance: 5 });
        }
        
        // Log coin history for referrer
        await supabase.from('coin_history').insert({
          user_id: referrerProfile.user_id,
          amount: 5,
          type: 'referral_reward',
          description: `Nhận thưởng giới thiệu người dùng mới`,
          reference_id: user.id
        });
        
        // Log coin history for referred user
        await supabase.from('coin_history').insert({
          user_id: user.id,
          amount: 5,
          type: 'referral_reward',
          description: `Nhận thưởng nhập mã giới thiệu từ ${referrerProfile.display_name || 'người dùng'}`,
          reference_id: referrerProfile.user_id
        });
        
        // Create notification for referrer
        await supabase.from('notifications').insert({
          user_id: referrerProfile.user_id,
          title: '🎉 Mời bạn thành công!',
          message: `Bạn đã nhận được 5 xu thưởng vì có người sử dụng mã giới thiệu của bạn!`,
          type: 'referral',
        });
        
        // Create notification for referred user
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '🎁 Nhận thưởng giới thiệu!',
          message: `Bạn đã nhận được 5 xu thưởng khi nhập mã giới thiệu!`,
          type: 'referral',
        });
       
        setSuccess(true);
        setAlreadyReferred(true);
        toast.success('Áp dụng mã thành công! Bạn và người giới thiệu đều nhận 5 xu 🎉');
       
     } catch (error) {
       console.error('Error applying referral code:', error);
       toast.error('Không thể áp dụng mã giới thiệu');
     } finally {
       setLoading(false);
     }
   };
 
   if (alreadyReferred || success) {
     return (
       <Card className="glass border-green-500/30 bg-green-500/5">
         <CardContent className="pt-6">
           <div className="flex items-center gap-3 text-green-500">
             <CheckCircle className="h-5 w-5" />
             <span className="font-medium">Bạn đã sử dụng mã giới thiệu</span>
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <div className="space-y-4">
       {/* My Referral Code */}
       <Card className="glass border-accent/30 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5" />
         <CardHeader className="relative pb-3">
           <div className="flex items-center gap-2">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
               <Share2 className="h-5 w-5 text-white" />
             </div>
             <div className="flex-1">
               <CardTitle className="text-lg flex items-center gap-2">
                 Mời bạn bè
                 <Sparkles className="h-4 w-4 text-accent" />
               </CardTitle>
               <CardDescription>
                  Nhận 5 xu khi có người dùng mã của bạn
               </CardDescription>
             </div>
             {referralCount > 0 && (
               <div className="flex items-center gap-1 text-sm text-accent">
                 <Users className="h-4 w-4" />
                 <span className="font-medium">{referralCount}</span>
               </div>
             )}
           </div>
         </CardHeader>
         <CardContent className="relative">
           {loadingMyCode ? (
             <div className="flex items-center justify-center py-4">
               <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
             </div>
           ) : myReferralCode ? (
             <div className="space-y-3">
               <div className="flex items-center gap-2">
                 <div className="flex-1 px-4 py-3 rounded-lg bg-secondary/50 font-mono text-lg font-bold tracking-wider text-center">
                   {myReferralCode}
                 </div>
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={copyReferralCode}
                   className="shrink-0"
                 >
                   <Copy className="h-4 w-4" />
                 </Button>
               </div>
               <Button
                 variant="outline"
                 className="w-full"
                 onClick={copyReferralLink}
               >
                 <Share2 className="h-4 w-4 mr-2" />
                 Sao chép link giới thiệu
               </Button>
             </div>
           ) : (
             <p className="text-sm text-muted-foreground text-center py-2">
               Chưa có mã giới thiệu
             </p>
           )}
         </CardContent>
       </Card>
 
       {/* Input Referral Code */}
       <Card className="glass border-primary/30 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
         <CardHeader className="relative pb-3">
           <div className="flex items-center gap-2">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
               <Gift className="h-5 w-5 text-white" />
             </div>
             <div>
               <CardTitle className="text-lg flex items-center gap-2">
                 Nhập mã giới thiệu
                 <Sparkles className="h-4 w-4 text-accent" />
               </CardTitle>
               <CardDescription>
                 Cả hai đều nhận 5 xu thưởng
               </CardDescription>
             </div>
           </div>
         </CardHeader>
         <CardContent className="relative">
           <div className="flex gap-2">
             <Input
               value={code}
               onChange={(e) => setCode(e.target.value.toUpperCase())}
               placeholder="Nhập mã (VD: A69FE67C)"
               className="flex-1 uppercase font-mono tracking-wider"
               maxLength={10}
             />
             <Button
               onClick={handleSubmit}
               disabled={loading || !code.trim()}
               className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
             >
               {loading ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                 'Áp dụng'
               )}
             </Button>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }