import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import ScramjetFrame from './ScramjetFrame';
import { loadSettings } from '@/lib/settings';

interface ProxyFrameProps {
  url: string;
  proxyResolvedUrl: string | null;
}

const ProxyFrame = ({ url, proxyResolvedUrl }: ProxyFrameProps) => {
  const settings = loadSettings();
  if (settings.useScramjet) return <ScramjetFrame url={url} />;

  const src = proxyResolvedUrl || (url.startsWith('http') ? url : `https://${url}`);
  const ref = useRef<HTMLIFrameElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBlocked(false);
    setLoading(true);

    // If proxy is configured, we trust it bypasses XFO. Hide loader after iframe onLoad fires.
    if (proxyResolvedUrl) return;

    // Detection: if onLoad never fires within timeout, or content is empty, mark blocked.
    const loadFailTimer = setTimeout(() => {
      // Still loading after 8s → likely blocked silently
      if (loading) setBlocked(true);
    }, 8000);

    const contentTimer = setTimeout(() => {
      try {
        const doc = ref.current?.contentDocument;
        if (doc && doc.body && doc.body.children.length === 0 && !doc.title) {
          setBlocked(true);
          setLoading(false);
        }
      } catch {
        // cross-origin = loaded successfully — clear loader
        setLoading(false);
      }
    }, 2500);

    return () => {
      clearTimeout(loadFailTimer);
      clearTimeout(contentTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, proxyResolvedUrl]);

  if (blocked) {
    return (
      <div className="w-full h-full glass-panel flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">This site refuses to load in a frame</h3>
          <p className="text-sm text-muted-foreground">
            The site sent X-Frame-Options / CSP headers that block embedding.
            Set up a proxy in Settings → Proxy, or open the site in a new tab.
          </p>
          <a href={src} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90">
            <ExternalLink className="w-4 h-4" />
            Open in new tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full glass-panel overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/40 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">Loading {new URL(src).hostname}…</p>
        </div>
      )}
      <iframe
        ref={ref}
        src={src}
        onLoad={() => setLoading(false)}
        className="w-full h-full border-none bg-background"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
        referrerPolicy="no-referrer"
        title="Proxy Content"
      />
    </div>
  );
};

export default ProxyFrame;
