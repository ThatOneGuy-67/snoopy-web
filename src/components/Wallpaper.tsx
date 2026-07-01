import { useEffect, useRef, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * Wallpaper
 * ---------
 * Renders the background wallpaper (image, GIF, or video) beneath the app.
 *
 * Design goals — driven by the recurring "blank background" bug:
 *   1. Use a real DOM <img>/<video> element (not a CSS background-image) so we
 *      can attach `onError` and fall back gracefully.
 *   2. Show a loading indicator until the media reports it can render.
 *   3. On failure, toast the user and swap to a known-good fallback URL
 *      instead of leaving the screen blank.
 *   4. Guarantee a single active media element per render — keying on the URL
 *      forces React to unmount the previous one, preventing overlap/leaks.
 *   5. Scale with `object-fit: cover` so nothing distorts.
 *
 * This component is presentation-only; it never mutates user settings.
 * The parent decides which URL to pass; we only report failure back so the
 * parent can (optionally) revert its stored preference.
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
}

// Best-effort detection of a video source. GIF/APNG/WebP animated all render
// fine as <img>, so we only branch to <video> for true video containers.
function isVideoUrl(u: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u);
}

export function Wallpaper({ url, dim, fallbackUrl = '', onFailover }: WallpaperProps) {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [activeUrl, setActiveUrl] = useState(url);
  const triedFallback = useRef(false);

  // Reset transient state whenever the target URL changes.
  useEffect(() => {
    triedFallback.current = false;
    setErrored(false);
    setLoading(true);
    setActiveUrl(url);
  }, [url]);

  if (!activeUrl) return null;

  const handleError = () => {
    // Try the fallback exactly once, otherwise surface the error state.
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
    setLoading(false);
    setErrored(false);
  };

  const video = isVideoUrl(activeUrl);

  return (
    <>
      {/* Media layer. `key` forces a fresh element on URL change, which
          prevents overlapping instances and stale event handlers. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
        {video ? (
          <video
            key={activeUrl}
            src={activeUrl}
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={handleReady}
            onError={handleError}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: loading || errored ? 0 : 1 }}
          />
        ) : (
          <img
            key={activeUrl}
            src={activeUrl}
            alt=""
            onLoad={handleReady}
            onError={handleError}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: loading || errored ? 0 : 1 }}
          />
        )}

        {/* Loading spinner */}
        {loading && !errored && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin opacity-70" />
          </div>
        )}

        {/* Terminal error card — only shows if even the fallback failed. */}
        {errored && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-panel px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ImageOff className="w-4 h-4 text-destructive" />
              Couldn't load wallpaper.
            </div>
          </div>
        )}
      </div>

      {/* Dim overlay — kept above the media, below app content. */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: `hsl(var(--background) / ${Math.max(0, Math.min(95, dim)) / 100})` }}
      />
    </>
  );
}
