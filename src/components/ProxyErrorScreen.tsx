import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ExternalLink, RefreshCw, Shield, Globe,
  Clipboard, ChevronDown, ChevronUp, Wrench, Check, Loader2,
} from 'lucide-react';
import {
  testWispReachable, getWispUrl, clearProxyCache, classifyError,
  RELAY_PRESETS, type RetryEvent, type ProxyEndpoint,
} from '@/lib/scramjet';

import { loadSettings, saveSettings, openAboutBlank } from '@/lib/settings';
import CacheStatus from './CacheStatus';

interface Props {
  url: string;
  errorMessage: string;
  onRetry: () => void;
  /** Exact endpoints involved in the failed request, shown to the user. */
  endpoint?: ProxyEndpoint;
}

const ProxyErrorScreen = ({ url, errorMessage, onRetry, endpoint }: Props) => {
  const target = url.startsWith('http') ? url : `https://${url}`;
  const classified = classifyError(errorMessage);


  const [log, setLog] = useState<string[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showDiag, setShowDiag] = useState(false);
  const [copied, setCopied] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [currentRelay, setCurrentRelay] = useState(getWispUrl());
  const cancelRef = useRef(false);

  const push = (s: string) => setLog(l => [...l.slice(-24), `${new Date().toLocaleTimeString()} · ${s}`]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    setLog([]);
    push(`Retrying with relay ${currentRelay}`);
    const r = await testWispReachable(currentRelay, {
      useCache: false,
      retries: 5,
      timeoutMs: 5000,
      onEvent: (e: RetryEvent) => {
        if (e.kind === 'attempt') push(`[${e.attempt}/${e.total}] Testing relay…`);
        else if (e.kind === 'success') push(`Relay reachable${e.pingMs != null ? ` (${e.pingMs}ms)` : ''}. Reloading…`);
        else if (e.kind === 'fail') push(`Attempt ${e.attempt} failed: ${e.message}${e.nextDelayMs ? ` — waiting ${Math.round(e.nextDelayMs/1000)}s` : ''}`);
        else if (e.kind === 'giveup') push(`Gave up: ${e.message}`);
      },
    });
    setRetrying(false);
    if (r.ok) {
      setTimeout(onRetry, 600);
    }
  };

  // Auto-retry loop with visible countdown
  useEffect(() => {
    if (!autoMode) { cancelRef.current = true; setCountdown(0); return; }
    cancelRef.current = false;
    let stop = false;
    (async () => {
      while (!stop && !cancelRef.current) {
        await handleRetry();
        if (stop || cancelRef.current) break;
        for (let i = 15; i > 0; i--) {
          if (stop || cancelRef.current) break;
          setCountdown(i);
          await new Promise(r => setTimeout(r, 1000));
        }
        setCountdown(0);
      }
    })();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode]);

  const handleSwitchRelay = (newUrl: string) => {
    const s = loadSettings();
    saveSettings({ ...s, wispUrl: newUrl });
    setCurrentRelay(newUrl);
    push(`Switched relay to ${newUrl}`);
  };

  const handleRepair = async () => {
    setRepairing(true);
    push('Repairing proxy cache…');
    const r = await clearProxyCache();
    push(`Cleared: ${r.cleared.join(', ') || 'nothing'}`);
    if (r.errors.length) push(`Errors: ${r.errors.join('; ')}`);
    setRepairing(false);
  };

  const debugInfo = () => JSON.stringify({
    target, error: errorMessage, classified,
    relay: currentRelay,
    endpoint,
    ua: navigator.userAgent,
    online: navigator.onLine,
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : null,
    serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    time: new Date().toISOString(),
  }, null, 2);


  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(debugInfo()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="w-full h-full relative overflow-auto">
      {/* animated backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-[hsl(270_70%_60%/0.18)] blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto p-6 md:p-10 space-y-5">
        {/* header card */}
        <div className="glass-panel p-6 md:p-8 space-y-4 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center glow-border">
              <AlertTriangle className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl md:text-2xl font-semibold glow-text">{classified.title}</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-primary/15 text-primary border border-primary/30">{classified.tag}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{classified.hint}</p>
              <p className="text-xs text-muted-foreground/80 font-mono mt-2 truncate" title={target}>→ {target}</p>
            </div>
          </div>

          {/* exact failing endpoints */}
          {endpoint && (
            <dl className="rounded-lg bg-background/40 border border-border/50 p-3 text-[11px] font-mono space-y-1">
              {([
                ['Failing request', endpoint.encoded ? new URL(endpoint.encoded, location.origin).href : endpoint.target],
                ['Wisp relay', endpoint.relay],
                ['Proxy prefix', endpoint.prefix],
                ['Service worker', endpoint.swUrl],
                ['Base path', endpoint.base],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="shrink-0 w-28 text-muted-foreground/70">{k}</dt>
                  <dd className="min-w-0 truncate text-muted-foreground" title={v}>{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <CacheStatus compact />


          {/* live status box */}
          <div className="rounded-lg bg-background/50 border border-border/50 p-3 font-mono text-xs space-y-1 max-h-44 overflow-auto">
            {log.length === 0
              ? <div className="text-muted-foreground">Idle. Hit Retry Connection to start diagnostics.</div>
              : log.map((l, i) => <div key={i} className="text-muted-foreground/90">{l}</div>)}
          </div>

          {/* primary actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-primary-foreground bg-gradient-to-r from-primary to-[hsl(var(--glow-secondary))] hover:scale-[1.03] active:scale-100 transition-transform shadow-[0_0_30px_hsl(var(--glow-primary)/0.45)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {retrying ? 'Retrying…' : 'Retry Connection'}
            </button>

            <button onClick={handleRepair} disabled={repairing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm bg-background/60 border border-border hover:border-primary/50 transition-colors">
              {repairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              Repair Cache
            </button>

            <a href={target} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm bg-background/60 border border-border hover:border-primary/50 transition-colors">
              <ExternalLink className="w-4 h-4" /> Open in new tab
            </a>

            <button onClick={() => openAboutBlank(target)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm bg-background/60 border border-border hover:border-primary/50 transition-colors">
              <Shield className="w-4 h-4" /> Stealth Mode
            </button>

            <button onClick={handleCopy}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm bg-background/60 border border-border hover:border-primary/50 transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy debug'}
            </button>
          </div>

          {/* auto + relay switcher */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={autoMode} onChange={e => setAutoMode(e.target.checked)} className="accent-[hsl(var(--primary))]" />
              Auto-retry every 15s
              {autoMode && countdown > 0 && <span className="font-mono text-primary">· next in {countdown}s</span>}
            </label>

            <div className="flex items-center gap-2 ml-auto">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={currentRelay}
                onChange={e => handleSwitchRelay(e.target.value)}
                className="bg-background/60 border border-border rounded-md text-xs px-2 py-1.5 focus:outline-none focus:border-primary/60"
              >
                {RELAY_PRESETS.map(r => (
                  <option key={r.url} value={r.url}>{r.name}</option>
                ))}
                {!RELAY_PRESETS.find(r => r.url === currentRelay) && (
                  <option value={currentRelay}>Custom: {currentRelay}</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* diagnostics */}
        <button
          onClick={() => setShowDiag(s => !s)}
          className="w-full glass-panel px-5 py-3 flex items-center justify-between text-sm hover:border-primary/40 transition-colors"
        >
          <span className="font-medium">Proxy diagnostics</span>
          {showDiag ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDiag && (
          <pre className="glass-panel p-4 text-[11px] font-mono overflow-auto text-muted-foreground animate-fade-in">
{debugInfo()}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ProxyErrorScreen;
