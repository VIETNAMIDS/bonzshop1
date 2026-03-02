import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ChildNavbar } from './ChildNavbar';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Loader2, Store, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface ChildWebsiteLayoutProps {
  children: ReactNode;
}

export function ChildWebsiteLayout({ children }: ChildWebsiteLayoutProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { website, isLoading, error, primaryColor, secondaryColor } = useChildWebsite();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {error || 'Không tìm thấy website'}
            </h2>
            <p className="text-muted-foreground mb-6">
              Website này không tồn tại hoặc đã bị tắt.
            </p>
            <Button onClick={() => navigate('/')} variant="gradient">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Về trang chủ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ChildNavbar />
      <main className={cn(
        "transition-all duration-300",
        !isMobile && "ml-60"
      )}>
        {children}
      </main>
      
      {/* Footer */}
      <footer 
        className={cn(
          "py-6 border-t text-center transition-all duration-300",
          !isMobile && "ml-60"
        )}
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}05, ${secondaryColor}05)`,
          borderColor: primaryColor + '20'
        }}
      >
        <div className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground">
            {website.name} - Powered by{' '}
            <a 
              href="/" 
              className="font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              BonzShop
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
