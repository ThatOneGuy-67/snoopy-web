import { useState } from 'react';
import { Search, Star, Pin } from 'lucide-react';
import { APPS, CATEGORIES, AppCategory } from '@/lib/apps';
import AppCard from './AppCard';

interface AppsHubProps {
  onOpen: (url: string, name: string) => void;
  pinnedIds: string[];
  favIds: string[];
  onTogglePin: (id: string) => void;
  onToggleFav: (id: string) => void;
}

const AppsHub = ({ onOpen, pinnedIds, favIds, onTogglePin, onToggleFav }: AppsHubProps) => {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<AppCategory | 'All' | 'Favorites' | 'Pinned'>('All');

  const filtered = APPS.filter(a => {
    if (cat === 'Favorites') return favIds.includes(a.id);
    if (cat === 'Pinned')    return pinnedIds.includes(a.id);
    if (cat !== 'All' && a.category !== cat) return false;
    if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const tabs: (AppCategory | 'All' | 'Favorites' | 'Pinned')[] = ['All', 'Pinned', 'Favorites', ...CATEGORIES];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass-panel flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps…"
            className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <div className="flex gap-1 overflow-x-auto w-full sm:w-auto">
          {tabs.map(t => (
            <button key={t} onClick={() => setCat(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition
                ${cat === t ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">No apps match.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filtered.map(app => (
            <div key={app.id} className="relative group">
              <AppCard name={app.name} icon={app.icon} color={app.color} onClick={() => onOpen(app.url, app.name)} />
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={(e) => { e.stopPropagation(); onToggleFav(app.id); }}
                  className={`p-1 rounded bg-background/70 backdrop-blur ${favIds.includes(app.id) ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`} title="Favorite">
                  <Star className="w-3 h-3" fill={favIds.includes(app.id) ? 'currentColor' : 'none'} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onTogglePin(app.id); }}
                  className={`p-1 rounded bg-background/70 backdrop-blur ${pinnedIds.includes(app.id) ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} title="Pin">
                  <Pin className="w-3 h-3" fill={pinnedIds.includes(app.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppsHub;
