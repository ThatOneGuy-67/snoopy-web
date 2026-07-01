import { useEffect, useRef, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * Wallpaper
 * ---------
 * Renders the background wallpaper (image, GIF, or video) beneath the app.
 *
 * Design goals:
 *   1. Use a real DOM <img>/<video> element (not a CSS background-image) so we
 *      can attach `onError` and fall back gracefully.
 *   2. Show a loading indicator until the media reports it can render.
 *   3. On failure, toast the user and swap to a known-good fallback URL
 *      instead of leaving the screen blank.
 *   4. Guarantee a single active media element per render — keying on the URL
 *      forces React to unmount the previous one, preventing overlap/leaks.
 *   5. Scale with `object-fit: cover` so nothing distorts.
 *
 * Performance:
 *   The source <img>/<video> is kept off-screen (1x1, opacity 0) and its
 *   current frame is composited onto a full-viewport <canvas> via a
 *   requestAnimationFrame loop. This lets us:
 *     - Cap the animation frame rate (Auto / 15 / 30 / 60).
 *     - Halt the render loop and .pause() the <video> when the tab is hidden.
 *   Draw resolution is capped at devicePixelRatio 1.25 to avoid burning GPU
 *   on high-DPR screens without a visible quality drop.
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
  /** Frame-rate cap for the render loop. */
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
  const [ready, setReady] = useState(false);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' ? document.hidden : false,
  );
  const triedFallback = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset transient state whenever the target URL changes.
  useEffect(() => {
    triedFallback.current = false;
    setErrored(false);
    setLoading(true);
    setReady(false);
    setActiveUrl(url);
  }, [url]);

  // Track document visibility only when the caller opts in.
  useEffect(() => {
    if (!pauseWhenHidden) {
      setTabHidden(false);
      return;
    }
    const onVis = () => setTabHidden(document.hidden);
    setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pauseWhenHidden]);

  // Pause / resume the underlying <video> element in step with visibility.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (tabHidden) {
      v.pause();
    } else {
      // play() can reject if autoplay policies change; safe to swallow.
      v.play().catch(() => {});
    }
  }, [tabHidden, activeUrl]);

  const isVideo = isVideoUrl(activeUrl);

  // Canvas render loop — throttled to the selected FPS, halted when hidden.
  useEffect(() => {
    if (!ready || !activeUrl) return;
    const canvas = canvasRef.current;
    const source: HTMLImageElement | HTMLVideoElement | null = isVideo
      ? videoRef.current
      : imgRef.current;
    if (!canvas || !source) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const target = FPS_MAP[fps] ?? 0;
    const interval = target > 0 ? 1000 / target : 0;
    let raf = 0;
    let lastDraw = 0;

    const resize = () => {
      // Cap DPR to keep GPU usage sane on Retina without a visible quality loss.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    };

    const draw = () => {
      resize();
      const sw =
        (source as HTMLImageElement).naturalWidth ||
        (source as HTMLVideoElement).videoWidth ||
        0;
      const sh =
        (source as HTMLImageElement).naturalHeight ||
        (source as HTMLVideoElement).videoHeight ||
        0;
      if (!sw || !sh) return;
      // object-fit: cover
      const scale = Math.max(canvas.width / sw, canvas.height / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      try {
        ctx.drawImage(source, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      } catch {
        // Transient decode failures are non-fatal; the next tick retries.
      }
    };

    // First paint so the wallpaper is visible immediately, even before the
    // rAF loop schedules its first frame.
    draw();

    if (tabHidden) {
      // Skip scheduling entirely — we only redraw when the tab returns.
      return;
    }

    const loop = (t: number) => {
      if (!interval || t - lastDraw >= interval) {
        draw();
        lastDraw = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [ready, activeUrl, isVideo, fps, tabHidden]);

  if (!activeUrl) return null;

  const handleError = () => {
    if (!triedFallback.current && fallbackUrl && fallbackUrl !== activeUrl) {
      triedFallback.current = true;
      toast({
        title: 'Wallpaper failed to load',
        description: 'Falling back to the default wallpaper.',
      });
      onFailover?.(activeUrl, fallbackUrl);
      setReady(false);
      setLoading(true);
      setErrored(false);
      setActiveUrl(fallbackUrl);
      return;
    }
    setLoading(false);
    setErrored(true);
  };

  const handleReady = () => {
    setLoading(false);
    setErrored(false);
    setReady(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full transition-opacity duration-500"
          style={{ opacity: loading || errored ? 0 : 1 }}
        />

        {/* Hidden media source that drives the canvas. Keyed on URL so React
            fully unmounts the previous element and its event handlers. */}
        {isVideo ? (
          <video
            key={activeUrl}
            ref={videoRef}
            src={activeUrl}
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={handleReady}
            onError={handleError}
            className="absolute top-0 left-0 w-px h-px opacity-0 pointer-events-none"
            aria-hidden="true"
          />
        ) : (
          <img
            key={activeUrl}
            ref={imgRef}
            src={activeUrl}
            alt=""
            onLoad={handleReady}
            onError={handleError}
            className="absolute top-0 left-0 w-px h-px opacity-0 pointer-events-none"
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
