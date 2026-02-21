import { ReactNode, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}

export function StaggerContainer({ 
  children, 
  className = '', 
  staggerDelay = 0.1,
  once = true 
}: StaggerContainerProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: "-30px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerDelay }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ 
  children, 
  className = '' 
}: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 40, scale: 0.95 },
        visible: { 
          opacity: 1, y: 0, scale: 1,
          transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
