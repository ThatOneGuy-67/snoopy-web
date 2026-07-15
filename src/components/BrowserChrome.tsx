import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, Lock, Maximize2, Minimize2, Home, X } from 'lucide-react';
import { useState, KeyboardEvent, useEffect } from 'react';

interface Props {
  url: string;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome?: () => void;
  onCloseTab?: () => void;
  canBack: boolean;
  canForward: boolean;
  fullscreenTargetId?: string;
}

const BrowserChrome = ({
  url, onNavigate, onBack, onForward, onReload, onHome, onCloseTab,
  canBack, canForward, fullscreenTargetId,
}: Props) => {
  const [value, setValue] = useState(url);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => setValue(url), [url]);

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const submit = () => {
    let v = value.trim();
    if (!v) return;
    if (!v.includes('://') && v.includes('.') && !v.includes(' ')) v = `https://${v}`;
    onNavigate(v);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  const toggleFs = async () => {
    const el = fullscreenTargetId ? document.getElementById(fullscreenTargetId) : document.documentElement;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  };

  const Btn = ({ onClick, disabled, title, children }: any) => (
    <button onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className="p-2 rounded-lg hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      {children}
    </button>
  );

  return (
    <div className="glass-panel p-2 flex items-center gap-1 flex-wrap">
      <Btn onClick={onBack} disabled={!canBack} title="Back"><ArrowLeft className="w-4 h-4" /></Btn>
      <Btn onClick={onForward} disabled={!canForward} title="Forward"><ArrowRight className="w-4 h-4" /></Btn>
      <Btn onClick={onReload} title="Reload"><RotateCw className="w-4 h-4" /></Btn>
      {onHome && <Btn onClick={onHome} title="Home"><Home className="w-4 h-4" /></Btn>}

      <div className="flex-1 min-w-[150px] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input border border-border focus-within:border-primary">
        <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={e => e.currentTarget.select()}
          onKeyDown={handleKey}
          aria-label="Address bar"
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
        />
      </div>

      <Btn onClick={toggleFs} title={isFs ? 'Exit fullscreen' : 'Fullscreen'}>
        {isFs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </Btn>
      <a href={url} target="_blank" rel="noopener noreferrer"
        aria-label="Open in new tab"
        className="p-2 rounded-lg hover:bg-secondary/50" title="Open in new tab">
        <ExternalLink className="w-4 h-4" />
      </a>
      {onCloseTab && (
        <Btn onClick={onCloseTab} title="Close tab"><X className="w-4 h-4" /></Btn>
      )}
    </div>
  );
};

export default BrowserChrome;
