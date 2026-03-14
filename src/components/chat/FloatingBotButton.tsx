import { useState } from 'react';
import { BotChat } from './BotChat';
import { useAuth } from '@/contexts/AuthContext';
import botAvatarImg from '@/assets/bot-avatar.jpeg';

export function FloatingBotButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-cyan-500/30 overflow-hidden hover:scale-110 transition-transform active:scale-95 animate-pulse-glow border-2 border-primary/50"
        aria-label="Mở BonzBot"
      >
        <img src={botAvatarImg} alt="BonzBot" className="h-full w-full object-cover" />
      </button>
      <BotChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
