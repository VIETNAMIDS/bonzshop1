import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, MessageCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  is_recalled: boolean;
  image_url: string | null;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function ChildChat() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { website, primaryColor, secondaryColor } = useChildWebsite();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('child-chat-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMsg]);
        fetchUserProfile(newMsg.user_id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      setMessages(data || []);
      
      // Fetch profiles for all users
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      for (const userId of userIds) {
        await fetchUserProfile(userId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    if (profiles[userId]) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setProfiles(prev => ({ ...prev, [userId]: data }));
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          content: newMessage.trim(),
          user_id: user.id
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div 
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-4"
            style={{ 
              background: `linear-gradient(to right, ${primaryColor}10, ${secondaryColor}10)`,
              borderColor: primaryColor + '30'
            }}
          >
            <MessageCircle className="h-4 w-4" style={{ color: primaryColor }} />
            <span className="text-sm font-medium" style={{ color: primaryColor }}>Chat cộng đồng</span>
          </div>
          <h1 className="text-2xl font-bold">
            Chat <span style={{ color: primaryColor }}>{website?.name}</span>
          </h1>
        </div>

        {/* Chat Box */}
        <Card 
          className="overflow-hidden"
          style={{ borderColor: primaryColor + '30' }}
        >
          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const profile = profiles[msg.user_id];
                const isOwn = msg.user_id === user.id;
                
                return (
                  <div 
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {profile?.display_name || 'Người dùng'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), 'HH:mm', { locale: vi })}
                        </span>
                      </div>
                      
                      <div 
                        className={`inline-block px-4 py-2 rounded-2xl ${
                          isOwn ? 'text-white' : 'bg-secondary'
                        }`}
                        style={isOwn ? { background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` } : {}}
                      >
                        {msg.is_recalled ? (
                          <span className="italic text-muted-foreground">Tin nhắn đã thu hồi</span>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div 
            className="p-4 border-t"
            style={{ borderColor: primaryColor + '20' }}
          >
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Nhập tin nhắn..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="submit"
                disabled={sending || !newMessage.trim()}
                style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
