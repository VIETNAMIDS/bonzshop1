 import { useState, useEffect } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { Loader2, Clock, CheckCircle, ShoppingCart, Gift, Coins } from 'lucide-react';
 import { useTaskProgress } from '@/hooks/useTaskProgress';
 import { toast } from 'sonner';
 
 interface Product {
   id: string;
   title: string;
   description: string | null;
   price: number;
   image_url: string | null;
   category?: string;
   is_free?: boolean;
   sellers?: {
     display_name: string;
   } | null;
 }
 
 interface ProductViewDialogProps {
   product: Product | null;
   open: boolean;
   onClose: () => void;
   onBuy?: (product: Product) => void;
   onClaimFree?: (product: Product) => void;
 }
 
 const VIEW_DURATION = 10; // 10 seconds to complete a view
 
 export function ProductViewDialog({ product, open, onClose, onBuy, onClaimFree }: ProductViewDialogProps) {
   const { trackAction } = useTaskProgress();
   const [secondsViewed, setSecondsViewed] = useState(0);
   const [viewCompleted, setViewCompleted] = useState(false);
   const [isTracking, setIsTracking] = useState(false);
 
   // Reset timer when product changes or dialog opens/closes
   useEffect(() => {
     if (open && product) {
       setSecondsViewed(0);
       setViewCompleted(false);
       setIsTracking(true);
     } else {
       setIsTracking(false);
     }
   }, [open, product?.id]);
 
   // Timer countdown
   useEffect(() => {
     if (!isTracking || viewCompleted) return;
 
     const interval = setInterval(() => {
       setSecondsViewed(prev => {
         const newValue = prev + 1;
         if (newValue >= VIEW_DURATION) {
           // Complete the view
           setViewCompleted(true);
           setIsTracking(false);
           trackAction('view_product');
           toast.success('✅ Đã hoàn thành xem sản phẩm! +1 tiến độ nhiệm vụ');
           return VIEW_DURATION;
         }
         return newValue;
       });
     }, 1000);
 
     return () => clearInterval(interval);
   }, [isTracking, viewCompleted, trackAction]);
 
   const progress = (secondsViewed / VIEW_DURATION) * 100;
   const remainingSeconds = VIEW_DURATION - secondsViewed;
 
   const formatPrice = (price: number) => {
     return new Intl.NumberFormat("vi-VN", {
       style: "currency",
       currency: "VND",
     }).format(price);
   };
 
   const handleClose = () => {
     setIsTracking(false);
     onClose();
   };
 
   if (!product) return null;
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             {product.title}
             {product.is_free && (
               <Badge className="bg-green-600">Miễn phí</Badge>
             )}
           </DialogTitle>
           <DialogDescription>
             {product.sellers?.display_name || 'Bonz Shop'}
           </DialogDescription>
         </DialogHeader>
 
         {/* Product Image */}
         {product.image_url && (
           <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
             <img 
               src={product.image_url} 
               alt={product.title}
               className="w-full h-full object-cover"
             />
           </div>
         )}
 
         {/* Task Progress Timer */}
         <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-lg p-4 space-y-3">
           <div className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-2">
               {viewCompleted ? (
                 <CheckCircle className="h-4 w-4 text-green-500" />
               ) : (
                 <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
               )}
               <span className="font-medium">
                 {viewCompleted ? 'Đã hoàn thành xem!' : `Xem thêm ${remainingSeconds}s để nhận tiến độ`}
               </span>
             </div>
             {!viewCompleted && (
               <span className="text-muted-foreground">{secondsViewed}/{VIEW_DURATION}s</span>
             )}
           </div>
           <Progress value={progress} className="h-2" />
           {viewCompleted && (
             <p className="text-xs text-green-600">
               ✅ +1 tiến độ nhiệm vụ "Xem sản phẩm"
             </p>
           )}
         </div>
 
         {/* Product Info */}
         <div className="space-y-3">
           {product.description && (
             <p className="text-sm text-muted-foreground">{product.description}</p>
           )}
           
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               {product.is_free ? (
                 <span className="text-xl font-bold text-green-600">MIỄN PHÍ</span>
               ) : (
                 <>
                   <span className="text-xl font-bold text-primary">{formatPrice(product.price)}</span>
                   <Badge variant="outline" className="text-orange-600 border-orange-500/50">
                     <Coins className="h-3 w-3 mr-1" />
                     {Math.ceil(product.price / 1000)} xu
                   </Badge>
                 </>
               )}
             </div>
             
             {product.category && (
               <Badge variant="secondary">{product.category}</Badge>
             )}
           </div>
         </div>
 
         {/* Action Buttons */}
         <div className="flex gap-2 pt-2">
           <Button variant="outline" onClick={handleClose} className="flex-1">
             Đóng
           </Button>
           {product.is_free ? (
             <Button 
               variant="gradient" 
               className="flex-1 gap-2"
               onClick={() => onClaimFree?.(product)}
             >
               <Gift className="h-4 w-4" />
               Nhận miễn phí
             </Button>
           ) : (
             <Button 
               variant="gradient" 
               className="flex-1 gap-2"
               onClick={() => onBuy?.(product)}
             >
               <ShoppingCart className="h-4 w-4" />
               Mua ngay
             </Button>
           )}
         </div>
       </DialogContent>
     </Dialog>
   );
 }