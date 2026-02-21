import { Link } from 'react-router-dom';
import { MessageCircle, ShoppingBag, Shield, FileText, Gift, FolderOpen } from 'lucide-react';
import bonzshopLogo from '@/assets/bonzshop-logo.png';

const footerLinks = [
  {
    title: 'SẢN PHẨM',
    links: [
      { to: '/accounts', label: 'Mua tài khoản', icon: ShoppingBag },
      { to: '/categories', label: 'Danh mục', icon: FolderOpen },
      { to: '/free', label: 'Miễn phí', icon: Gift },
    ],
  },
  {
    title: 'CỘNG ĐỒNG',
    links: [
      { to: '/chat', label: 'Chat', icon: MessageCircle },
      { to: '/posts', label: 'Bài viết', icon: FileText },
      { to: '/scam-reports', label: 'Báo cáo Scam', icon: Shield },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t-2 border-border bg-background relative">
      <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <img src={bonzshopLogo} alt="BonzShop" className="h-16 w-auto mb-4" />
            <p className="text-muted-foreground text-sm font-mono max-w-xs">
              Nền tảng mua bán tài khoản game và sản phẩm số uy tín nhất Việt Nam.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                    >
                      <link.icon className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t-2 border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">
            © {new Date().getFullYear()} BonzShop — All rights reserved
          </p>
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground/30">
            <span className="inline-block w-2 h-2 bg-success rounded-full animate-pulse" />
            SYSTEM ONLINE
          </div>
        </div>
      </div>
    </footer>
  );
}
