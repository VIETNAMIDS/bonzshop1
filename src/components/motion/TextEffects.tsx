import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ========== TYPEWRITER EFFECT ==========
interface TypewriterProps {
  texts: string[];
  className?: string;
  speed?: number;
  deleteSpeed?: number;
  pauseTime?: number;
  cursor?: boolean;
}

export function Typewriter({ 
  texts, 
  className = '', 
  speed = 80, 
  deleteSpeed = 40, 
  pauseTime = 2000,
  cursor = true 
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? deleteSpeed : speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex, texts, speed, deleteSpeed, pauseTime]);

  return (
    <span className={className}>
      {displayText}
      {cursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block w-[3px] h-[1em] bg-primary ml-1 align-middle"
        />
      )}
    </span>
  );
}

// ========== GLITCH TEXT ==========
interface GlitchTextProps {
  children: string;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function GlitchText({ children, className = '', intensity = 'medium' }: GlitchTextProps) {
  const glitchIntensity = {
    low: { offset: 1, interval: 5000 },
    medium: { offset: 2, interval: 3000 },
    high: { offset: 3, interval: 2000 },
  }[intensity];

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute top-0 left-0 text-primary opacity-70 z-0"
        animate={{
          x: [0, -glitchIntensity.offset, glitchIntensity.offset, 0],
          y: [0, glitchIntensity.offset, -glitchIntensity.offset, 0],
          opacity: [0, 0.7, 0.7, 0],
        }}
        transition={{
          duration: 0.15,
          repeat: Infinity,
          repeatDelay: glitchIntensity.interval / 1000,
          ease: 'easeInOut',
        }}
        aria-hidden
      >
        {children}
      </motion.span>
      <motion.span
        className="absolute top-0 left-0 text-[hsl(200,90%,55%)] opacity-70 z-0"
        animate={{
          x: [0, glitchIntensity.offset, -glitchIntensity.offset, 0],
          y: [0, -glitchIntensity.offset, glitchIntensity.offset, 0],
          opacity: [0, 0.5, 0.5, 0],
        }}
        transition={{
          duration: 0.15,
          repeat: Infinity,
          repeatDelay: glitchIntensity.interval / 1000 + 0.5,
          ease: 'easeInOut',
        }}
        aria-hidden
      >
        {children}
      </motion.span>
    </span>
  );
}

// ========== GRADIENT ANIMATED TEXT ==========
interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}

export function GradientText({ children, className = '', colors }: GradientTextProps) {
  const defaultColors = [
    'hsl(14, 90%, 55%)',   // primary
    'hsl(340, 80%, 55%)',  // pink  
    'hsl(280, 80%, 60%)',  // purple
    'hsl(14, 90%, 55%)',   // primary
  ];
  const gradientColors = colors || defaultColors;

  return (
    <motion.span
      className={cn("inline-block bg-clip-text text-transparent font-black", className)}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradientColors.join(', ')})`,
        backgroundSize: '300% 100%',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}

// ========== LETTER BY LETTER REVEAL ==========
interface LetterRevealProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export function LetterReveal({ text, className = '', delay = 0, staggerDelay = 0.03 }: LetterRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.span ref={ref} className={cn("inline-block", className)}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, rotateX: 90 }}
          animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={{
            duration: 0.4,
            delay: delay + i * staggerDelay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="inline-block"
          style={{ transformOrigin: 'bottom' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ========== WORD BY WORD REVEAL ==========
interface WordRevealProps {
  text: string;
  className?: string;
  delay?: number;
}

export function WordReveal({ text, className = '', delay = 0 }: WordRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(' ');

  return (
    <motion.span ref={ref} className={cn("inline-block", className)}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ========== FLOATING PARTICLES ==========
interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

export function FloatingParticles({ count = 20, className = '' }: FloatingParticlesProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/20"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -(Math.random() * 100 + 50)],
            x: [0, (Math.random() - 0.5) * 60],
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// ========== NEON GLOW TEXT ==========
interface NeonTextProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export function NeonText({ children, className = '', color = 'hsl(14, 90%, 55%)' }: NeonTextProps) {
  return (
    <motion.span
      className={cn("inline-block", className)}
      animate={{
        textShadow: [
          `0 0 4px ${color}, 0 0 11px ${color}, 0 0 19px ${color}`,
          `0 0 7px ${color}, 0 0 20px ${color}, 0 0 35px ${color}`,
          `0 0 4px ${color}, 0 0 11px ${color}, 0 0 19px ${color}`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.span>
  );
}

// ========== COUNTER WITH BLUR ==========
interface AnimatedCounterProps {
  target: string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({ target, className = '', duration = 2 }: AnimatedCounterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const numericPart = parseInt(target.replace(/[^0-9]/g, ''));
  const suffix = target.replace(/[0-9]/g, '');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = numericPart / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= numericPart) {
        setCount(numericPart);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, numericPart, duration]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {count}{suffix}
    </motion.span>
  );
}
