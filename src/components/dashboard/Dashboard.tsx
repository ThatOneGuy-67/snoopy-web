import { useEffect, useState } from 'react';
import {
  Clock, Star, Pin, Zap, Activity, Bookmark as BookmarkIcon,
  Plus, Trash2, X, Wifi, ChevronRight, ShieldCheck, Power, RotateCw,
} from 'lucide-react';
import Widget from './Widget';
import { APPS, getApp } from '@/lib/apps';
import { Bookmark, HistoryEntry, ActivityEntry } from '@/lib/browserData';
import { AppSettings } from '@/lib/settings';

interface Tab { id: string; title: string; url: string; }

interface DashboardProps {
  tabs: Tab[];
  recentlyClosed: { url: string; title: string; at: number }[];
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  activity: ActivityEntry[];
  pinnedIds: string[];
  settings: AppSettings;
  onOpenUrl: (url: string, title?: string) => void;
  onActivateTab: (id: string) => void;
  onRemoveBookmark: (id: string) => void;
  onTogglePin: (id: string) => void;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
  onOpenView: (v: 'bookmarks' | 'history' | 'apps') => void;
  onOpenDiagnostics?: () => void;
}

const timeAgo = (ts: number) => {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
};

const Dashboard = (p: DashboardProps) => {
  const pinned = p.pinnedIds.map(getApp).filter(Boolean) as ReturnType<typeof getApp>[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
      {/* Pinned Apps — spans 2 */}
      <Widget
        title="Pinned Apps"
        icon={<Pin className="w-3.5 h-3.5" />}
        action={
          <button onClick={() => p.onOpenView('apps')} className="text-xs text-primary hover:underline flex items-center gap-1">
            All apps <ChevronRight className="w-3 h-3" />
          </button>
        }
        className="md:col-span-2"
      >
        {pinned.length === 0 ? (
          <button onClick={() => p.onOpenView('apps')} className="w-full py-6 text-sm text-muted-foreground hover:text-primary border border-dashed border-border/60 rounded-lg flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Pin apps from the Apps view
          </button>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {pinned.map(app => {
              const Icon = app!.icon;
              return (
                <button
                  key={app!.id}
                  onClick={() => p.onOpenUrl(app!.url, app!.name)}
                  className="group relative flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-secondary/40 transition-all"
                  title={app!.name}
                >
                  <div
                    className="p-2 rounded-lg transition-transform group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${app!.color}30, ${app!.color}10)`,
                      boxShadow: `0 0 14px ${app!.color}25, inset 0 1px 0 ${app!.color}30`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: app!.color }} />
                  </div>
                  <span className="text-[10px] text-foreground/80 truncate w-full text-center">{app!.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Widget>

      {/* Quick Actions */}
      <Widget title="Quick Actions" icon={<Zap className="w-3.5 h-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          <QuickBtn icon={<Plus className="w-3.5 h-3.5" />} label="New tab"      onClick={() => p.onOpenPalette()} />
          <QuickBtn icon={<BookmarkIcon className="w-3.5 h-3.5" />} label="Bookmarks" onClick={() => p.onOpenView('bookmarks')} />
          <QuickBtn icon={<Clock className="w-3.5 h-3.5" />} label="History"     onClick={() => p.onOpenView('history')} />
          <QuickBtn icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Cloak"  onClick={() => p.onOpenSettings()} />
        </div>
      </Widget>

      {/* Recent Tabs */}
      <Widget
        title="Recent Tabs"
        icon={<Clock className="w-3.5 h-3.5" />}
        className="md:col-span-2"
      >
        {p.tabs.length === 0 && p.recentlyClosed.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No open or recent tabs yet.</p>
        ) : (
          <div className="space-y-1">
            {p.tabs.slice(0, 4).map(t => (
              <RowBtn key={t.id} title={t.title} sub={t.url} badge="open" onClick={() => p.onActivateTab(t.id)} />
            ))}
            {p.recentlyClosed.slice(0, Math.max(0, 5 - p.tabs.length)).map(t => (
              <RowBtn key={t.url + t.at} title={t.title} sub={t.url} badge={timeAgo(t.at)} onClick={() => p.onOpenUrl(t.url, t.title)} />
            ))}
          </div>
        )}
      </Widget>

      {/* Engine Status */}
      <Widget title="Engine Status" icon={<Wifi className="w-3.5 h-3.5" />}>
        <div className="space-y-2 text-xs">
          <StatRow label="Engine"  value={p.settings.useScramjet ? 'Scramjet' : (p.settings.proxyUrl ? 'Custom' : 'None')} />
          <StatRow label="Status"  value={<span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--glow-primary))]" /> Online</span>} />
          <StatRow label="Search"  value={p.settings.searchEngine} />
          <StatRow label="Cloak"   value={p.settings.autoCloakOnLoad ? 'Auto' : 'Off'} />
          <button onClick={p.onOpenDiagnostics || p.onOpenSettings} className="mt-2 w-full text-[11px] flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-border/60 hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors">
            <RotateCw className="w-3 h-3" /> Diagnostics
          </button>
        </div>
      </Widget>

      {/* Bookmarks */}
      <Widget
        title="Bookmarks"
        icon={<BookmarkIcon className="w-3.5 h-3.5" />}
        action={
          p.bookmarks.length > 0 && (
            <button onClick={() => p.onOpenView('bookmarks')} className="text-xs text-primary hover:underline flex items-center gap-1">
              All <ChevronRight className="w-3 h-3" />
            </button>
          )
        }
      >
        {p.bookmarks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No bookmarks yet. Bookmark a page from the URL bar.</p>
        ) : (
          <div className="space-y-1">
            {p.bookmarks.slice(0, 5).map(b => (
              <RowBtn key={b.id}
                title={b.title} sub={b.url}
                onClick={() => p.onOpenUrl(b.url, b.title)}
                onRemove={() => p.onRemoveBookmark(b.id)} />
            ))}
          </div>
        )}
      </Widget>

      {/* Recent Activity */}
      <Widget title="Recent Activity" icon={<Activity className="w-3.5 h-3.5" />} className="md:col-span-2">
        {p.activity.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">Activity will appear here as you browse.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {p.activity.slice(0, 6).map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-primary" />
                <span className="text-foreground/85 truncate flex-1">{a.label}</span>
                <span className="font-mono">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </div>
  );
};

const QuickBtn = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button onClick={onClick}
    className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/50 bg-secondary/20 hover:border-primary/50 hover:text-primary text-foreground/85 transition-all text-xs">
    {icon}<span className="truncate">{label}</span>
  </button>
);

const StatRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground/90 capitalize truncate">{value}</span>
  </div>
);

const RowBtn = ({ title, sub, badge, onClick, onRemove }: { title: string; sub?: string; badge?: string; onClick: () => void; onRemove?: () => void }) => (
  <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/40 transition-colors">
    <button onClick={onClick} className="flex-1 text-left min-w-0">
      <div className="text-xs text-foreground/90 truncate">{title}</div>
      {sub && <div className="text-[10px] text-muted-foreground truncate font-mono">{sub}</div>}
    </button>
    {badge && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 uppercase">{badge}</span>}
    {onRemove && (
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition" title="Remove">
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);

export default Dashboard;
