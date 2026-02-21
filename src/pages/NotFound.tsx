import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      
      {/* Accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/30" />

      <div className="relative z-10 text-center px-4">
        {/* Giant 404 */}
        <h1 className="text-[12rem] md:text-[16rem] font-black leading-none tracking-tighter text-foreground/5 select-none">
          404
        </h1>
        
        {/* Overlay text */}
        <div className="-mt-32 md:-mt-40 relative">
          <p className="text-sm font-mono uppercase tracking-[0.3em] text-primary mb-4">
            Error // Page not found
          </p>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground mb-4">
            Trang không tồn tại
          </h2>
          <p className="text-muted-foreground font-mono text-sm max-w-md mx-auto mb-2">
            Đường dẫn <span className="text-primary font-bold">{location.pathname}</span> không tồn tại trên hệ thống.
          </p>
          <p className="text-muted-foreground/50 font-mono text-xs mb-8">
            STATUS: 404 — NOT_FOUND
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="gradient" size="lg">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Về trang chủ
              </Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
