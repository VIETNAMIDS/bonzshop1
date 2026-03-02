import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShoppingBag, MessageCircle, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SiteSettings {
  hero_video_url?: string;
  hero_title?: string;
  hero_subtitle?: string;
}

export function HeroSection() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['hero_video_url', 'hero_title', 'hero_subtitle']);

    if (data) {
      const settingsMap: SiteSettings = {};
      data.forEach(item => {
        settingsMap[item.key as keyof SiteSettings] = item.value || undefined;
      });
      setSettings(settingsMap);
    }
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' });
  };

  // Check if URL is a valid direct video file (MP4, WebM, etc.)
  const isDirectVideoUrl = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  // Extract TikTok video ID from URL
  const getTikTokVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/video\/(\d+)/);
    return match ? match[1] : null;
  };

  // Check if URL is YouTube
  const getYouTubeVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const tiktokId = settings.hero_video_url ? getTikTokVideoId(settings.hero_video_url) : null;
  const youtubeId = settings.hero_video_url ? getYouTubeVideoId(settings.hero_video_url) : null;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Direct Video Background (MP4, WebM) */}
      {settings.hero_video_url && isDirectVideoUrl(settings.hero_video_url) && (
        <video
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
            isVideoLoaded ? "opacity-30" : "opacity-0"
          )}
        >
          <source src={settings.hero_video_url} type="video/mp4" />
        </video>
      )}

      {/* TikTok Embed Background */}
      {tiktokId && (
        <div className="absolute inset-0 w-full h-full overflow-hidden opacity-40">
          <iframe
            src={`https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=1&muted=1&loop=1`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] min-w-[100vw] min-h-[100vh] pointer-events-none"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      {/* YouTube Embed Background */}
      {youtubeId && (
        <div className="absolute inset-0 w-full h-full overflow-hidden opacity-40">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&modestbranding=1`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] min-w-[100vw] min-h-[100vh] pointer-events-none"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />

      {/* Brutalist background — raw grid */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/60" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-primary text-primary-foreground border-2 border-primary mb-8 animate-scale-in">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-black uppercase tracking-widest">Nền tảng #1 Việt Nam</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 animate-scale-in uppercase tracking-tight leading-[0.9]">
          <span className="block text-foreground">
            {settings.hero_title || 'Chào mừng đến với'}
          </span>
          <span className="block mt-2 text-primary">
            BonzShop
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-scale-in animation-delay-200 font-mono">
          {settings.hero_subtitle || 'Nền tảng mua bán tài khoản game và sản phẩm số uy tín nhất'}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in animation-delay-200">
          <Button 
            asChild 
            size="lg" 
            variant="gradient"
            className="text-lg px-8"
          >
            <Link to="/categories">
              <ShoppingBag className="mr-2 h-5 w-5" />
              Khám phá ngay
            </Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="text-lg px-8"
          >
            <Link to="/chat">
              <MessageCircle className="mr-2 h-5 w-5" />
              Chat cộng đồng
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto mt-16 animate-scale-in animation-delay-200">
          <div className="stats-card p-4 rounded-none">
            <p className="text-3xl md:text-4xl font-black text-primary">1000+</p>
            <p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">Sản phẩm</p>
          </div>
          <div className="stats-card p-4 rounded-none">
            <p className="text-3xl md:text-4xl font-black text-primary">500+</p>
            <p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">Người bán</p>
          </div>
          <div className="stats-card p-4 rounded-none">
            <p className="text-3xl md:text-4xl font-black text-primary">99%</p>
            <p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">Hài lòng</p>
          </div>
        </div>

        {/* Scroll indicator */}
        <button 
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        >
          <ChevronDown className="h-8 w-8 text-muted-foreground" />
        </button>
      </div>
    </section>
  );
}
