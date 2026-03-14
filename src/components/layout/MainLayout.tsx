import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
<<<<<<< HEAD
import { FloatingBotButton } from '@/components/chat/FloatingBotButton';
=======
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af

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
<<<<<<< HEAD
        !isMobile && "ml-60"
      )}>
        {children}
      </main>
      <FloatingBotButton />
=======
        !isMobile && "ml-60" // Add left margin for desktop sidebar
      )}>
        {children}
      </main>
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    </div>
  );
}
