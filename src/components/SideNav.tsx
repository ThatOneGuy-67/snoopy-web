import { Home, AppWindow, Bookmark, History, Download, LayoutGrid, Settings, ChevronLeft, Command } from 'lucide-react';
import { useState } from 'react';

export type SidebarView = 'home' | 'apps' | 'bookmarks' | 'history' | 'downloads' | 'workspaces';

interface SideNavProps {
  active: SidebarView;
  onSelect: (v: SidebarView) => void;
  onOpenSettings: () => void;
  onOpenPalette: () => void;
  workspaceName?: string;
  workspaceEmoji?: string;
}

const items: { id: SidebarView; label: string; icon: typeof Home }[] = [
  { id: 'home',       label: 'Home',       icon: Home },
  { id: 'apps',       label: 'Apps',       icon: AppWindow },
  { id: 'bookmarks',  label: 'Bookmarks',  icon: Bookmark },
  { id: 'history',    label: 'History',    icon: History },
  { id: 'downloads',  label: 'Downloads',  icon: Download },
  { id: 'workspaces', label: 'Workspaces', icon: LayoutGrid },
];

const SideNav = ({ active, onSelect, onOpenSettings, onOpenPalette, workspaceName, workspaceEmoji }: SideNavProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? 'w-14' : 'w-52';

  return (
    <aside className={`${w} shrink-0 transition-all duration-300 hidden md:flex flex-col gap-2 p-2 border-r border-border/40 bg-card/30 backdrop-blur-xl`}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="self-end p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {workspaceName && (
        <button
          onClick={() => onSelect('workspaces')}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:border-primary/50 text-left transition-all"
          title={`Workspace: ${workspaceName}`}
        >
          <span className="text-lg shrink-0">{workspaceEmoji}</span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-mono text-muted-foreground">Workspace</div>
              <div className="text-xs font-semibold truncate text-primary">{workspaceName}</div>
            </div>
          )}
        </button>
      )}

      <button
        onClick={onOpenPalette}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-secondary/30 hover:border-primary/60 hover:text-primary text-muted-foreground transition-all`}
        title="Command palette (Ctrl+K)"
      >
        <Command className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="text-xs font-mono">Ctrl+K</span>}
      </button>

      <nav className="flex flex-col gap-1 mt-2">
        {items.map(it => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm
                ${isActive
                  ? 'bg-primary/15 text-primary border border-primary/30 shadow-[0_0_18px_hsl(var(--glow-primary)/0.25)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              title={it.label}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="font-medium">{it.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all text-sm"
          title="Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </button>
      </div>
    </aside>
  );
};

export default SideNav;
