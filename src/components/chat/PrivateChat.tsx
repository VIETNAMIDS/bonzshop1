import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, X, Loader2, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EmojiPicker } from './EmojiPicker';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface PrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url: string | null;
  is_read: boolean;
  is_recalled: boolean;
  created_at: string;
  sender_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface PrivateChatProps {
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PrivateChat({ receiverId, receiverName, receiverAvatar, isOpen, onClose }: PrivateChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user && receiverId) {
      fetchMessages();
      subscribeToMessages();
      markAsRead();
    }
  }, [isOpen, user, receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const messagesWithProfiles = data?.map(msg => ({
        ...msg,
        sender_profile: profileMap.get(msg.sender_id)
      })) || [];

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error fetching private messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!user) return;

    const channel = supabase
      .channel(`private-${user.id}-${receiverId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'private_messages',
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async () => {
    if (!user) return;

    await supabase
      .from('private_messages')
      .update({ is_read: true })
      .eq('sender_id', receiverId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);
  };

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể gửi tin nhắn',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleRecall = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('private_messages')
        .update({ is_recalled: true })
        .eq('id', messageId)
        .eq('sender_id', user?.id);

      if (error) throw error;

      toast({ title: 'Đã thu hồi tin nhắn' });
    } catch (error) {
      console.error('Error recalling message:', error);
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="glass-strong border-primary/20 w-96 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={receiverAvatar} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {receiverName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{receiverName}</p>
              <p className="text-xs text-muted-foreground font-normal">Tin nhắn riêng</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>Chưa có tin nhắn</p>
              <p className="text-sm">Hãy gửi tin nhắn đầu tiên!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-2", isOwn && "flex-row-reverse")}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={msg.sender_profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/20">
                      {(msg.sender_profile?.display_name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[75%] group", isOwn && "text-right")}>
                    {msg.is_recalled ? (
                      <div className="inline-block px-3 py-1.5 rounded-xl bg-muted/50 text-muted-foreground italic text-sm">
                        Tin nhắn đã thu hồi
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "inline-block px-3 py-1.5 rounded-xl text-sm",
                          isOwn 
                            ? "bg-gradient-to-r from-primary to-accent text-white rounded-tr-none" 
                            : "bg-secondary text-foreground rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                        {isOwn && (
                          <button 
                            onClick={() => handleRecall(msg.id)}
                            className="opacity-0 group-hover:opacity-100 ml-2 text-xs text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <RotateCcw className="h-3 w-3 inline" />
                          </button>
                        )}
                      </>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: vi })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card/50">
          <div className="flex gap-2 items-center">
            <EmojiPicker onSelect={addEmoji} disabled={sending} />
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhập tin nhắn..."
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              size="icon"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
