import { useEffect, useState } from 'react';
import { X, Activity, RotateCw, Loader2, Check, AlertCircle } from 'lucide-react';
import { AppSettings } from '@/lib/settings';
import { pingWisp, getWispUrl } from '@/lib/scramjet';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
}

interface Diag {
  ping: number | null;
  ua: string;
  storageKB: number;
  storageItems: number;
  viewport: string;
  connection: string;
  online: boolean;
  swReady: boolean;
  themeHue: number;
}

const measureStorage = () => {
  let bytes = 0; let items = 0;
  for (const k in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
      bytes += (localStorage.getItem(k)?.length || 0) + k.length;
      items++;
    }
  }
  return { kb: Math.round(bytes / 102.4) / 10, items };
};

const DiagnosticsModal = ({ open, onClose, settings }: Props) => {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const ping = await pingWisp(settings.wispUrl?.trim() || getWispUrl());
    const s = measureStorage();
    const conn: any = (navigator as any).connection || {};
    const swReady = !!(await navigator.serviceWorker?.getRegistration());
    setDiag({
      ping,
      ua: navigator.userAgent,
      storageKB: s.kb,
      storageItems: s.items,
      viewport: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
      connection: conn.effectiveType ? `${conn.effectiveType} · ${conn.downlink ?? '?'}Mbps` : 'unknown',
      online: navigator.onLine,
      swReady,
      themeHue: settings.accentHue,
    });
    setRunning(false);
  };

  useEffect(() => { if (open) run(); /* eslint-disable-next-line */ }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel w-full max-w-lg max-h-[90vh] flex flex-col relative z-10">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Diagnostics</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-secondary/50"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {!diag ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Probing…</div>
          ) : (
            <>
              <Row label="Engine" value={settings.useScramjet ? 'Scramjet (bundled)' : (settings.proxyUrl ? 'Custom proxy' : 'None')} />
              <Row label="Wisp ping" value={diag.ping === null ? <Bad>offline</Bad> : <Good>{diag.ping}ms</Good>} />
              <Row label="Service worker" value={diag.swReady ? <Good>active</Good> : <Bad>not registered</Bad>} />
              <Row label="Online" value={diag.online ? <Good>yes</Good> : <Bad>no</Bad>} />
              <Row label="Connection" value={diag.connection} />
              <Row label="Search engine" value={settings.searchEngine} />
              <Row label="Cloak" value={settings.autoCloakOnLoad ? 'auto' : 'off'} />
              <Row label="Viewport" value={diag.viewport} />
              <Row label="Theme hue" value={`${diag.themeHue}°`} />
              <Row label="Storage" value={`${diag.storageKB} KB · ${diag.storageItems} items`} />
              <details className="text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">User agent</summary>
                <p className="mt-1 break-all">{diag.ua}</p>
              </details>
            </>
          )}
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <button
            onClick={run}
            disabled={running}
            className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            Re-run
          </button>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground/90 text-right truncate">{value}</span>
  </div>
);
const Good = ({ children }: any) => <span className="text-primary inline-flex items-center gap-1"><Check className="w-3 h-3" />{children}</span>;
const Bad  = ({ children }: any) => <span className="text-destructive inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" />{children}</span>;

export default DiagnosticsModal;
