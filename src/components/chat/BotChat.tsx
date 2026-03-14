import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Loader2, ShoppingCart, CheckCircle2, XCircle, Sparkles, Trash2, AlertTriangle, UserCog, Image, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import botAvatarImg from '@/assets/bot-avatar.jpeg';
import bankQrImg from '@/assets/bank-qr.jpg';

interface BotMessage {
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
}

interface PurchaseRequest {
  item_id: string;
  item_type: 'product' | 'account';
  item_title: string;
  item_price: number;
}

interface ProfileRequest {
  action: 'change_email' | 'change_password' | 'change_avatar' | 'change_name';
  new_email?: string;
  new_password?: string;
  avatar_url?: string;
  new_name?: string;
}

interface BotChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BotChat({ isOpen, onClose }: BotChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [profileRequest, setProfileRequest] = useState<ProfileRequest | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [processingProfile, setProcessingProfile] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyLoaded = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user && !historyLoaded.current) {
      loadHistory();
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, purchaseRequest, profileRequest]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('bot_chat_messages')
        .select('role, content, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data.map(d => ({ role: d.role as 'user' | 'assistant', content: d.content })));
      } else {
        setMessages([{
          role: 'assistant',
          content: '🤖 Xin chào! Tôi là **BonzBot** - trợ lý mua sắm AI.\n\nTôi có thể giúp bạn:\n- 🔍 Tìm sản phẩm & tài khoản\n- 💰 Xem giá và so sánh\n- 🛒 **Mua hàng trực tiếp** ngay tại đây!\n- 💳 **Nạp xu** - gửi bill thanh toán cho tôi!\n- ⚙️ **Quản lý hồ sơ**: đổi email, mật khẩu, avatar, tên\n\n💳 **QR Ngân hàng nạp xu:**',
          image_url: bankQrImg,
        }]);
      }
      historyLoaded.current = true;
    } catch (err) {
      console.error('Error loading bot history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const clearHistory = async () => {
    try {
      await supabase.from('bot_chat_messages').delete().eq('user_id', user!.id);
      historyLoaded.current = false;
      setMessages([{
        role: 'assistant',
        content: '🗑️ Đã xóa lịch sử chat. Hãy bắt đầu cuộc trò chuyện mới!',
      }]);
      toast({ title: 'Đã xóa lịch sử chat bot' });
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  const getAuthToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Chỉ hỗ trợ file ảnh', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ảnh quá lớn (tối đa 5MB)', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPendingImage(base64);
      setPendingImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !pendingImage) || loading || isBanned) return;

    const userMsg: BotMessage = {
      role: 'user',
      content: input.trim() || (pendingImage ? '📎 Gửi ảnh bill' : ''),
      image_url: pendingImagePreview || undefined,
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const imageToSend = pendingImage;
    setInput('');
    setPendingImage(null);
    setPendingImagePreview(null);
    setLoading(true);
    setPurchaseRequest(null);
    setProfileRequest(null);

    try {
      const token = await getAuthToken();

      // Build messages for API (strip image_url from history, only send current image)
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));

      const body: any = { messages: apiMessages };
      if (imageToSend) {
        body.image_base64 = imageToSend;
        body.action = 'verify_bill';
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-bot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setIsBanned(true);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '⛔ ' + (data.error || 'Tài khoản đã bị khóa.'),
          }]);
          return;
        }
        throw new Error(data.error || 'Bot error');
      }

      if (data.auto_banned) {
        setIsBanned(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⛔ **Tài khoản của bạn đã bị khóa vĩnh viễn** do vi phạm quy định nhiều lần.',
        }]);
        return;
      }

      if (data.warning) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        return;
      }

      if (data.purchase_request) {
        setPurchaseRequest(data.purchase_request);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🛒 **Xác nhận mua hàng:**\n\n📦 **${data.purchase_request.item_title}**\n💰 Giá: **${data.purchase_request.item_price} xu**\n\nBạn có muốn mua không?`,
        }]);
      } else if (data.profile_request) {
        setProfileRequest(data.profile_request);
        const actionLabels: Record<string, string> = {
          change_email: `📧 **Đổi email** thành: **${data.profile_request.new_email}**`,
          change_password: '🔒 **Đổi mật khẩu** thành mật khẩu mới',
          change_avatar: `🖼️ **Đổi avatar** thành ảnh mới`,
          change_name: `✏️ **Đổi tên hiển thị** thành: **${data.profile_request.new_name}**`,
        };
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚙️ **Xác nhận thay đổi hồ sơ:**\n\n${actionLabels[data.profile_request.action] || 'Cập nhật hồ sơ'}\n\nBạn có muốn tiếp tục không?`,
        }]);
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseRequest || purchasing) return;
    setPurchasing(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-bot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ action: 'purchase', action_data: purchaseRequest }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 **Mua hàng thành công!**\n\n📦 ${data.item_title}\n💰 Số dư còn: **${data.new_balance} xu**\n📋 Mã đơn: \`${data.order_id?.slice(0, 8)}...\``,
        }]);
        toast({ title: '🎉 Mua hàng thành công qua Bot!' });
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **Không thể mua:** ${data.error}`,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Lỗi kết nối.' }]);
    } finally {
      setPurchasing(false);
      setPurchaseRequest(null);
    }
  };

  const handleCancelPurchase = () => {
    setPurchaseRequest(null);
    setMessages(prev => [...prev, { role: 'assistant', content: '👌 Đã hủy.' }]);
  };

  const handleConfirmProfile = async () => {
    if (!profileRequest || processingProfile) return;
    setProcessingProfile(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-bot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ profile_action: profileRequest }),
        }
      );
      const data = await response.json();
      if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.profile_updated) toast({ title: '✅ Đã cập nhật hồ sơ!' });
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Lỗi kết nối.' }]);
    } finally {
      setProcessingProfile(false);
      setProfileRequest(null);
    }
  };

  const handleCancelProfile = () => {
    setProfileRequest(null);
    setMessages(prev => [...prev, { role: 'assistant', content: '👌 Đã hủy thay đổi hồ sơ.' }]);
  };

  const formatBotMessage = (content: string) => {
    // First split by markdown images ![alt](url)
    const imgRegex = /(!\[[^\]]*\]\([^)]+\))/g;
    const imgParts = content.split(imgRegex);
    
    return imgParts.flatMap((segment, si) => {
      const imgMatch = segment.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        return <img key={`img-${si}`} src={imgMatch[2]} alt={imgMatch[1]} className="max-w-full max-h-48 rounded-lg my-2 inline-block" />;
      }
      // Then split by bold and code
      const parts = segment.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${si}-${i}`}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={`${si}-${i}`} className="bg-muted px-1 rounded text-xs">{part.slice(1, -1)}</code>;
        }
        return part;
      });
    });
  };

  const renderMessage = (msg: BotMessage, index: number) => {
    const isUser = msg.role === 'user';
    const isWarning = msg.content.includes('⚠️ **CẢNH BÁO**') || msg.content.includes('⛔');

    return (
      <div key={index} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        {isUser ? (
          <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {user?.user_metadata?.display_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        ) : (
          <img src={botAvatarImg} alt="BonzBot" className="shrink-0 h-8 w-8 rounded-full object-cover" />
        )}
        <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
          {msg.image_url && (
            <img src={typeof msg.image_url === 'string' && msg.image_url.startsWith('http') ? msg.image_url : msg.image_url} alt="Ảnh" className="max-w-full max-h-48 rounded-lg mb-1 inline-block" />
          )}
          <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
            isUser
              ? 'bg-gradient-to-r from-primary to-accent text-white rounded-tr-none'
              : isWarning
                ? 'bg-destructive/10 text-foreground border border-destructive/30 rounded-tl-none'
                : 'bg-secondary text-foreground rounded-tl-none'
          }`}>
            {formatBotMessage(msg.content)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/50 bg-gradient-to-r from-cyan-500/10 to-blue-600/10">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={botAvatarImg} alt="BonzBot" className="h-8 w-8 rounded-full object-cover" />
              <div>
                <span className="text-base">BonzBot</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                  <Sparkles className="h-3 w-3 text-cyan-500" />
                  Trợ lý mua sắm AI
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-destructive h-8 px-2" title="Xóa lịch sử">
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: '65vh' }}>
          <div className="p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang tải lịch sử...
              </div>
            ) : (
              messages.map((msg, i) => renderMessage(msg, i))
            )}

            {purchaseRequest && !purchasing && (
              <div className="flex gap-2 justify-center">
                <Button onClick={handleConfirmPurchase} className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                  Xác nhận mua ({purchaseRequest.item_price} xu)
                </Button>
                <Button variant="outline" onClick={handleCancelPurchase} className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Hủy
                </Button>
              </div>
            )}

            {profileRequest && !processingProfile && (
              <div className="flex gap-2 justify-center">
                <Button onClick={handleConfirmProfile} className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
                  <UserCog className="h-4 w-4" />
                  Xác nhận thay đổi
                </Button>
                <Button variant="outline" onClick={handleCancelProfile} className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Hủy
                </Button>
              </div>
            )}

            {processingProfile && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang cập nhật hồ sơ...
              </div>
            )}
            {purchasing && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý giao dịch...
              </div>
            )}
            {loading && (
              <div className="flex gap-3">
                <img src={botAvatarImg} alt="BonzBot" className="h-8 w-8 rounded-full object-cover shrink-0" />
                <div className="bg-secondary rounded-2xl rounded-tl-none px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Đang suy nghĩ...
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50">
          {isBanned ? (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Tài khoản đã bị khóa. Bạn không thể sử dụng bot.
            </div>
          ) : (
            <>
              {/* Image preview */}
              {pendingImagePreview && (
                <div className="mb-2 relative inline-block">
                  <img src={pendingImagePreview} alt="Preview" className="max-h-24 rounded-lg border border-border" />
                  <button
                    onClick={() => { setPendingImage(null); setPendingImagePreview(null); }}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || purchasing}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Nhắn tin hoặc dán ảnh bill..."
                  disabled={loading || purchasing}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={loading || purchasing || (!input.trim() && !pendingImage)}
                  size="icon"
                  className="shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-600 hover:opacity-90"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <ShoppingCart className="h-3 w-3" />
                Mua hàng & nạp xu qua bot • Dán ảnh bill để nạp xu
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
