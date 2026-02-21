import { ReactNode, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Tilt3DCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function Tilt3DCard({ children, className = '', intensity = 10 }: Tilt3DCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    setRotateX((-mouseY / (rect.height / 2)) * intensity);
    setRotateY((mouseX / (rect.width / 2)) * intensity);
    setGlareX(((e.clientX - rect.left) / rect.width) * 100);
    setGlareY(((e.clientY - rect.top) / rect.height) * 100);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX, rotateY }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
    >
      {children}
      {/* Glare effect */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, hsl(280 85% 65% / 0.15) 0%, transparent 60%)`,
        }}
      />
    </motion.div>
  );
}
