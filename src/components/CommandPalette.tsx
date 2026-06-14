import { useEffect, useMemo, useState } from 'react';
import { Command, Search, AppWindow, Bookmark, History, Settings, ArrowRight, Globe } from 'lucide-react';
import { APPS } from '@/lib/apps';
import type { Bookmark as BM, HistoryEntry } from '@/lib/browserData';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  bookmarks: BM[];
  history: HistoryEntry[];
  onOpenUrl: (url: string, title?: string) => void;
  onSearch: (q: string) => void;
  onOpenSettings: () => void;
  onSelectView: (v: 'home' | 'apps' | 'bookmarks' | 'history') => void;
}

type Result = {
  id: string;
  label: string;
  sub?: string;
  group: string;
  icon: typeof Command;
  run: () => void;
};

const CommandPalette = ({ open, onClose, bookmarks, history, onOpenUrl, onSearch, onOpenSettings, onSelectView }: CommandPaletteProps) => {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  useEffect(() => { if (open) { setQ(''); setIdx(0); } }, [open]);

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    const all: Result[] = [];

    // Commands
    const cmds: Result[] = [
      { id: 'cmd-home',    label: 'Go: Home',       group: 'Commands', icon: AppWindow, run: () => onSelectView('home') },
      { id: 'cmd-apps',    label: 'Go: Apps',       group: 'Commands', icon: AppWindow, run: () => onSelectView('apps') },
      { id: 'cmd-bm',      label: 'Go: Bookmarks',  group: 'Commands', icon: Bookmark,  run: () => onSelectView('bookmarks') },
      { id: 'cmd-hist',    label: 'Go: History',    group: 'Commands', icon: History,   run: () => onSelectView('history') },
      { id: 'cmd-set',     label: 'Open Settings',  group: 'Commands', icon: Settings,  run: onOpenSettings },
    ];
    all.push(...cmds);

    APPS.forEach(a => all.push({
      id: `app-${a.id}`, label: a.name, sub: a.category, group: 'Apps',
      icon: a.icon as any, run: () => onOpenUrl(a.url, a.name),
    }));
    bookmarks.forEach(b => all.push({
      id: `bm-${b.id}`, label: b.title, sub: b.url, group: 'Bookmarks',
      icon: Bookmark, run: () => onOpenUrl(b.url, b.title),
    }));
    history.slice(0, 50).forEach((h, i) => all.push({
      id: `h-${i}-${h.url}`, label: h.title || h.url, sub: h.url, group: 'History',
      icon: History, run: () => onOpenUrl(h.url, h.title),
    }));

    let filtered = query
      ? all.filter(r => r.label.toLowerCase().includes(query) || r.sub?.toLowerCase().includes(query))
      : all.slice(0, 30);

    // Always offer "search the web" when there's a query
    if (query) {
      filtered = [
        { id: 'search-web', label: `Search the web for "${q}"`, group: 'Search', icon: Search, run: () => onSearch(q) },
        { id: 'open-url',   label: `Open URL: ${q}`,            group: 'Search', icon: Globe,  run: () => onOpenUrl(q.startsWith('http') ? q : `https://${q}`) },
        ...filtered,
      ];
    }
    return filtered.slice(0, 40);
  }, [q, bookmarks, history, onOpenUrl, onSearch, onOpenSettings, onSelectView]);

  useEffect(() => { setIdx(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter')     {
        e.preventDefault();
        const r = results[idx];
        if (r) { r.run(); onClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, idx, onClose]);

  if (!open) return null;

  // group results
  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-xl glass-panel !rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_60px_hsl(var(--glow-primary)/0.25)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <Command className="w-4 h-4 text-primary" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search tabs, bookmarks, apps, commands…"
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto py-1">
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No results</div>
          )}
          {results.map((r, i) => {
            const Icon = r.icon as any;
            const showGroup = r.group !== lastGroup;
            lastGroup = r.group;
            const active = i === idx;
            return (
              <div key={r.id}>
                {showGroup && <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{r.group}</div>}
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => { r.run(); onClose(); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors
                    ${active ? 'bg-primary/15 text-foreground' : 'text-foreground/85 hover:bg-secondary/40'}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="truncate flex-1">{r.label}</span>
                  {r.sub && <span className="text-xs text-muted-foreground truncate max-w-[40%]">{r.sub}</span>}
                  {active && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
