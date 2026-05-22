import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { getController } from '@/lib/scramjet';

interface Props {
  url: string;
}

const ScramjetFrame = ({ url }: Props) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [encoded, setEncoded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEncoded(null);

    (async () => {
      try {
        const controller = await getController();
        const target = url.startsWith('http') ? url : `https://${url}`;
        const enc = controller.encodeUrl(target);
        if (!cancelled) setEncoded(enc);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to initialise proxy');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return (
      <div className="w-full h-full glass-panel flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">Proxy failed to start</h3>
          <p className="text-sm text-muted-foreground font-mono">{error}</p>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90">
            <ExternalLink className="w-4 h-4" /> Open in new tab
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
          <p className="text-sm text-muted-foreground font-mono">Booting proxy…</p>
        </div>
      )}
      {encoded && (
        <iframe
          ref={ref}
          src={encoded}
          onLoad={() => setLoading(false)}
          className="w-full h-full border-none bg-background"
          title="Proxy Content"
        />
      )}
    </div>
  );
};

export default ScramjetFrame;
