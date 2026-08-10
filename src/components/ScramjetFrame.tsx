import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  getController, findWorkingRelay, checkEnvironment, getWispUrl,
  describeEndpoint, type ProxyEndpoint,
} from '@/lib/scramjet';
import { loadSettings, saveSettings } from '@/lib/settings';
import { perfStart } from '@/lib/perf';
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
  const [endpoint, setEndpoint] = useState<ProxyEndpoint>(() => describeEndpoint(url));
  const [bootKey, setBootKey] = useState(0); // bump to retry

  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    setError(null);
    setEncoded(null);
    setEndpoint(describeEndpoint(url));

    const done = perfStart(`proxy.navigate ${url}`);
    try { localStorage.setItem('lastFailedUrl', url); } catch {
      // Storage may be blocked (private mode); non-fatal.
    }

    (async () => {
      try {
        const env = checkEnvironment();
        if (!env.ok) throw new Error(env.message);

        const relay = await findWorkingRelay();
        if (cancelled) return;
        if (!relay.ok) {
          throw new Error(`Wisp relay unreachable: ${relay.message} (tried ${relay.tried.join(', ')})`);
        }
        // A failover relay becomes the new default so the whole app follows it.
        if (relay.url !== getWispUrl()) {
          const s = loadSettings();
          saveSettings({ ...s, wispUrl: relay.url });
        }
        setEndpoint(describeEndpoint(url, relay.url));

        setStatus('booting');
        const controller = await getController();
        if (cancelled) return;

        const target = url.startsWith('http') ? url : `https://${url}`;
        const enc = controller.encodeUrl(target);
        if (cancelled) return;
        setEncoded(enc);
        setEndpoint(describeEndpoint(url, relay.url, enc));
        setStatus('loading');
        done({ url, wispPingMs: relay.pingMs });
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e ?? 'Failed to initialise proxy');
          setError(msg);
          setStatus('error');
          done({ url, ok: false, error: msg });
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
          endpoint={endpoint}
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
          onLoad={() => {
            // Detect Scramjet's built-in error page and surface our recovery UI
            try {
              const doc = ref.current?.contentDocument;
              if (doc) {
                const txt = (doc.body?.innerText || '').slice(0, 2000);
                const title = (doc.title || '').toLowerCase();
                const looksLikeScramjetError =
                  /uh oh!/i.test(txt) &&
                  /updating scramjet|wisp|verify the server|administrator/i.test(txt);
                if (looksLikeScramjetError || title.includes('error')) {
                  // Try to extract a more specific message
                  const m = txt.match(/There was an error loading[^\n]*/i);
                  setError(m ? m[0] : 'Scramjet failed to load the page');
                  setStatus('error');
                  return;
                }
              }
            } catch {
              // cross-origin (shouldn't happen via SW) — ignore
            }
            setStatus('ready');
          }}
          className="w-full h-full border-none bg-background"
          title="Proxy Content"
        />
      )}

    </div>
  );
};

export default ScramjetFrame;
