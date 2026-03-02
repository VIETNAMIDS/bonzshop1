 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Bot, Plus, Pencil, Trash2, Check, X, Loader2, MessageCircle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Switch } from '@/components/ui/switch';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Badge } from '@/components/ui/badge';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
   is_active: boolean;
   sort_order: number | null;
 }
 
 interface RentalRequest {
   id: string;
   user_id: string;
   bot_id: string;
   status: string;
   receipt_url: string | null;
   admin_note: string | null;
   created_at: string;
   bot?: ZaloBot;
 }
 
 export default function AdminBotRentals() {
   const navigate = useNavigate();
   const { user, isAdmin } = useAuth();
   const [bots, setBots] = useState<ZaloBot[]>([]);
   const [requests, setRequests] = useState<RentalRequest[]>([]);
   const [loading, setLoading] = useState(true);
   const [showDialog, setShowDialog] = useState(false);
   const [editingBot, setEditingBot] = useState<ZaloBot | null>(null);
   const [formData, setFormData] = useState({
     name: '',
     description: '',
     price: 0,
     duration: '1 tháng',
     features: '',
     zalo_number: '0785000270',
     icon: 'Bot',
     is_active: true,
     sort_order: 0
   });
 
   useEffect(() => {
     if (!isAdmin) {
       navigate('/');
       return;
     }
     fetchData();
   }, [isAdmin]);
 
   const fetchData = async () => {
     try {
       const [botsRes, requestsRes] = await Promise.all([
         supabase.from('zalo_bot_rentals').select('*').order('sort_order'),
         supabase.from('bot_rental_requests').select('*').order('created_at', { ascending: false })
       ]);
 
       if (botsRes.error) throw botsRes.error;
       if (requestsRes.error) throw requestsRes.error;
 
       setBots(botsRes.data || []);
       
       // Map bot info to requests
       const requestsWithBots = (requestsRes.data || []).map(req => ({
         ...req,
         bot: (botsRes.data || []).find(b => b.id === req.bot_id)
       }));
       setRequests(requestsWithBots);
     } catch (error) {
       console.error('Error fetching data:', error);
       toast.error('Không thể tải dữ liệu');
     } finally {
       setLoading(false);
     }
   };
 
   const handleEdit = (bot: ZaloBot) => {
     setEditingBot(bot);
     setFormData({
       name: bot.name,
       description: bot.description || '',
       price: bot.price,
       duration: bot.duration || '1 tháng',
       features: bot.features?.join('\n') || '',
       zalo_number: bot.zalo_number || '0785000270',
       icon: bot.icon || 'Bot',
       is_active: bot.is_active,
       sort_order: bot.sort_order || 0
     });
     setShowDialog(true);
   };
 
   const handleAdd = () => {
     setEditingBot(null);
     setFormData({
       name: '',
       description: '',
       price: 0,
       duration: '1 tháng',
       features: '',
       zalo_number: '0785000270',
       icon: 'Bot',
       is_active: true,
       sort_order: bots.length
     });
     setShowDialog(true);
   };
 
   const handleSave = async () => {
     try {
       const featuresArray = formData.features.split('\n').filter(f => f.trim());
       
       const botData = {
         name: formData.name,
         description: formData.description,
         price: formData.price,
         duration: formData.duration,
         features: featuresArray,
         zalo_number: formData.zalo_number,
         icon: formData.icon,
         is_active: formData.is_active,
         sort_order: formData.sort_order
       };
 
       if (editingBot) {
         const { error } = await supabase
           .from('zalo_bot_rentals')
           .update(botData)
           .eq('id', editingBot.id);
         if (error) throw error;
         toast.success('Đã cập nhật bot');
       } else {
         const { error } = await supabase
           .from('zalo_bot_rentals')
           .insert(botData);
         if (error) throw error;
         toast.success('Đã thêm bot mới');
       }
 
       setShowDialog(false);
       fetchData();
     } catch (error: any) {
       toast.error('Lỗi: ' + error.message);
     }
   };
 
   const handleDelete = async (id: string) => {
     if (!confirm('Xóa bot này?')) return;
     
     try {
       const { error } = await supabase
         .from('zalo_bot_rentals')
         .delete()
         .eq('id', id);
       if (error) throw error;
       toast.success('Đã xóa bot');
       fetchData();
     } catch (error: any) {
       toast.error('Lỗi: ' + error.message);
     }
   };
 
   const handleRequestStatus = async (id: string, status: string) => {
     try {
       const { error } = await supabase
         .from('bot_rental_requests')
         .update({ status })
         .eq('id', id);
       if (error) throw error;
       toast.success(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu`);
       fetchData();
     } catch (error: any) {
       toast.error('Lỗi: ' + error.message);
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
         <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
             <Bot className="h-8 w-8 text-primary" />
             <h1 className="text-2xl font-bold">Quản lý Bot Zalo</h1>
           </div>
           <Button onClick={handleAdd}>
             <Plus className="h-4 w-4 mr-2" />
             Thêm Bot
           </Button>
         </div>
 
         <Tabs defaultValue="bots">
           <TabsList className="mb-6">
             <TabsTrigger value="bots">Danh sách Bot</TabsTrigger>
             <TabsTrigger value="requests">
               Yêu cầu thuê
               {requests.filter(r => r.status === 'pending').length > 0 && (
                 <Badge variant="destructive" className="ml-2">
                   {requests.filter(r => r.status === 'pending').length}
                 </Badge>
               )}
             </TabsTrigger>
           </TabsList>
 
           <TabsContent value="bots">
             <Card>
               <CardContent className="p-0">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Tên</TableHead>
                       <TableHead>Giá</TableHead>
                       <TableHead>Thời hạn</TableHead>
                       <TableHead>Zalo</TableHead>
                       <TableHead>Trạng thái</TableHead>
                       <TableHead className="text-right">Thao tác</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {bots.map(bot => (
                       <TableRow key={bot.id}>
                         <TableCell className="font-medium">{bot.name}</TableCell>
                         <TableCell>{bot.price.toLocaleString('vi-VN')}đ</TableCell>
                         <TableCell>{bot.duration}</TableCell>
                         <TableCell>{bot.zalo_number}</TableCell>
                         <TableCell>
                           <Badge variant={bot.is_active ? 'default' : 'secondary'}>
                             {bot.is_active ? 'Hoạt động' : 'Ẩn'}
                           </Badge>
                         </TableCell>
                         <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleEdit(bot)}>
                             <Pencil className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDelete(bot.id)}>
                             <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
           </TabsContent>
 
           <TabsContent value="requests">
             <Card>
               <CardContent className="p-0">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Bot</TableHead>
                       <TableHead>Giá</TableHead>
                       <TableHead>Bill</TableHead>
                       <TableHead>Trạng thái</TableHead>
                       <TableHead>Thời gian</TableHead>
                       <TableHead className="text-right">Thao tác</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {requests.map(req => (
                       <TableRow key={req.id}>
                         <TableCell className="font-medium">{req.bot?.name || 'N/A'}</TableCell>
                         <TableCell>{req.bot?.price.toLocaleString('vi-VN')}đ</TableCell>
                         <TableCell>
                           {req.receipt_url && (
                             <a href={req.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                               Xem bill
                             </a>
                           )}
                         </TableCell>
                         <TableCell>
                           <Badge variant={
                             req.status === 'approved' ? 'default' :
                             req.status === 'rejected' ? 'destructive' : 'secondary'
                           }>
                             {req.status === 'approved' ? 'Đã duyệt' :
                              req.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                           </Badge>
                         </TableCell>
                         <TableCell>
                           {new Date(req.created_at).toLocaleString('vi-VN')}
                         </TableCell>
                         <TableCell className="text-right">
                           {req.status === 'pending' && (
                             <>
                               <Button 
                                 variant="ghost" 
                                 size="icon"
                                 onClick={() => handleRequestStatus(req.id, 'approved')}
                               >
                               <Check className="h-4 w-4 text-primary" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon"
                                 onClick={() => handleRequestStatus(req.id, 'rejected')}
                               >
                                 <X className="h-4 w-4 text-destructive" />
                               </Button>
                             </>
                           )}
                         </TableCell>
                       </TableRow>
                     ))}
                     {requests.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                           Chưa có yêu cầu thuê bot nào
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
           </TabsContent>
         </Tabs>
 
         {/* Edit/Add Dialog */}
         <Dialog open={showDialog} onOpenChange={setShowDialog}>
           <DialogContent className="sm:max-w-lg">
             <DialogHeader>
               <DialogTitle>{editingBot ? 'Sửa Bot' : 'Thêm Bot Mới'}</DialogTitle>
             </DialogHeader>
             
             <div className="space-y-4 py-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Tên bot</Label>
                   <Input
                     value={formData.name}
                     onChange={e => setFormData({...formData, name: e.target.value})}
                     placeholder="Bot Zalo Basic"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Giá (VNĐ)</Label>
                   <Input
                     type="number"
                     value={formData.price}
                     onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})}
                   />
                 </div>
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Thời hạn</Label>
                   <Input
                     value={formData.duration}
                     onChange={e => setFormData({...formData, duration: e.target.value})}
                     placeholder="1 tháng"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Số Zalo</Label>
                   <Input
                     value={formData.zalo_number}
                     onChange={e => setFormData({...formData, zalo_number: e.target.value})}
                     placeholder="0785000270"
                   />
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label>Mô tả</Label>
                 <Textarea
                   value={formData.description}
                   onChange={e => setFormData({...formData, description: e.target.value})}
                   placeholder="Mô tả về bot..."
                 />
               </div>
 
               <div className="space-y-2">
                 <Label>Tính năng (mỗi dòng 1 tính năng)</Label>
                 <Textarea
                   value={formData.features}
                   onChange={e => setFormData({...formData, features: e.target.value})}
                   placeholder="Tự động trả lời&#10;Hỗ trợ 24/7"
                   rows={4}
                 />
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Icon</Label>
                   <Input
                     value={formData.icon}
                     onChange={e => setFormData({...formData, icon: e.target.value})}
                     placeholder="Bot, MessageCircle, Zap, Crown"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Thứ tự</Label>
                   <Input
                     type="number"
                     value={formData.sort_order}
                     onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                   />
                 </div>
               </div>
 
               <div className="flex items-center gap-2">
                 <Switch
                   checked={formData.is_active}
                   onCheckedChange={checked => setFormData({...formData, is_active: checked})}
                 />
                 <Label>Hiển thị</Label>
               </div>
 
               <Button className="w-full" onClick={handleSave}>
                 {editingBot ? 'Cập nhật' : 'Thêm Bot'}
               </Button>
             </div>
           </DialogContent>
         </Dialog>
       </main>
     </div>
   );
 }