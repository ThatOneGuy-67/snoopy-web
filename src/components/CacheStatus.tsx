import { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { readServiceWorkerCacheStatus, type ServiceWorkerCacheStatus } from '@/lib/cacheStatus';

const CacheStatus = ({ compact = false }: { compact?: boolean }) => {
  const [status, setStatus] = useState<ServiceWorkerCacheStatus | null>(null);

  const refresh = useCallback(() => {
    void readServiceWorkerCacheStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refresh();
    const onControllerChange = () => refresh();
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
  }, [refresh]);

  const values = [
    ['games.json', status?.catalog ?? 0],
    ['covers', status?.covers ?? 0],
    ['HTML', status?.html ?? 0],
  ] as const;

  return (
    <section className={`border border-border/60 bg-background/40 ${compact ? 'rounded-lg p-3' : 'glass-panel p-4'}`} aria-label="Offline cache status">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-mono text-foreground">service-worker cache</h2>
        <span className={`ml-auto w-2 h-2 rounded-full ${status?.controlled ? 'bg-emerald-400' : 'bg-yellow-300'}`} title={status?.controlled ? 'Service worker active' : 'Service worker not controlling this page'} />
        <button type="button" onClick={refresh} aria-label="Refresh cache status" title="Refresh cache status" className="p-1 text-muted-foreground hover:text-primary transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {values.map(([label, count]) => (
          <div key={label} className="rounded-md border border-border/50 bg-foreground/5 px-2 py-2 text-center">
            <div className="text-base font-semibold text-foreground">{count}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] font-mono text-muted-foreground">
        {!status?.supported
          ? 'Cache Storage unavailable'
          : !status.controlled
            ? 'Reload once to activate offline caching'
            : status.covers === 0
              ? 'Covers are generated locally; no image files are required.'
              : `${status.total} cached asset${status.total === 1 ? '' : 's'} in ${status.cacheName}`}
      </p>
    </section>
  );
};

export default CacheStatus;