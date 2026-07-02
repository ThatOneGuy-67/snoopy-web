import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { perfStart } from '@/lib/perf';

/**
 * Wallpaper
 * ---------
 * Renders the background wallpaper (image, GIF, or video) beneath the app.
 *
 * Design goals:
 *   1. Use a real DOM <img>/<video> element (not a canvas) so animated GIFs
 *      actually play — canvas `drawImage(img)` only ever paints the first
 *      frame of an animated GIF, which caused the "frozen GIF" bug.
 *   2. Show a loading indicator until the media reports it can render.
 *   3. On failure, toast the user and swap to a known-good fallback URL
 *      instead of leaving the screen blank.
 *   4. Guarantee a single active media element per render — keying on the URL
 *      forces React to unmount the previous one, preventing overlap/leaks.
 *   5. Scale with `object-fit: cover` so nothing distorts.
 *
 * Performance:
 *   - Only videos participate in the FPS cap (via a throttled canvas). GIFs
 *     always render natively so their animation timing is preserved.
 *   - `visibilitychange` pauses the underlying <video> when the tab is
 *     hidden, so background wallpapers cost nothing when unfocused.
 *   - Images are decoded off the main thread with `decoding="async"`.
 */

export interface WallpaperProps {
  /** URL of the wallpaper to display. Empty string = render nothing. */
  url: string;
  /** 0–100 darkening overlay strength. */
  dim: number;
  /** Fallback URL used when `url` fails to load. */
  fallbackUrl?: string;
  /** Called once when the wallpaper fails and we've switched to fallback. */
  onFailover?: (failedUrl: string, fallbackUrl: string) => void;
  /** Pause rendering + video playback when the tab is hidden. */
  pauseWhenHidden?: boolean;
  /** Frame-rate cap. Only applied to <video> sources; images/GIFs render natively. */
  fps?: 'auto' | '15' | '30' | '60';
}

const FPS_MAP: Record<string, number> = { auto: 0, '15': 15, '30': 30, '60': 60 };

function isVideoUrl(u: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u);
}

export function Wallpaper({
  url,
  dim,
  fallbackUrl = '',
  onFailover,
  pauseWhenHidden = true,
  fps = 'auto',
}: WallpaperProps) {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [activeUrl, setActiveUrl] = useState(url);
  const triedFallback = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfEnd = useRef<((p?: Record<string, unknown>) => number) | null>(null);

  const isVideo = useMemo(() => isVideoUrl(activeUrl), [activeUrl]);
  const fpsCap = FPS_MAP[fps] ?? 0;
  // Canvas-throttled path only for capped video. Native <img>/<video> otherwise.
  const useThrottledCanvas = isVideo && fpsCap > 0;

  // Reset transient state whenever the target URL changes.
  useEffect(() => {
    triedFallback.current = false;
    setErrored(false);
    setLoading(true);
    setActiveUrl(url);
    perfEnd.current = perfStart(`wallpaper.load ${isVideoUrl(url) ? 'video' : 'image'}`);
  }, [url]);

  // Pause / resume the underlying <video> in step with visibility.
  useEffect(() => {
    if (!isVideo) return;
    const v = videoRef.current;
    if (!v) return;
    const onVis = () => {
      if (pauseWhenHidden && document.hidden) v.pause();
      else v.play().catch(() => {}); // autoplay rejections are non-fatal
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isVideo, pauseWhenHidden, activeUrl]);

  // Throttled canvas render loop — only when the user asked to cap FPS on a video.
  useEffect(() => {
    if (!useThrottledCanvas) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const interval = 1000 / fpsCap;
    let raf = 0;
    let lastDraw = 0;
    let stopped = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    };

    const draw = () => {
      resize();
      const sw = video.videoWidth;
      const sh = video.videoHeight;
      if (!sw || !sh) return;
      const scale = Math.max(canvas.width / sw, canvas.height / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      try {
        ctx.drawImage(video, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      } catch {
        // decode may briefly fail; next tick retries.
      }
    };

    const loop = (t: number) => {
      if (stopped) return;
      if (pauseWhenHidden && document.hidden) {
        // Skip drawing while hidden; resume on visibility change.
        raf = requestAnimationFrame(loop);
        return;
      }
      if (t - lastDraw >= interval) {
        draw();
        lastDraw = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [useThrottledCanvas, fpsCap, pauseWhenHidden, activeUrl]);

  if (!activeUrl) return null;

  const handleError = () => {
    perfEnd.current?.({ url: activeUrl, ok: false });
    perfEnd.current = null;
    if (!triedFallback.current && fallbackUrl && fallbackUrl !== activeUrl) {
      triedFallback.current = true;
      toast({
        title: 'Wallpaper failed to load',
        description: 'Falling back to the default wallpaper.',
      });
      onFailover?.(activeUrl, fallbackUrl);
      setLoading(true);
      setErrored(false);
      setActiveUrl(fallbackUrl);
      return;
    }
    setLoading(false);
    setErrored(true);
  };

  const handleReady = () => {
    perfEnd.current?.({ url: activeUrl, ok: true });
    perfEnd.current = null;
    setLoading(false);
    setErrored(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
        {isVideo ? (
          <>
            <video
              key={activeUrl}
              ref={videoRef}
              src={activeUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onCanPlay={handleReady}
              onError={handleError}
              className={
                useThrottledCanvas
                  ? 'absolute top-0 left-0 w-px h-px opacity-0 pointer-events-none'
                  : 'absolute inset-0 w-full h-full object-cover transition-opacity duration-500'
              }
              style={useThrottledCanvas ? undefined : { opacity: loading || errored ? 0 : 1 }}
              aria-hidden="true"
            />
            {useThrottledCanvas && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full transition-opacity duration-500"
                style={{ opacity: loading || errored ? 0 : 1 }}
              />
            )}
          </>
        ) : (
          <img
            key={activeUrl}
            src={activeUrl}
            alt=""
            onLoad={handleReady}
            onError={handleError}
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: loading || errored ? 0 : 1 }}
            aria-hidden="true"
          />
        )}

        {loading && !errored && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin opacity-70" />
          </div>
        )}

        {errored && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-panel px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ImageOff className="w-4 h-4 text-destructive" />
              Couldn't load wallpaper.
            </div>
          </div>
        )}
      </div>

      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `hsl(var(--background) / ${Math.max(0, Math.min(95, dim)) / 100})`,
        }}
      />
    </>
  );
}
