import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Shield, User, FolderOpen, Gift, Menu, X, ShoppingBag, Coins, Store, FileText, Sparkles, MessageCircle, Skull, History, ChevronLeft, ChevronRight, Home, Globe, Code, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

export function Navbar() {
  const { user, isAdmin, sellerProfile, signOut, displayName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      fetchCoinBalance();
    }
  }, [user]);

  const fetchCoinBalance = async () => {
    const { data } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user?.id)
      .single();
    
    if (data) {
      setCoinBalance(data.balance);
    } else {
      setCoinBalance(0);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navLinks = [
    { to: '/', label: 'Trang chủ', icon: Home },
    { to: '/accounts', label: 'Mua Acc', icon: User },
    { to: '/posts', label: 'Bài viết', icon: FileText },
    { to: '/scam-reports', label: 'Scam', icon: Skull },
    { to: '/chat', label: 'Chat', icon: MessageCircle, requireAuth: true },
    { to: '/qr-scan', label: 'Quét QR', icon: ScanLine, requireAuth: true, mobileOnly: true },
    { to: '/my-orders', label: 'Đơn hàng', icon: ShoppingBag, requireAuth: true },
    { to: '/my-websites', label: 'Web Con', icon: Globe, requireAuth: true },
    { to: '/categories', label: 'Danh mục', icon: FolderOpen },
    { to: '/free', label: 'Miễn phí', icon: Gift },
    { to: '/api', label: 'API', icon: Code },
    { to: '/contact', label: 'Liên hệ', icon: MessageCircle },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Mobile horizontal navbar
  if (isMobile) {
    return (
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'glass-strong border-b border-primary/10 shadow-[0_5px_30px_-10px_hsl(280_85%_65%/0.2)]' 
          : 'glass border-b border-border/50'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src={bonzshopLogo} 
                alt="BonzShop" 
                className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </Link>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2">
              {user && <NotificationBell />}
              <button
                className="p-2 -mr-2 rounded-lg hover:bg-secondary/50 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="py-4 border-t border-border/50 animate-fade-in">
              <div className="flex flex-col gap-1">
                {navLinks
                  .filter(link => (!link.requireAuth || user) && (!link.mobileOnly || isMobile))
                  .map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group",
                      isActive(link.to) 
                        ? "bg-primary/20 text-primary" 
                        : "hover:bg-secondary/50"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.icon ? (
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isActive(link.to) 
                          ? "bg-primary/30" 
                          : "bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20"
                      )}>
                        <link.icon className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                    <span className="font-medium">{link.label}</span>
                  </Link>
                ))}

                {user ? (
                  <>
                    {/* Mobile Coin Balance */}
                    <Link
                      to="/buy-coins"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mt-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                        <Coins className="h-4 w-4 text-warning" />
                      </div>
                      <div>
                        <span className="font-semibold">{coinBalance !== null ? `${coinBalance} xu` : 'Đang tải...'}</span>
                        <p className="text-xs text-muted-foreground">Nhấn để nạp thêm</p>
                      </div>
                    </Link>
                     
                    <Link
                      to="/coin-history"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <History className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">Lịch sử xu</span>
                    </Link>
                    
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-warning" />
                        </div>
                        <span className="font-medium">Quản trị Admin</span>
                      </Link>
                    )}
                    {sellerProfile && (
                      <Link
                        to="/seller-accounts"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                          <Store className="h-4 w-4 text-success" />
                        </div>
                        <span className="font-medium">Upload sản phẩm</span>
                      </Link>
                    )}
                    <Link
                      to="/user-profile"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">{displayName || 'Hồ sơ của tôi'}</span>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors mt-2"
                    >
                      <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                        <LogOut className="h-4 w-4" />
                      </div>
                      <span className="font-medium">Đăng xuất</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    className="mt-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="gradient" className="w-full h-12">
                      Đăng nhập
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    );
  }

  // Desktop vertical sidebar
  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen z-50 transition-all duration-300 glass-strong border-r border-primary/10",
      sidebarCollapsed ? "w-16" : "w-60"
    )}>
      <div className="flex flex-col h-full p-3">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center group mb-6 px-2">
          <img 
            src={bonzshopLogo} 
            alt="BonzShop" 
            className={cn(
              "object-contain transition-all duration-300 group-hover:scale-105",
              sidebarCollapsed ? "h-12 w-12" : "h-20 w-auto max-w-full"
            )}
          />
        </Link>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/30 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3 text-primary" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-primary" />
          )}
        </button>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navLinks
            .filter(link => (!link.requireAuth || user) && (!link.mobileOnly || isMobile))
            .map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive(link.to)
                  ? "bg-primary/20 text-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
              title={sidebarCollapsed ? link.label : undefined}
            >
              {link.icon ? (
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                  isActive(link.to)
                    ? "bg-primary/30"
                    : "bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20"
                )}>
                  <link.icon className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                  <Home className="h-4 w-4 text-primary" />
                </div>
              )}
              {!sidebarCollapsed && <span className="font-medium text-sm">{link.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-border/50 pt-3 mt-3 space-y-2">
          {user ? (
            <>
              {/* Notification */}
              <div className={cn("flex items-center gap-3 px-3 py-2", sidebarCollapsed && "justify-center")}>
                <NotificationBell />
                {!sidebarCollapsed && <span className="text-sm text-muted-foreground">Thông báo</span>}
              </div>

              {/* Coin Balance */}
              <Link
                to="/buy-coins"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-colors",
                  sidebarCollapsed && "justify-center"
                )}
                title={sidebarCollapsed ? `${coinBalance} xu` : undefined}
              >
                <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <Coins className="h-4 w-4 text-warning" />
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{coinBalance !== null ? `${coinBalance} xu` : '...'}</span>
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary/50" />
                      <Link to="/coin-history" className="text-xs text-muted-foreground hover:text-primary">
                        Lịch sử
                      </Link>
                    </div>
                  </div>
                )}
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                    isActive('/admin')
                      ? "bg-warning/20 text-warning"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
                    sidebarCollapsed && "justify-center"
                  )}
                  title={sidebarCollapsed ? "Admin" : undefined}
                >
                  <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-warning" />
                  </div>
                  {!sidebarCollapsed && <span className="font-medium text-sm">Admin</span>}
                </Link>
              )}

              {sellerProfile && (
                <Link
                  to="/seller-accounts"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                    isActive('/seller-accounts')
                      ? "bg-success/20 text-success"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
                    sidebarCollapsed && "justify-center"
                  )}
                  title={sidebarCollapsed ? "Upload" : undefined}
                >
                  <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                    <Store className="h-4 w-4 text-success" />
                  </div>
                  {!sidebarCollapsed && <span className="font-medium text-sm">Upload</span>}
                </Link>
              )}

              {/* User Profile */}
              <Link
                to="/user-profile"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-secondary/50",
                  sidebarCollapsed && "justify-center"
                )}
                title={sidebarCollapsed ? displayName || user.email : undefined}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium truncate">{displayName || user.email?.split('@')[0]}</span>
                )}
              </Link>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors",
                  sidebarCollapsed && "justify-center"
                )}
                title={sidebarCollapsed ? "Đăng xuất" : undefined}
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <LogOut className="h-4 w-4" />
                </div>
                {!sidebarCollapsed && <span className="font-medium text-sm">Đăng xuất</span>}
              </button>
            </>
          ) : (
            <Link to="/auth" className="block">
              <Button variant="gradient" className={cn("w-full", sidebarCollapsed && "px-2")}>
                {sidebarCollapsed ? <User className="h-4 w-4" /> : "Đăng nhập"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
