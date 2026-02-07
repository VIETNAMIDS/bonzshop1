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
      "transition-all duration-300",
      !isMobile && "ml-60",
      className
    )}>
      {children}
    </div>
  );
}
