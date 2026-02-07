 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { MessageCircle, Zap, Crown, Check, ExternalLink, Upload, Loader2, Bot } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { Navbar } from '@/components/Navbar';
 
 interface ZaloBot {
   id: string;
   name: string;
   description: string | null;
   price: number;
   duration: string | null;
   features: string[] | null;
   zalo_number: string | null;
   icon: string | null;
 }
 
 const iconMap: Record<string, React.ReactNode> = {
   MessageCircle: <MessageCircle className="h-8 w-8" />,
   Zap: <Zap className="h-8 w-8" />,
   Crown: <Crown className="h-8 w-8" />,
   Bot: <Bot className="h-8 w-8" />,
 };
 
 export default function ZaloBotRental() {
   const navigate = useNavigate();
   const { user } = useAuth();
   const [bots, setBots] = useState<ZaloBot[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedBot, setSelectedBot] = useState<ZaloBot | null>(null);
   const [showDialog, setShowDialog] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [receiptFile, setReceiptFile] = useState<File | null>(null);
 
   useEffect(() => {
     fetchBots();
   }, []);
 
   const fetchBots = async () => {
     try {
       const { data, error } = await supabase
         .from('zalo_bot_rentals')
         .select('*')
         .eq('is_active', true)
         .order('sort_order');
 
       if (error) throw error;
       setBots(data || []);
     } catch (error) {
       console.error('Error fetching bots:', error);
       toast.error('Không thể tải danh sách bot');
     } finally {
       setLoading(false);
     }
   };
 
   const handleRent = (bot: ZaloBot) => {
     if (!user) {
       toast.error('Vui lòng đăng nhập để thuê bot');
       navigate('/auth');
       return;
     }
     setSelectedBot(bot);
     setShowDialog(true);
   };
 
   const openZalo = () => {
     if (!selectedBot?.zalo_number) return;
     window.open(`https://zalo.me/${selectedBot.zalo_number}`, '_blank');
   };
 
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       if (file.size > 5 * 1024 * 1024) {
         toast.error('File quá lớn (tối đa 5MB)');
         return;
       }
       setReceiptFile(file);
     }
   };
 
   const handleSubmit = async () => {
     if (!user || !selectedBot || !receiptFile) {
       toast.error('Vui lòng chọn ảnh bill thanh toán');
       return;
     }
 
     setUploading(true);
     try {
       // Upload receipt
       const fileExt = receiptFile.name.split('.').pop();
       const fileName = `${user.id}-${Date.now()}.${fileExt}`;
       const { error: uploadError, data: uploadData } = await supabase.storage
         .from('receipts')
         .upload(`bot-rentals/${fileName}`, receiptFile);
 
       if (uploadError) throw uploadError;
 
       const { data: { publicUrl } } = supabase.storage
         .from('receipts')
         .getPublicUrl(`bot-rentals/${fileName}`);
 
       // Create rental request
       const { error: insertError } = await supabase
         .from('bot_rental_requests')
         .insert({
           user_id: user.id,
           bot_id: selectedBot.id,
           receipt_url: publicUrl,
           status: 'pending'
         });
 
       if (insertError) throw insertError;
 
       // Send Telegram notification
       try {
         await supabase.functions.invoke('send-telegram-notification', {
           body: {
             type: 'bot_rental',
             userEmail: user.email,
             botName: selectedBot.name,
             price: selectedBot.price,
             receiptUrl: publicUrl
           }
         });
       } catch (e) {
         console.log('Telegram notification failed');
       }
 
       toast.success('Đã gửi yêu cầu thuê bot! Admin sẽ liên hệ bạn sớm.');
       setShowDialog(false);
       setSelectedBot(null);
       setReceiptFile(null);
     } catch (error: any) {
       console.error('Error submitting rental:', error);
       toast.error('Lỗi khi gửi yêu cầu: ' + error.message);
     } finally {
       setUploading(false);
     }
   };
 
   if (loading) {
     return (
       <div className="min-h-screen bg-background">
         <Navbar />
         <div className="flex items-center justify-center min-h-[60vh]">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background">
       <Navbar />
       
       <main className="container mx-auto px-4 py-8">
         {/* Header */}
         <div className="text-center mb-12">
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
             <Bot className="h-5 w-5" />
             <span className="text-sm font-medium">Dịch vụ Bot Zalo</span>
           </div>
           <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
             Cho Thuê Bot Zalo
           </h1>
           <p className="text-muted-foreground max-w-2xl mx-auto">
             Bot tự động trả lời tin nhắn, quản lý đơn hàng và chăm sóc khách hàng 24/7
           </p>
         </div>
 
         {/* Bot Cards */}
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
           {bots.map((bot, index) => (
             <Card 
               key={bot.id} 
               className={`relative overflow-hidden transition-all hover:shadow-xl ${
                 index === 1 ? 'border-primary ring-2 ring-primary/20' : ''
               }`}
             >
               {index === 1 && (
                 <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                   Phổ biến
                 </div>
               )}
               
               <CardHeader className="text-center pb-2">
                 <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 ${
                   index === 0 ? 'bg-accent/30 text-accent-foreground' :
                   index === 1 ? 'bg-primary/10 text-primary' :
                   'bg-muted text-muted-foreground'
                 }`}>
                   {iconMap[bot.icon || 'Bot'] || <Bot className="h-8 w-8" />}
                 </div>
                 <CardTitle className="text-xl">{bot.name}</CardTitle>
                 <CardDescription>{bot.description}</CardDescription>
               </CardHeader>
 
               <CardContent className="text-center">
                 <div className="mb-6">
                   <span className="text-3xl font-bold text-foreground">
                     {bot.price.toLocaleString('vi-VN')}đ
                   </span>
                   <span className="text-muted-foreground">/{bot.duration}</span>
                 </div>
 
                 <ul className="space-y-3 text-left">
                   {bot.features?.map((feature, i) => (
                     <li key={i} className="flex items-start gap-2">
                       <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                       <span className="text-sm text-muted-foreground">{feature}</span>
                     </li>
                   ))}
                 </ul>
               </CardContent>
 
               <CardFooter>
                 <Button 
                   className="w-full" 
                   variant={index === 1 ? 'default' : 'outline'}
                   onClick={() => handleRent(bot)}
                 >
                   Thuê ngay
                 </Button>
               </CardFooter>
             </Card>
           ))}
         </div>
 
         {bots.length === 0 && (
           <div className="text-center py-12">
             <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
             <p className="text-muted-foreground">Chưa có gói bot nào</p>
           </div>
         )}
       </main>
 
       {/* Rental Dialog */}
       <Dialog open={showDialog} onOpenChange={setShowDialog}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle>Thuê {selectedBot?.name}</DialogTitle>
             <DialogDescription>
               Liên hệ Zalo để thanh toán, sau đó upload ảnh bill
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-6 py-4">
             {/* Price info */}
             <div className="bg-muted/50 rounded-lg p-4 text-center">
               <p className="text-sm text-muted-foreground mb-1">Số tiền cần thanh toán</p>
               <p className="text-2xl font-bold text-primary">
                 {selectedBot?.price.toLocaleString('vi-VN')}đ
               </p>
               <p className="text-xs text-muted-foreground mt-1">/{selectedBot?.duration}</p>
             </div>
 
             {/* Step 1: Contact Zalo */}
             <div className="space-y-2">
               <Label className="flex items-center gap-2">
                 <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                 Liên hệ Zalo để thanh toán
               </Label>
               <Button 
                 variant="outline" 
                 className="w-full justify-between"
                 onClick={openZalo}
               >
                 <span className="flex items-center gap-2">
                   <MessageCircle className="h-4 w-4" />
                   Zalo: {selectedBot?.zalo_number}
                 </span>
                 <ExternalLink className="h-4 w-4" />
               </Button>
             </div>
 
             {/* Step 2: Upload receipt */}
             <div className="space-y-2">
               <Label className="flex items-center gap-2">
                 <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                 Upload ảnh bill thanh toán
               </Label>
               <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                 <Input
                   type="file"
                   accept="image/*"
                   onChange={handleFileChange}
                   className="hidden"
                   id="receipt-upload"
                 />
                 <label htmlFor="receipt-upload" className="cursor-pointer">
                   {receiptFile ? (
                     <div className="space-y-2">
                     <Check className="h-8 w-8 text-primary mx-auto" />
                       <p className="text-sm text-muted-foreground">{receiptFile.name}</p>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                       <p className="text-sm text-muted-foreground">Nhấn để chọn ảnh</p>
                     </div>
                   )}
                 </label>
               </div>
             </div>
 
             {/* Submit */}
             <Button 
               className="w-full" 
               onClick={handleSubmit}
               disabled={!receiptFile || uploading}
             >
               {uploading ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Đang gửi...
                 </>
               ) : (
                 'Gửi yêu cầu thuê bot'
               )}
             </Button>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 }