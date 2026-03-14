import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
<<<<<<< HEAD
      "transition-all duration-300 relative isolate",
=======
      "transition-all duration-300",
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
      !isMobile && "ml-60",
      className
    )}>
      {children}
    </div>
  );
}
