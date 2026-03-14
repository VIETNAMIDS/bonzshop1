import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// Particle types for different effects
type ParticleType = 'confetti' | 'sparkle' | 'firework' | 'heart' | 'star';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  type: ParticleType;
  rotation: number;
  velocityX: number;
  velocityY: number;
  opacity: number;
  delay: number;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF69B4', '#00CED1', '#FFD700', '#7B68EE',
  '#FF4500', '#00FA9A', '#FF1493', '#00BFFF', '#ADFF2F',
];

const EMOJIS = ['🎉', '✨', '💫', '⭐', '🌟', '💖', '🔥', '🎊', '🎈', '💎'];

// Generate random particles
const generateParticles = (count: number, centerX: number, centerY: number): Particle[] => {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const velocity = 2 + Math.random() * 6;
    const types: ParticleType[] = ['confetti', 'sparkle', 'firework', 'heart', 'star'];
    
    return {
      id: i,
      x: centerX,
      y: centerY,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 8,
      type: types[Math.floor(Math.random() * types.length)],
      rotation: Math.random() * 360,
      velocityX: Math.cos(angle) * velocity,
      velocityY: Math.sin(angle) * velocity - 2,
      opacity: 1,
      delay: Math.random() * 200,
    };
  });
};

interface MessageEffectsProps {
  trigger: boolean;
  type?: 'send' | 'receive';
  onComplete?: () => void;
}

export function MessageEffects({ trigger, type = 'send', onComplete }: MessageEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [emojis, setEmojis] = useState<{ id: number; emoji: string; x: number; y: number; delay: number }[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);
      
      // Generate particles
      const newParticles = generateParticles(30, 50, 50);
      setParticles(newParticles);
      
      // Generate floating emojis
      const newEmojis = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: 10 + Math.random() * 80,
        y: 100,
        delay: i * 100,
      }));
      setEmojis(newEmojis);

      // Cleanup after animation
      const timeout = setTimeout(() => {
        setParticles([]);
        setEmojis([]);
        setIsActive(false);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [trigger, isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.type === 'confetti' ? particle.color : 'transparent',
            borderRadius: particle.type === 'sparkle' ? '50%' : particle.type === 'heart' ? '0' : '2px',
            transform: `rotate(${particle.rotation}deg)`,
            boxShadow: particle.type === 'sparkle' ? `0 0 ${particle.size}px ${particle.color}` : 'none',
            animationDelay: `${particle.delay}ms`,
            '--velocity-x': particle.velocityX,
            '--velocity-y': particle.velocityY,
          } as React.CSSProperties}
        >
          {particle.type === 'heart' && (
            <span style={{ color: particle.color, fontSize: particle.size * 1.5 }}>❤</span>
          )}
          {particle.type === 'star' && (
            <span style={{ color: particle.color, fontSize: particle.size * 1.5 }}>★</span>
          )}
          {particle.type === 'firework' && (
            <span style={{ color: particle.color, fontSize: particle.size * 1.5 }}>✦</span>
          )}
        </div>
      ))}

      {/* Floating emojis */}
      {emojis.map((item) => (
        <div
          key={item.id}
          className="absolute animate-float-up text-2xl"
          style={{
            left: `${item.x}%`,
            bottom: 0,
            animationDelay: `${item.delay}ms`,
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
}

// Fireworks burst component
export function FireworksBurst({ active }: { active: boolean }) {
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (active) {
      const interval = setInterval(() => {
        setBursts(prev => [
          ...prev.slice(-5),
          { 
            id: Date.now(), 
            x: 10 + Math.random() * 80, 
            y: 10 + Math.random() * 60 
          }
        ]);
      }, 300);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setBursts([]);
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [active]);

  return (
    <>
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="absolute pointer-events-none"
          style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-firework-particle"
              style={{
                backgroundColor: COLORS[Math.floor(Math.random() * COLORS.length)],
                '--angle': `${(360 / 12) * i}deg`,
                boxShadow: `0 0 6px ${COLORS[Math.floor(Math.random() * COLORS.length)]}`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </>
  );
}

// Confetti rain effect
export function ConfettiRain({ active, duration = 3000 }: { active: boolean; duration?: number }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; color: string; delay: number; size: number }[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 1000,
        size: 6 + Math.random() * 6,
      }));
      setPieces(newPieces);

      const timeout = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timeout);
    }
  }, [active, duration]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[100]">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: -20,
            width: piece.size,
            height: piece.size * 0.6,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}ms`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}
