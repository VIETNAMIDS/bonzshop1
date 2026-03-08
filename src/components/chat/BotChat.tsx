import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Loader2, ShoppingCart, CheckCircle2, XCircle, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BotMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PurchaseRequest {
  item_id: string;
  item_type: 'product' | 'account';
  item_title: string;
  item_price: number;
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
  const [purchasing, setPurchasing] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyLoaded = useRef(false);

  // Load chat history when opening
  useEffect(() => {
    if (isOpen && user && !historyLoaded.current) {
      loadHistory();
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, purchaseRequest]);

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
        // Welcome message
        setMessages([{
          role: 'assistant',
          content: '🤖 Xin chào! Tôi là **BonzBot** - trợ lý mua sắm AI.\n\nTôi có thể giúp bạn:\n- 🔍 Tìm sản phẩm & tài khoản\n- 💰 Xem giá và so sánh\n- 🛒 **Mua hàng trực tiếp** ngay tại đây!\n\nHãy cho tôi biết bạn cần gì nhé!',
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

  const sendMessage = async () => {
    if (!input.trim() || loading || isBanned) return;

    const userMsg: BotMessage = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setPurchaseRequest(null);

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
          body: JSON.stringify({ messages: updatedMessages }),
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

      // Check auto-ban
      if (data.auto_banned) {
        setIsBanned(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⛔ **Tài khoản của bạn đã bị khóa vĩnh viễn** do vi phạm quy định nhiều lần.\n\nThông báo đã được gửi lên chat cộng đồng.',
        }]);
        toast({
          title: '⛔ Tài khoản bị khóa',
          description: 'Vi phạm quy định sử dụng bot',
          variant: 'destructive',
        });
        return;
      }

      // Check warning
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
          body: JSON.stringify({
            action: 'purchase',
            action_data: purchaseRequest,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 **Mua hàng thành công!**\n\n📦 ${data.item_title}\n💰 Số dư còn: **${data.new_balance} xu**\n📋 Mã đơn: \`${data.order_id?.slice(0, 8)}...\`\n\nVào **"Đơn hàng của tôi"** để xem chi tiết nhé!`,
        }]);
        toast({ title: '🎉 Mua hàng thành công qua Bot!' });
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **Không thể mua:** ${data.error}\n\nBạn có muốn thử sản phẩm khác không?`,
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Lỗi kết nối. Vui lòng thử lại!',
      }]);
    } finally {
      setPurchasing(false);
      setPurchaseRequest(null);
    }
  };

  const handleCancelPurchase = () => {
    setPurchaseRequest(null);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '👌 Đã hủy. Bạn có muốn tìm sản phẩm khác không?',
    }]);
  };

  const formatBotMessage = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-muted px-1 rounded text-xs">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderMessage = (msg: BotMessage, index: number) => {
    const isUser = msg.role === 'user';
    const isWarning = msg.content.includes('⚠️ **CẢNH BÁO**') || msg.content.includes('⛔');

    return (
      <div key={index} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-gradient-to-br from-primary to-accent'
            : isWarning
              ? 'bg-gradient-to-br from-destructive to-red-600'
              : 'bg-gradient-to-br from-cyan-500 to-blue-600'
        }`}>
          {isUser ? (
            <span className="text-xs text-white font-bold">
              {user?.user_metadata?.display_name?.[0]?.toUpperCase() || 'U'}
            </span>
          ) : isWarning ? (
            <AlertTriangle className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>
        <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
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
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border/50 bg-gradient-to-r from-cyan-500/10 to-blue-600/10">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-base">BonzBot</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                  <Sparkles className="h-3 w-3 text-cyan-500" />
                  Trợ lý mua sắm AI
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-muted-foreground hover:text-destructive h-8 px-2"
              title="Xóa lịch sử"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
          <div className="p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang tải lịch sử...
              </div>
            ) : (
              messages.map((msg, i) => renderMessage(msg, i))
            )}

            {/* Purchase confirmation buttons */}
            {purchaseRequest && !purchasing && (
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleConfirmPurchase}
                  className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-green-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Xác nhận mua ({purchaseRequest.item_price} xu)
                </Button>
                <Button variant="outline" onClick={handleCancelPurchase} className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Hủy
                </Button>
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
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
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

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          {isBanned ? (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Tài khoản đã bị khóa. Bạn không thể sử dụng bot.
            </div>
          ) : (
            <>
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi bot hoặc tìm sản phẩm..."
                  disabled={loading || purchasing}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={loading || purchasing || !input.trim()}
                  size="icon"
                  className="shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-600 hover:opacity-90"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <ShoppingCart className="h-3 w-3" />
                Mua hàng trực tiếp qua bot • Lịch sử được lưu tự động
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
