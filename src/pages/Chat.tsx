import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
 import { useTaskProgress } from '@/hooks/useTaskProgress';
import { Navbar } from '@/components/Navbar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send, Image as ImageIcon, AlertTriangle, Loader2, X, Ban, Shield } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { FriendsList } from '@/components/chat/FriendsList';
import { PrivateChat } from '@/components/chat/PrivateChat';

interface ChatMessageData {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  is_deleted: boolean;
  is_recalled?: boolean;
  gradient_color?: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    user_id?: string;
  };
}

export default function Chat() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
   const { trackAction } = useTaskProgress();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [adminId, setAdminId] = useState<string | null>(null);
  
  // Private chat state
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [privateChatReceiver, setPrivateChatReceiver] = useState<{
    id: string;
    name: string;
    avatar?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkBanStatus();
      fetchMessages();
      fetchAdminId();
      const unsubscribe = subscribeToMessages();
      return unsubscribe;
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkBanStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('banned_users')
      .select('id')
      .eq('user_id', user.id)
      .single();
    setIsBanned(!!data);
  };

  const fetchAdminId = async () => {
    // Hardcode admin user id since RLS may block query
    // Admin email: adminvip@gmail.com
    const ADMIN_USER_ID = 'cb36ab29-ee7d-4031-81ff-e6e02c936d53';
    setAdminId(ADMIN_USER_ID);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch profiles for users
      const userIds = [...new Set(data?.map(m => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, { ...p }]));

      const messagesWithProfiles = data?.map(msg => ({
        ...msg,
        profile: profileMap.get(msg.user_id) || null
      })) || [];

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessageData;
            
            // Fetch profile for new message
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, display_name, avatar_url')
              .eq('user_id', newMsg.user_id)
              .single();

            setMessages(prev => [...prev, { ...newMsg, profile: profile || undefined }]);
            
            // Mark as new for animation
            setNewMessageIds(prev => new Set(prev).add(newMsg.id));
            setTimeout(() => {
              setNewMessageIds(prev => {
                const next = new Set(prev);
                next.delete(newMsg.id);
                return next;
              });
            }, 1000);
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as ChatMessageData;
            setMessages(prev => prev.map(m => 
              m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!user || isBanned) return;
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage && !selectedImage) return;

    setSending(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `chat-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
        setUploadingImage(false);
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          content: trimmedMessage || '📷 Ảnh',
          image_url: imageUrl
        });

      if (error) throw error;

      setNewMessage('');
      setSelectedImage(null);
      setPreviewUrl(null);
       
       // Track sending chat message for task
       trackAction('send_chat');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể gửi tin nhắn',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  const handleRecallMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_recalled: true })
        .eq('id', messageId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast({ title: 'Đã thu hồi tin nhắn' });
    } catch (error) {
      console.error('Error recalling message:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thu hồi tin nhắn',
        variant: 'destructive'
      });
    }
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user || friendId === user.id) return;

    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .single();

      if (existing) {
        toast({
          title: existing.status === 'pending' ? 'Đã gửi lời mời trước đó' : 'Đã là bạn bè',
        });
        return;
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;

      toast({ title: '✅ Đã gửi lời mời kết bạn!' });
    } catch (error) {
      console.error('Error adding friend:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể gửi lời mời kết bạn',
        variant: 'destructive'
      });
    }
  };

  const handleOpenPrivateChat = async (userId: string) => {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', userId)
      .single();

    setPrivateChatReceiver({
      id: userId,
      name: profile?.display_name || 'Người dùng',
      avatar: profile?.avatar_url || undefined
    });
    setPrivateChatOpen(true);
  };

  const handleContactAdmin = async () => {
    if (!adminId) {
      toast({
        title: 'Không tìm thấy admin',
        variant: 'destructive'
      });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', adminId)
      .single();

    setPrivateChatReceiver({
      id: adminId,
      name: profile?.display_name || 'Admin',
      avatar: profile?.avatar_url || undefined
    });
    setPrivateChatOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Ảnh quá lớn',
          description: 'Kích thước tối đa là 5MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageWrapper>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="glass-strong border-primary/20 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  💬 Chat Cộng Đồng
                  <span className="text-xs font-normal text-muted-foreground">
                    • {messages.length} tin nhắn
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Chat với mọi người, kết bạn và chia sẻ
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleContactAdmin}
                  className="gap-1"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Chat Admin</span>
                </Button>
                <FriendsList onSelectFriend={handleOpenPrivateChat} />
              </div>
            </div>
          </div>

          {/* Ban Notice */}
          {isBanned && (
            <div className="p-4 bg-destructive/10 border-b border-destructive/20 flex items-center gap-3">
              <Ban className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Bạn đã bị cấm chat</p>
                <p className="text-sm text-muted-foreground">
                  Liên hệ admin để được hỗ trợ.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="text-6xl mb-4">💬</div>
                <p>Chưa có tin nhắn nào</p>
                <p className="text-sm">Hãy là người đầu tiên chat!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  id={msg.id}
                  content={msg.content}
                  imageUrl={msg.image_url}
                  isOwn={msg.user_id === user?.id}
                  isRecalled={msg.is_recalled}
                  profile={msg.profile}
                  createdAt={msg.created_at}
                  userId={msg.user_id}
                  currentUserId={user?.id}
                  onRecall={handleRecallMessage}
                  onAddFriend={handleAddFriend}
                  onSendPrivateMessage={handleOpenPrivateChat}
                  showAnimation={newMessageIds.has(msg.id)}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {!isBanned && (
            <div className="p-4 border-t border-border/50 bg-card/50">
              {/* Image Preview */}
              {previewUrl && (
                <div className="mb-3 relative inline-block">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="h-20 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="shrink-0"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <EmojiPicker onSelect={addEmoji} disabled={sending} />
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tin nhắn... (hỗ trợ link)"
                  disabled={sending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || (!newMessage.trim() && !selectedImage)}
                  className="shrink-0 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Nhấn vào avatar để kết bạn hoặc nhắn riêng
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Private Chat Modal */}
      {privateChatReceiver && (
        <PrivateChat
          receiverId={privateChatReceiver.id}
          receiverName={privateChatReceiver.name}
          receiverAvatar={privateChatReceiver.avatar}
          isOpen={privateChatOpen}
          onClose={() => {
            setPrivateChatOpen(false);
            setPrivateChatReceiver(null);
          }}
        />
      )}
      </PageWrapper>
    </div>
  );
}
