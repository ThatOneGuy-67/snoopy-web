import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, CircleDot } from 'lucide-react';
import { getController, testWispReachable } from '@/lib/scramjet';
import ProxyErrorScreen from './ProxyErrorScreen';
import RelayStatus from './RelayStatus';

interface Props {
  url: string;
}

type Status = 'checking' | 'booting' | 'loading' | 'ready' | 'error';

const ScramjetFrame = ({ url }: Props) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);
  const [encoded, setEncoded] = useState<string | null>(null);
  const [bootKey, setBootKey] = useState(0); // bump to retry

  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    setError(null);
    setEncoded(null);

    try { localStorage.setItem('lastFailedUrl', url); } catch {}

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
  }, [url, bootKey]);

  if (status === 'error') {
    return (
      <div className="w-full h-full glass-panel relative">
        <div className="absolute top-2 right-2 z-20"><RelayStatus /></div>
        <ProxyErrorScreen
          url={url}
          errorMessage={error || 'Unknown error'}
          onRetry={() => setBootKey(k => k + 1)}
        />
      </div>
    );
  }

  const StatusBadge = () => {
    const map: Record<Exclude<Status, 'error'>, { label: string; icon: JSX.Element; cls: string }> = {
      checking: { label: 'Testing relay…', icon: <Loader2 className="w-3 h-3 animate-spin" />, cls: 'text-yellow-300' },
      booting:  { label: 'Booting Scramjet…', icon: <Loader2 className="w-3 h-3 animate-spin" />, cls: 'text-yellow-300' },
      loading:  { label: 'Loading page…', icon: <Loader2 className="w-3 h-3 animate-spin" />, cls: 'text-primary' },
      ready:    { label: 'Scramjet on', icon: <CheckCircle2 className="w-3 h-3" />, cls: 'text-emerald-400' },
    };
    const s = map[status as Exclude<Status, 'error'>];
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/70 backdrop-blur-md border border-border/50 text-[11px] font-mono ${s.cls}`}>
        {s.icon}<span>{s.label}</span>
      </div>
    );
  };

  const showOverlay = status === 'checking' || status === 'booting' || status === 'loading';

  return (
    <div className="w-full h-full glass-panel overflow-hidden relative">
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
        <StatusBadge />
        <RelayStatus />
      </div>
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
