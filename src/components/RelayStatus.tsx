import { useEffect, useState } from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { pingWisp, getWispUrl } from '@/lib/scramjet';

interface Props {
  intervalMs?: number;
  className?: string;
}

const RelayStatus = ({ intervalMs = 15000, className = '' }: Props) => {
  const [ping, setPing] = useState<number | null | undefined>(undefined); // undefined=loading

  useEffect(() => {
    let cancelled = false;
    let timer: any;

    const tick = async () => {
      const p = await pingWisp(getWispUrl());
      if (cancelled) return;
      setPing(p);
      timer = setTimeout(tick, intervalMs);
    };
    tick();

    const onOnline = () => tick();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [intervalMs]);

  let dot = 'bg-yellow-400';
  let label = 'Pinging relay…';
  let Icon: any = Loader2;
  let iconCls = 'animate-spin';

  if (ping === null) { dot = 'bg-red-500'; label = 'Relay offline'; Icon = WifiOff; iconCls = ''; }
  else if (typeof ping === 'number') {
    Icon = Wifi; iconCls = '';
    if (ping < 120) { dot = 'bg-emerald-400'; label = `Relay online · ${ping}ms`; }
    else if (ping < 300) { dot = 'bg-yellow-400'; label = `Slow · ${ping}ms`; }
    else { dot = 'bg-orange-400'; label = `Laggy · ${ping}ms`; }
  }

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md bg-background/70 backdrop-blur-md border border-border/50 text-[11px] font-mono ${className}`}>
      <span className={`w-2 h-2 rounded-full ${dot} ${ping === undefined ? 'animate-pulse' : ''}`} />
      <Icon className={`w-3 h-3 opacity-80 ${iconCls}`} />
      <span className="opacity-90">{label}</span>
    </div>
  );
};

export default RelayStatus;
