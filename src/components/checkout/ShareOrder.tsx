import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Share2, Copy, Check, MessageCircle, 
  Facebook, Send, Link2, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ShareOrderProps {
  itemTitle: string;
  itemPrice: number;
  itemImage?: string | null;
  productId?: string;
  accountId?: string;
}

const SITE_URL = 'https://bonzshop1.lovable.app';

export function ShareOrder({ itemTitle, itemPrice, itemImage, productId, accountId }: ShareOrderProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Create proper share URL
  const itemType = productId ? 'product' : 'account';
  const itemId = productId || accountId;
  const shareUrl = `${SITE_URL}/checkout?${itemType}=${itemId}`;
  const shareText = `🛒 Xem sản phẩm "${itemTitle}" với giá ${itemPrice.toLocaleString()} xu tại BonzShop!`;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: '✅ Đã sao chép!',
        description: 'Link đã được sao chép vào clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast({
        title: '✅ Đã sao chép!',
        description: 'Link đã được sao chép vào clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (platform: string) => {
    let url = '';
    
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'messenger':
        url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&redirect_uri=${encodeURIComponent(SITE_URL)}`;
        break;
      case 'zalo':
        url = `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=500,scrollbars=yes');
    }
    
    toast({
      title: '🔗 Đang mở...',
      description: `Đang chia sẻ qua ${platform}`,
    });
  };

  const handleOpenLink = () => {
    window.open(shareUrl, '_blank');
  };
  
  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2] hover:bg-[#166FE5]',
      platform: 'facebook',
    },
    {
      name: 'Messenger',
      icon: MessageCircle,
      color: 'bg-gradient-to-r from-[#00B2FF] to-[#006AFF] hover:from-[#0099E5] hover:to-[#0059D6]',
      platform: 'messenger',
    },
    {
      name: 'Zalo',
      icon: Send,
      color: 'bg-[#0068FF] hover:bg-[#0054CC]',
      platform: 'zalo',
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-[#0088CC] hover:bg-[#006699]',
      platform: 'telegram',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hover:bg-primary/10">
          <Share2 className="h-4 w-4" />
          Chia sẻ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Chia sẻ sản phẩm
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Preview Card */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {itemImage ? (
                  <img src={itemImage} alt={itemTitle} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium line-clamp-2 text-sm">{itemTitle}</h4>
                <p className="text-primary font-bold mt-1">{itemPrice.toLocaleString()} xu</p>
                <p className="text-xs text-muted-foreground mt-1">bonzshop1.lovable.app</p>
              </div>
            </div>
          </div>
          
          {/* Share buttons */}
          <div className="grid grid-cols-4 gap-2">
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={() => handleShare(option.platform)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl text-white transition-all hover:scale-105 active:scale-95",
                  option.color
                )}
              >
                <option.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{option.name}</span>
              </button>
            ))}
          </div>
          
          {/* Copy link section */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Hoặc sao chép link:</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={shareUrl}
                  readOnly
                  className="pl-10 pr-4 text-xs bg-muted font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
              <Button
                onClick={handleCopy}
                variant={copied ? "default" : "outline"}
                className={cn(
                  "shrink-0 gap-2 transition-all min-w-[100px]",
                  copied && "bg-success hover:bg-success/90"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Đã chép
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Sao chép
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Open link button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleOpenLink}
          >
            <ExternalLink className="h-4 w-4" />
            Mở link trong tab mới
          </Button>
          
          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            Khi bạn bè click vào link, họ sẽ được dẫn đến trang sản phẩm trên BonzShop
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
