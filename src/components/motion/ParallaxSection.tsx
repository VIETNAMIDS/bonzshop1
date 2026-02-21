import { ReactNode, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  speed?: number;
}

export function ParallaxSection({ children, className = '', speed = 0.3 }: ParallaxSectionProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}

export function FloatingElement({ 
  children, 
  className = '',
  xRange = [-20, 20],
  yRange = [-30, 30],
  duration = 6
}: { 
  children: ReactNode; 
  className?: string;
  xRange?: [number, number];
  yRange?: [number, number];
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        x: xRange,
        y: yRange,
        rotate: [-2, 2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}
