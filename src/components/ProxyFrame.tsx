import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface ProxyFrameProps {
  url: string;
  proxyResolvedUrl: string | null; // url piped through proxy, or null if no proxy configured
}

const ProxyFrame = ({ url, proxyResolvedUrl }: ProxyFrameProps) => {
  const src = proxyResolvedUrl || (url.startsWith('http') ? url : `https://${url}`);
  const ref = useRef<HTMLIFrameElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setBlocked(false);
    if (proxyResolvedUrl) return; // proxy bypasses x-frame-options
    // Detect blocked iframes — most sites that block via X-Frame-Options leave a blank
    // about:blank document. We check after a short delay.
    const t = setTimeout(() => {
      try {
        const doc = ref.current?.contentDocument;
        if (doc && doc.body && doc.body.children.length === 0 && !doc.title) {
          setBlocked(true);
        }
      } catch {
        // cross-origin = loaded successfully
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [src, proxyResolvedUrl]);

  if (blocked) {
    return (
      <div className="w-full h-full glass-panel flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">This site refuses to load in a frame</h3>
          <p className="text-sm text-muted-foreground">
            Most major sites (Google, YouTube, social media) block iframe embedding.
            Set up a proxy server in Settings → Proxy, or open the site in a new tab.
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
    <div className="w-full h-full glass-panel overflow-hidden">
      <iframe
        ref={ref}
        src={src}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
        referrerPolicy="no-referrer"
        title="Proxy Content"
      />
    </div>
  );
};

export default ProxyFrame;
