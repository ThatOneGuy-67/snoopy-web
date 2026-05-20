import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, Lock } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';

interface Props {
  url: string;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  canBack: boolean;
  canForward: boolean;
}

const BrowserChrome = ({ url, onNavigate, onBack, onForward, onReload, canBack, canForward }: Props) => {
  const [value, setValue] = useState(url);

  const submit = () => {
    let v = value.trim();
    if (!v) return;
    if (!v.includes('://') && v.includes('.') && !v.includes(' ')) v = `https://${v}`;
    onNavigate(v);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <div className="glass-panel p-2 flex items-center gap-2">
      <button onClick={onBack} disabled={!canBack}
        className="p-2 rounded-lg hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button onClick={onForward} disabled={!canForward}
        className="p-2 rounded-lg hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed">
        <ArrowRight className="w-4 h-4" />
      </button>
      <button onClick={onReload} className="p-2 rounded-lg hover:bg-secondary/50">
        <RotateCw className="w-4 h-4" />
      </button>
      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input border border-border focus-within:border-primary">
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={e => e.currentTarget.select()}
          onKeyDown={handleKey}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="p-2 rounded-lg hover:bg-secondary/50" title="Open in new tab">
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
};

export default BrowserChrome;
