import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type MediaType = 'none' | 'direct' | 'youtube' | 'tiktok' | 'unknown';

declare global {
  interface Window {
    // TikTok embed script sometimes exposes this helper to (re)scan the page.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tiktokEmbedLoad?: any;
  }
}

const TIKTOK_SCRIPT_SRC = 'https://www.tiktok.com/embed.js';

function isDirectVideoUrl(url: string) {
  const lower = url.toLowerCase();
  const exts = ['.mp4', '.webm', '.ogg', '.mov'];
  return exts.some((ext) => lower.includes(ext));
}

function getTikTokVideoId(url: string) {
  const match = url.match(/video\/(\d+)/);
  return match?.[1] ?? null;
}

function getYouTubeVideoId(url: string) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  return match?.[1] ?? null;
}

function ensureTikTokScript() {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TIKTOK_SCRIPT_SRC}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = TIKTOK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TikTok embed script'));
    document.body.appendChild(script);
  });
}

interface HeroBackgroundMediaProps {
  className?: string;
}

export function HeroBackgroundMedia({ className }: HeroBackgroundMediaProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isDirectVideoLoaded, setIsDirectVideoLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_video_url')
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error('Error fetching hero_video_url:', error);
        setUrl(null);
        return;
      }

      setUrl(data?.value ?? null);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const parsed = useMemo(() => {
    if (!url) return { mediaType: 'none' as MediaType, tiktokId: null as string | null, youtubeId: null as string | null };
    const tiktokId = getTikTokVideoId(url);
    if (tiktokId) return { mediaType: 'tiktok' as MediaType, tiktokId, youtubeId: null as string | null };
    const youtubeId = getYouTubeVideoId(url);
    if (youtubeId) return { mediaType: 'youtube' as MediaType, tiktokId: null as string | null, youtubeId };
    if (isDirectVideoUrl(url)) return { mediaType: 'direct' as MediaType, tiktokId: null as string | null, youtubeId: null as string | null };
    return { mediaType: 'unknown' as MediaType, tiktokId: null as string | null, youtubeId: null as string | null };
  }, [url]);

  // Kick TikTok embed script to render the blockquote.
  useEffect(() => {
    if (parsed.mediaType !== 'tiktok' || !url || !parsed.tiktokId) return;

    let cancelled = false;
    ensureTikTokScript()
      .then(() => {
        if (cancelled) return;
        // Try to re-scan embeds when URL changes.
        window.tiktokEmbedLoad?.();
      })
      .catch((err) => {
        // If TikTok blocks embedding, this at least gives a visible console signal.
        console.error(err);
      });

    return () => {
      cancelled = true;
    };
  }, [parsed.mediaType, parsed.tiktokId, url]);

  if (!url || parsed.mediaType === 'none' || parsed.mediaType === 'unknown') return null;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none',
        // Keep the background subtle so text stays readable.
        'opacity-40',
        className
      )}
      aria-hidden
    >
      {parsed.mediaType === 'direct' && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setIsDirectVideoLoaded(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            isDirectVideoLoaded ? 'opacity-100' : 'opacity-0'
          )}
        >
          <source src={url} />
        </video>
      )}

      {parsed.mediaType === 'youtube' && parsed.youtubeId && (
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            title="Hero background video"
            src={`https://www.youtube.com/embed/${parsed.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${parsed.youtubeId}&controls=0&showinfo=0&modestbranding=1&playsinline=1`}
            className="absolute top-1/2 left-1/2 h-[300%] w-[300%] -translate-x-1/2 -translate-y-1/2"
            allow="autoplay; encrypted-media"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      {parsed.mediaType === 'tiktok' && parsed.tiktokId && (
        <div className="absolute inset-0 overflow-hidden">
          {/*
            TikTok doesn't provide a reliable direct MP4 URL via regular embeds.
            The official embed mechanism uses a blockquote + https://www.tiktok.com/embed.js.
          */}
          <div className="absolute inset-0 origin-center scale-[2]">
            {/* eslint-disable-next-line jsx-a11y/blockquote-has-caption */}
            <blockquote
              className="tiktok-embed"
              cite={url}
              data-video-id={parsed.tiktokId}
              style={{ maxWidth: '100%', minWidth: 325, margin: 0 }}
            >
              <section />
            </blockquote>
          </div>

          {/* Local styles to make the embed fill the hero */}
          <style>{`
            .tiktok-embed { width: 100% !important; height: 100% !important; }
            .tiktok-embed iframe { width: 100vw !important; height: 100vh !important; }
          `}</style>
        </div>
      )}
    </div>
  );
}
