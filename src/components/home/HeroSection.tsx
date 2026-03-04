import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShoppingBag, MessageCircle, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { GlitchText, GradientText, Typewriter, FloatingParticles, AnimatedCounter, WordReveal } from '@/components/motion/TextEffects';

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
      <FloatingParticles count={25} />
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-0 left-0 w-full h-1 bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ transformOrigin: 'left' }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-full h-1 bg-primary/30"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
          style={{ transformOrigin: 'right' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-primary text-primary-foreground border-2 border-primary mb-8"
          initial={{ opacity: 0, y: -30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            <Sparkles className="h-4 w-4" />
          </motion.div>
          <span className="text-sm font-black uppercase tracking-widest">Nền tảng #1 Việt Nam</span>
        </motion.div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 uppercase tracking-tight leading-[0.9]">
          <motion.span 
            className="block text-foreground"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {settings.hero_title || 'Chào mừng đến với'}
          </motion.span>
          <motion.span 
            className="block mt-2"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5, type: 'spring', stiffness: 100 }}
          >
            <GlitchText className="text-primary" intensity="low">BonzShop</GlitchText>
          </motion.span>
        </h1>

        {/* Animated subtitle with typewriter */}
        <motion.div 
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Typewriter 
            texts={[
              settings.hero_subtitle || 'Nền tảng mua bán tài khoản game và sản phẩm số uy tín nhất',
              'Giao dịch an toàn — Hoàn tiền nếu có vấn đề',
              'Hàng nghìn sản phẩm chất lượng đang chờ bạn',
            ]}
            speed={50}
            className="text-muted-foreground"
          />
        </motion.div>

        <motion.p 
          className="text-sm text-muted-foreground/60 mb-10 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <GradientText className="text-sm font-bold">✦ Uy tín ✦ Nhanh chóng ✦ Bảo mật ✦</GradientText>
        </motion.p>

        {/* CTAs */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
            <Button asChild size="lg" variant="gradient" className="text-lg px-8">
              <Link to="/categories">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Khám phá ngay
              </Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link to="/chat">
                <MessageCircle className="mr-2 h-5 w-5" />
                Chat cộng đồng
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats with animated counters */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto mt-16">
          {[
            { value: '1000+', label: 'Sản phẩm' },
            { value: '500+', label: 'Người bán' },
            { value: '99%', label: 'Hài lòng' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="stats-card p-4 rounded-none"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.15, duration: 0.5 }}
              whileHover={{ y: -4, borderColor: 'hsl(14, 90%, 55%)' }}
            >
              <p className="text-3xl md:text-4xl font-black text-primary">
                <AnimatedCounter target={stat.value} duration={2} />
              </p>
              <p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
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
