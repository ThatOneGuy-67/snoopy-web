import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, CheckCircle2, CircleDot } from 'lucide-react';
import { getController, testWispReachable } from '@/lib/scramjet';

interface Props {
  url: string;
}

type Status = 'checking' | 'booting' | 'loading' | 'ready' | 'error';

const ScramjetFrame = ({ url }: Props) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);
  const [encoded, setEncoded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    setError(null);
    setEncoded(null);

    (async () => {
      try {
        const wisp = await testWispReachable();
        if (cancelled) return;
        if (!wisp.ok) throw new Error(`Wisp relay unreachable: ${wisp.message}`);

        setStatus('booting');
        const controller = await getController();
        if (cancelled) return;

        const target = url.startsWith('http') ? url : `https://${url}`;
        const enc = controller.encodeUrl(target);
        if (cancelled) return;
        setEncoded(enc);
        setStatus('loading');
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to initialise proxy');
          setStatus('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  const StatusBadge = () => {
    const map: Record<Status, { label: string; icon: JSX.Element; cls: string }> = {
      checking: { label: 'Testing relay…', icon: <Loader2 className="w-3 h-3 animate-spin" />, cls: 'text-yellow-300' },
      booting:  { label: 'Booting Scramjet…', icon: <Loader2 className="w-3 h-3 animate-spin" />, cls: 'text-yellow-300' },
      loading:  { label: 'Loading page…', icon: <Loader2 className="w-3 h-3 animate-spin" />, cls: 'text-primary' },
      ready:    { label: 'Scramjet on', icon: <CheckCircle2 className="w-3 h-3" />, cls: 'text-emerald-400' },
      error:    { label: 'Scramjet error', icon: <CircleDot className="w-3 h-3" />, cls: 'text-red-400' },
    };
    const s = map[status];
    return (
      <div className={`absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/70 backdrop-blur-md border border-border/50 text-[11px] font-mono ${s.cls}`}>
        {s.icon}<span>{s.label}</span>
      </div>
    );
  };

  if (status === 'error') {
    return (
      <div className="w-full h-full glass-panel flex items-center justify-center p-8 relative">
        <StatusBadge />
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">Proxy failed to start</h3>
          <p className="text-sm text-muted-foreground font-mono break-words">{error}</p>
          <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90">
            <ExternalLink className="w-4 h-4" /> Open in new tab
          </a>
        </div>
      </div>
    );
  }

  const showOverlay = status === 'checking' || status === 'booting' || status === 'loading';

  return (
    <div className="w-full h-full glass-panel overflow-hidden relative">
      <StatusBadge />
      {showOverlay && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/40 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">
            {status === 'checking' && 'Testing Wisp relay…'}
            {status === 'booting' && 'Booting Scramjet proxy…'}
            {status === 'loading' && 'Loading page…'}
          </p>
        </div>
      )}
      {encoded && (
        <iframe
          ref={ref}
          src={encoded}
          onLoad={() => setStatus('ready')}
          className="w-full h-full border-none bg-background"
          title="Proxy Content"
        />
      )}
    </div>
  );
};

export default ScramjetFrame;
