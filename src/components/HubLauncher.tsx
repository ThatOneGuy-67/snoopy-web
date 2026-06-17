import { Layers } from 'lucide-react';
import SearchBar from './SearchBar';
import { getApp } from '@/lib/apps';

interface Props {
  pinnedIds: string[];
  onSearch: (q: string) => void;
  onOpen: (url: string, title?: string) => void;
  onOpenApps: () => void;
}

const HubLauncher = ({ pinnedIds, onSearch, onOpen, onOpenApps }: Props) => {
  const pinned = pinnedIds.map(getApp).filter(Boolean) as ReturnType<typeof getApp>[];
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 pt-10 pb-20">
      <div className="flex items-center gap-3 mb-3">
        <Layers className="w-10 h-10 text-primary" />
        <h1 className="text-5xl md:text-6xl font-bold glow-text tracking-tight">Snoopy's Web</h1>
      </div>
      <p className="text-muted-foreground text-sm font-mono mb-8">// your personal web hub</p>

      <div className="w-full max-w-2xl">
        <SearchBar onSearch={onSearch} />
      </div>

      <div className="mt-10 w-full max-w-3xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Quick Launch</h2>
          <button onClick={onOpenApps} className="text-xs text-primary hover:underline">All apps →</button>
        </div>

        {pinned.length === 0 ? (
          <button onClick={onOpenApps} className="w-full py-10 text-sm text-muted-foreground hover:text-primary border border-dashed border-border/60 rounded-xl">
            Pin apps to see them here
          </button>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {pinned.map(app => {
              const Icon = app!.icon;
              return (
                <button
                  key={app!.id}
                  onClick={() => onOpen(app!.url, app!.name)}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary/30 transition-all"
                  title={app!.name}
                >
                  <div
                    className="p-3 rounded-2xl transition-transform group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${app!.color}35, ${app!.color}10)`,
                      boxShadow: `0 0 18px ${app!.color}30, inset 0 1px 0 ${app!.color}40`,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: app!.color }} />
                  </div>
                  <span className="text-[11px] text-foreground/85 truncate w-full text-center">{app!.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HubLauncher;
