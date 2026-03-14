import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Gift, Coins } from 'lucide-react';

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

export function ProductViewDialog({ product, open, onClose, onBuy, onClaimFree }: ProductViewDialogProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
                    {product.price.toLocaleString()} xu
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
          <Button variant="outline" onClick={onClose} className="flex-1">
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