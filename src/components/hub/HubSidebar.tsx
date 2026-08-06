import { useEffect, useState } from 'react';
import { ChevronLeft, Menu, X, Layers } from 'lucide-react';
import { HUB_NAV_ITEMS, type HubViewId } from '@/lib/hubNav';

interface Props {
  active: HubViewId;
  onSelect: (id: HubViewId) => void;
}

const STORAGE_KEY = 'snoopy.hubSidebar.collapsed';

const HubSidebar = ({ active, onSelect }: Props) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  // Close mobile drawer whenever the active view changes
  useEffect(() => { setMobileOpen(false); }, [active]);

  const width = collapsed ? 'md:w-16' : 'md:w-56';

  const NavList = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <nav className="flex flex-col gap-1">
      {HUB_NAV_ITEMS.map(it => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            title={it.label}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
              ${isActive
                ? 'bg-primary/15 text-primary border border-primary/30 shadow-[0_0_18px_hsl(var(--glow-primary)/0.25)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent'
              }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span
              className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300
                ${isCollapsed ? 'md:opacity-0 md:w-0' : 'opacity-100 w-auto'}`}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar trigger */}
      <div className="md:hidden flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setMobileOpen(true)}
          className="glass-card !p-2.5"
          title="Open menu"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4 text-primary" />
        </button>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold glow-text">TOG's Web</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex ${width} shrink-0 transition-all duration-300 ease-out
          flex-col gap-2 p-2 border-r border-border/40 bg-card/30 backdrop-blur-xl`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-1 py-1`}>
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <Layers className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-semibold truncate">TOG's Web</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="mt-2">
          <NavList isCollapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 p-3 flex flex-col gap-3
              border-r border-border/40 bg-card/70 backdrop-blur-xl animate-slide-in-right"
            style={{ animation: 'fade-in .2s ease-out' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">TOG's Web</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavList isCollapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
};

export default HubSidebar;
