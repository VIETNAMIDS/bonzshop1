import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { RotateCcw, UserPlus, MessageCircle, ExternalLink, Trash2, VolumeX, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Rich gradient colors with more variety
const MESSAGE_GRADIENTS = [
  'from-purple-500 via-pink-500 to-red-500',
  'from-blue-500 via-cyan-500 to-teal-500',
  'from-green-500 via-emerald-500 to-cyan-500',
  'from-orange-500 via-yellow-500 to-lime-500',
  'from-red-500 via-pink-500 to-purple-500',
  'from-indigo-500 via-purple-500 to-pink-500',
  'from-teal-500 via-green-500 to-lime-500',
  'from-rose-500 via-orange-500 to-amber-500',
  'from-violet-500 via-fuchsia-500 to-pink-500',
  'from-amber-500 via-orange-500 to-red-500',
  'from-cyan-500 via-blue-500 to-indigo-500',
  'from-lime-500 via-green-500 to-emerald-500',
  'from-fuchsia-500 via-purple-500 to-indigo-500',
  'from-sky-500 via-blue-500 to-violet-500',
  'from-yellow-500 via-amber-500 to-orange-500',
];

// Celebration emojis for new messages
const CELEBRATION_EMOJIS = ['🎉', '✨', '💫', '⭐', '🌟', '💖', '🔥', '🎊', '💎', '🚀', '💥', '🎯'];

// Generate consistent gradient based on message id
const getGradient = (id: string) => {
  const hash = id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return MESSAGE_GRADIENTS[Math.abs(hash) % MESSAGE_GRADIENTS.length];
};

// Get random celebration emoji
const getRandomEmoji = () => {
  return CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
};

// Parse links in message content
const parseLinks = (content: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {part.length > 40 ? part.slice(0, 40) + '...' : part}
        </a>
      );
    }
    return part;
  });
};

interface ChatMessageProps {
  id: string;
  content: string;
  imageUrl?: string | null;
  isOwn: boolean;
  isRecalled?: boolean;
  gradientColor?: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    user_id?: string;
  };
  createdAt: string;
  userId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  isMuted?: boolean;
  onRecall?: (id: string) => void;
  onAddFriend?: (userId: string) => void;
  onSendPrivateMessage?: (userId: string) => void;
  onAdminDelete?: (id: string) => void;
  onAdminMute?: (userId: string) => void;
  onAdminUnmute?: (userId: string) => void;
  showAnimation?: boolean;
}

export function ChatMessage({
  id,
  content,
  imageUrl,
  isOwn,
  isRecalled,
  gradientColor,
  profile,
  createdAt,
  userId,
  currentUserId,
  isAdmin = false,
  isMuted = false,
  onRecall,
  onAddFriend,
  onSendPrivateMessage,
  onAdminDelete,
  onAdminMute,
  onAdminUnmute,
  showAnimation = false,
}: ChatMessageProps) {
  const isSystemBan = gradientColor === 'system-ban';
  const [showActions, setShowActions] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const gradient = getGradient(id);

  // Generate sparkles on new message
  useEffect(() => {
    if (showAnimation) {
      const newSparkles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        emoji: getRandomEmoji(),
      }));
      setSparkles(newSparkles);
      
      const timeout = setTimeout(() => setSparkles([]), 1500);
      return () => clearTimeout(timeout);
    }
  }, [showAnimation]);

  // System ban message - full width alert
  if (isSystemBan) {
    // Parse bold text
    const parseBold = (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    return (
      <div className="w-full my-3 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="rounded-xl border-2 border-destructive/50 bg-destructive/10 p-4 shadow-lg shadow-destructive/10">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive flex items-center justify-center shrink-0">
              <span className="text-white text-lg">⛔</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-destructive uppercase tracking-wider">
                  🛡️ Hệ thống bảo vệ cộng đồng
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(createdAt), 'HH:mm dd/MM', { locale: vi })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">
                {parseBold(content)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRecalled) {
    return (
      <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {(profile?.display_name || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={cn("max-w-[70%]", isOwn && "text-right")}>
          <div className="inline-block px-4 py-2 rounded-2xl bg-muted/50 text-muted-foreground italic text-sm">
            Tin nhắn đã được thu hồi
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex gap-3 group relative",
        isOwn && "flex-row-reverse",
        showAnimation && "animate-message-in"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Floating celebration emojis */}
      {showAnimation && sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="absolute animate-float-up text-lg pointer-events-none z-10"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDelay: `${sparkle.id * 100}ms`,
          }}
        >
          {sparkle.emoji}
        </span>
      ))}

      <Avatar className={cn(
        "h-8 w-8 shrink-0 ring-2 ring-primary/20 transition-transform",
        showAnimation && "animate-bounce-in"
      )}>
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className={cn("bg-gradient-to-br text-white text-xs", gradient)}>
          {(profile?.display_name || 'U')[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn("max-w-[70%]", isOwn && "text-right")}>
        <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse")}>
          <span className={cn("text-xs font-medium", isOwn ? "text-primary" : "text-accent")}>
            {profile?.display_name || 'Người dùng'}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(createdAt), 'HH:mm', { locale: vi })}
          </span>
        </div>
        
        <div className={cn("relative inline-block")}>
          <div 
            className={cn(
              "inline-block px-4 py-2 rounded-2xl text-white shadow-lg transition-all duration-300",
              "bg-gradient-to-r hover:shadow-xl hover:scale-[1.02]",
              gradient,
              isOwn ? "rounded-tr-none" : "rounded-tl-none",
              showAnimation && "animate-bounce-in"
            )}
          >
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt="Chat image"
                className="max-w-full rounded-lg mb-2 max-h-60 object-cover"
              />
            )}
            <p className="text-sm whitespace-pre-wrap break-words">
              {parseLinks(content)}
            </p>
          </div>
          
          {/* Enhanced sparkle effects on new messages */}
          {showAnimation && (
            <>
              <span className="absolute -top-2 -right-2 animate-sparkle text-lg">✨</span>
              <span className="absolute -top-1 left-1/4 animate-sparkle text-sm" style={{ animationDelay: '100ms' }}>⭐</span>
              <span className="absolute -bottom-2 -left-2 animate-sparkle text-lg" style={{ animationDelay: '200ms' }}>💫</span>
              <span className="absolute -bottom-1 right-1/4 animate-sparkle text-sm" style={{ animationDelay: '300ms' }}>🌟</span>
              <span className="absolute top-1/2 -right-3 animate-sparkle text-md" style={{ animationDelay: '150ms' }}>🔥</span>
              <span className="absolute top-1/2 -left-3 animate-sparkle text-md" style={{ animationDelay: '250ms' }}>💥</span>
            </>
          )}
        </div>
        
        {/* Action buttons */}
        {showActions && !isOwn && userId !== currentUserId && (
          <div className={cn(
            "flex gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            {onAddFriend && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs px-2 opacity-70 hover:opacity-100"
                onClick={() => onAddFriend(userId)}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Kết bạn
              </Button>
            )}
            {onSendPrivateMessage && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs px-2 opacity-70 hover:opacity-100"
                onClick={() => onSendPrivateMessage(userId)}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Nhắn riêng
              </Button>
            )}
          </div>
        )}
        
        {/* Recall button for own messages */}
        {showActions && isOwn && onRecall && (
          <div className="flex justify-end mt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs px-2 text-muted-foreground hover:text-destructive"
              onClick={() => onRecall(id)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Thu hồi
            </Button>
          </div>
        )}

        {/* Admin moderation buttons */}
        {showActions && isAdmin && !isOwn && (
          <div className={cn("flex gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
            {onAdminDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs px-2 text-destructive hover:bg-destructive/10"
                onClick={() => onAdminDelete(id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Xóa
              </Button>
            )}
            {isMuted ? (
              onAdminUnmute && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs px-2 text-green-500 hover:bg-green-500/10"
                  onClick={() => onAdminUnmute(userId)}
                >
                  <Volume2 className="h-3 w-3 mr-1" />
                  Bỏ cấm
                </Button>
              )
            ) : (
              onAdminMute && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs px-2 text-orange-500 hover:bg-orange-500/10"
                  onClick={() => onAdminMute(userId)}
                >
                  <VolumeX className="h-3 w-3 mr-1" />
                  Cấm chat
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
