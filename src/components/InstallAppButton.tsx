import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HIDE_KEY = 'install_fab_hidden_at';
const HIDE_DURATION = 2 * 60 * 60 * 1000; // 2h

function isStandaloneMode() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function InstallAppButton() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneMode() || pathname === '/install') {
      setVisible(false);
      return;
    }

    const hiddenAt = Number(localStorage.getItem(HIDE_KEY) || '0');
    if (hiddenAt && Date.now() - hiddenAt < HIDE_DURATION) {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, [pathname]);

  const handleHide = () => {
    localStorage.setItem(HIDE_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[55] flex flex-col items-end gap-1 md:bottom-6 md:right-24">
      <Button asChild size="sm" className="h-11 rounded-full px-4 gap-2 shadow-lg">
        <Link to="/install" aria-label="Mở trang tải ứng dụng BonzShop">
          <Download className="h-4 w-4" />
          Tải app
        </Link>
      </Button>
      <button
        type="button"
        onClick={handleHide}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Ẩn
      </button>
    </div>
  );
}
