import { useState } from 'react';
import { LayoutGrid, Plus, Check, Trash2, Pin } from 'lucide-react';
import { Workspace } from '@/lib/workspaces';
import { THEMES, getTheme } from '@/lib/themes';
import { APPS } from '@/lib/apps';

interface Props {
  list: Workspace[];
  activeId: string;
  onActivate: (id: string) => void;
  onCreate: (w: Omit<Workspace, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, patch: Partial<Workspace>) => void;
  onRemove: (id: string) => void;
}

const EMOJIS = ['🌐', '📚', '🎮', '💬', '🎯', '💼', '🚀', '🧠', '🎨', '🎵', '⚡', '🔥'];

const WorkspacesView = ({ list, activeId, onActivate, onCreate, onUpdate, onRemove }: Props) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🚀');
  const [themeId, setThemeId] = useState('matrix');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), emoji, themeId, pinnedAppIds: [] });
    setName('');
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <header className="flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Workspaces</h1>
        <span className="text-xs text-muted-foreground ml-auto font-mono">{list.length} total</span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(w => {
          const t = getTheme(w.themeId);
          const active = w.id === activeId;
          return (
            <div
              key={w.id}
              className={`glass-panel p-4 transition-all ${active ? 'border-primary/60 shadow-[0_0_24px_hsl(var(--glow-primary)/0.25)]' : 'hover:border-primary/30'}`}
              style={{ background: active ? `linear-gradient(135deg, hsl(${t.accent} / 0.08), transparent)` : undefined }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{w.emoji}</div>
                <div className="flex gap-1">
                  {t.swatches.map((c, i) => (
                    <span key={i} className="w-3 h-3 rounded-full border border-border/60" style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="font-semibold text-sm">{w.name}</div>
              <div className="text-[10px] font-mono text-muted-foreground mb-3">{t.name}</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3">
                <Pin className="w-3 h-3" />
                {w.pinnedAppIds.length} pinned app{w.pinnedAppIds.length === 1 ? '' : 's'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onActivate(w.id)}
                  disabled={active}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition ${
                    active
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'border border-border hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  {active ? <span className="flex items-center justify-center gap-1"><Check className="w-3 h-3" />Active</span> : 'Activate'}
                </button>
                {w.id !== 'default' && (
                  <button onClick={() => onRemove(w.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive border border-border" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {w.pinnedAppIds.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-1">
                  {w.pinnedAppIds.slice(0, 6).map(id => {
                    const app = APPS.find(a => a.id === id);
                    if (!app) return null;
                    const Icon = app.icon;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary/40 border border-border/40">
                        <Icon className="w-2.5 h-2.5" style={{ color: app.color }} />
                        {app.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> New workspace
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Workspace name"
            className="flex-1 px-3 py-2 rounded-lg bg-input border border-border outline-none text-sm focus:border-primary/50"
          />
          <select
            value={themeId}
            onChange={e => setThemeId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input border border-border outline-none text-sm"
          >
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-md text-lg transition ${emoji === e ? 'bg-primary/20 border border-primary/50' : 'hover:bg-secondary/40 border border-transparent'}`}
            >{e}</button>
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 text-sm"
        >
          Create workspace
        </button>
      </div>
    </div>
  );
};

export default WorkspacesView;
