import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EMOJI_CATEGORIES = {
  faces: {
    label: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷']
  },
  gestures: {
    label: '👍',
    emojis: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶']
  },
  hearts: {
    label: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '💍', '💎']
  },
  nature: {
    label: '🌟',
    emojis: ['⭐', '🌟', '✨', '💫', '🔥', '💥', '⚡', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '🌊', '💧', '💦', '🌸', '🌺', '🌻', '🌹', '🌷', '🌱', '🍀', '🍁']
  },
  objects: {
    label: '🎉',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎮', '🎲', '🎯', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '🔔', '📱', '💻', '⌨️', '🖥️', '💡', '🔋', '💰', '💵', '💎']
  },
  food: {
    label: '🍕',
    emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥨', '🥯', '🥖', '🫓', '🥗', '🍜', '🍝', '🍣', '🍤', '🍩', '🍪', '🎂', '🍰', '🧁', '🍦', '🍭']
  }
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="shrink-0 hover:bg-primary/10"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 glass-strong border-primary/20" 
        align="start"
        side="top"
      >
        <Tabs defaultValue="faces" className="w-full">
          <TabsList className="w-full grid grid-cols-6 bg-secondary/50 p-1">
            {Object.entries(EMOJI_CATEGORIES).map(([key, { label }]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="text-lg p-2 data-[state=active]:bg-primary/20"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(EMOJI_CATEGORIES).map(([key, { emojis }]) => (
            <TabsContent key={key} value={key} className="p-3 m-0">
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    className="text-2xl p-1 hover:bg-primary/20 rounded transition-all hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
