import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className={cn(
        "transition-all duration-300",
        !isMobile && "ml-60" // Add left margin for desktop sidebar
      )}>
        {children}
      </main>
    </div>
  );
}
