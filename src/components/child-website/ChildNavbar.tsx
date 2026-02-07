import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { LogOut, Shield, User, FolderOpen, Gift, Menu, X, ShoppingBag, Coins, Store, FileText, Sparkles, MessageCircle, Skull, History, ChevronLeft, ChevronRight, Home, Globe, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

export function ChildNavbar() {
  const { user, isAdmin, sellerProfile, signOut, displayName } = useAuth();
  const { website, primaryColor, secondaryColor } = useChildWebsite();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const basePath = `/store/${slug}`;

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
    { to: basePath, label: 'Trang chủ', icon: Home },
    { to: `${basePath}/accounts`, label: 'Mua Acc', icon: User },
    { to: `${basePath}/posts`, label: 'Bài viết', icon: FileText },
    { to: `${basePath}/scam-reports`, label: 'Scam', icon: Skull },
    { to: `${basePath}/chat`, label: 'Chat', icon: MessageCircle, requireAuth: true },
    { to: `${basePath}/my-orders`, label: 'Đơn hàng', icon: ShoppingBag, requireAuth: true },
    { to: `${basePath}/categories`, label: 'Danh mục', icon: FolderOpen },
    { to: `${basePath}/free`, label: 'Miễn phí', icon: Gift },
    { to: `${basePath}/contact`, label: 'Liên hệ', icon: MessageCircle },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Mobile horizontal navbar
  if (isMobile) {
    return (
      <nav 
        className="sticky top-0 z-50 transition-all duration-300 border-b backdrop-blur-xl"
        style={{ 
          background: scrolled 
            ? `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10)` 
            : `linear-gradient(135deg, ${primaryColor}05, ${secondaryColor}05)`,
          borderColor: primaryColor + '30'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Back to main + Logo */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Link to={basePath} className="flex items-center gap-2 group">
                <img 
                  src={bonzshopLogo} 
                  alt="BonzShop" 
                  className="h-10 w-auto object-contain"
                />
                <span 
                  className="font-bold text-sm"
                  style={{ color: primaryColor }}
                >
                  {website?.name}
                </span>
              </Link>
            </div>

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
                  .filter(link => !link.requireAuth || user)
                  .map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group",
                      isActive(link.to) 
                        ? "text-white" 
                        : "hover:bg-secondary/50"
                    )}
                    style={isActive(link.to) ? { backgroundColor: primaryColor + '30', color: primaryColor } : {}}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.icon && (
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: primaryColor + '20' }}
                      >
                        <link.icon className="h-4 w-4" style={{ color: primaryColor }} />
                      </div>
                    )}
                    <span className="font-medium">{link.label}</span>
                  </Link>
                ))}

                {user ? (
                  <>
                    {/* Mobile Coin Balance */}
                    <Link
                      to="/buy-coins"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border mt-2"
                      style={{ 
                        background: `linear-gradient(to right, ${primaryColor}10, ${secondaryColor}10)`,
                        borderColor: primaryColor + '30'
                      }}
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
                     
                    {/* User Profile */}
                    <Link
                      to="/user-profile"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: primaryColor + '20' }}
                      >
                        <User className="h-4 w-4" style={{ color: primaryColor }} />
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
                    <Button 
                      className="w-full h-12"
                      style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                    >
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
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen z-50 transition-all duration-300 border-r backdrop-blur-xl",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
      style={{ 
        background: `linear-gradient(180deg, ${primaryColor}10, ${secondaryColor}05)`,
        borderColor: primaryColor + '20'
      }}
    >
      <div className="flex flex-col h-full p-3">
        {/* Back to main site */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/')}
          className="mb-2 justify-start gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {!sidebarCollapsed && <span className="text-xs">Về BonzShop</span>}
        </Button>

        {/* Logo */}
        <Link to={basePath} className="flex items-center justify-center group mb-6 px-2">
          <img 
            src={bonzshopLogo} 
            alt={website?.name} 
            className={cn(
              "object-contain transition-all duration-300 group-hover:scale-105",
              sidebarCollapsed ? "h-10 w-10" : "h-16 w-auto max-w-full"
            )}
          />
        </Link>

        {/* Website Name */}
        {!sidebarCollapsed && (
          <div className="text-center mb-4 px-2">
            <h2 
              className="font-bold text-lg truncate"
              style={{ color: primaryColor }}
            >
              {website?.name}
            </h2>
            <p className="text-xs text-muted-foreground">Powered by BonzShop</p>
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ 
            backgroundColor: primaryColor + '30',
            borderColor: primaryColor + '50'
          }}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" style={{ color: primaryColor }} />
          ) : (
            <ChevronLeft className="h-3 w-3" style={{ color: primaryColor }} />
          )}
        </button>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navLinks
            .filter(link => !link.requireAuth || user)
            .map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive(link.to)
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
              style={isActive(link.to) ? { 
                backgroundColor: primaryColor + '30',
                color: primaryColor,
                boxShadow: `0 0 20px -5px ${primaryColor}50`
              } : {}}
              title={sidebarCollapsed ? link.label : undefined}
            >
              {link.icon && (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: primaryColor + '20' }}
                >
                  <link.icon className="h-4 w-4" style={{ color: primaryColor }} />
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
                  "flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors",
                  sidebarCollapsed && "justify-center"
                )}
                style={{ 
                  background: `linear-gradient(to right, ${primaryColor}10, ${secondaryColor}10)`,
                  borderColor: primaryColor + '30'
                }}
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
                      <span className="text-xs text-muted-foreground">Nạp thêm</span>
                    </div>
                  </div>
                )}
              </Link>

              {/* User Profile */}
              <Link
                to="/user-profile"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-secondary/50",
                  sidebarCollapsed && "justify-center"
                )}
                title={sidebarCollapsed ? displayName || user.email : undefined}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: primaryColor + '20' }}
                >
                  <User className="h-4 w-4" style={{ color: primaryColor }} />
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
            <Link to="/auth">
              <Button 
                className={cn("w-full", sidebarCollapsed && "p-2")}
                style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
              >
                {sidebarCollapsed ? <User className="h-4 w-4" /> : 'Đăng nhập'}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
