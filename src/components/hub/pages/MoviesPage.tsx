import { useEffect, useMemo, useState } from 'react';
import { Search, Film, Clapperboard, Tv, Bookmark, Loader2 } from 'lucide-react';
import MovieHero from '../movies/MovieHero';
import MovieRow from '../movies/MovieRow';
import PlayerModal from '../movies/PlayerModal';
import MovieCard from '../movies/MovieCard';
import ChatAmbient from '../ChatAmbient';
import {
  loadCatalog, readCache, buildRows, getMyList, toggleMyList, getRecent, searchItems,
  type MediaItem, type MovieCatalog,
} from '@/lib/movies';

type Filter = 'all' | 'movies' | 'series' | 'list';

const FILTERS: { id: Filter; label: string; icon: typeof Film }[] = [
  { id: 'all', label: 'All', icon: Clapperboard },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'list', label: 'My List', icon: Bookmark },
];

const MoviesPage = () => {
  const [catalog, setCatalog] = useState<MovieCatalog | null>(readCache());
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [myList, setMyList] = useState<string[]>(getMyList);
  const [playing, setPlaying] = useState<{ item: MediaItem; ep?: number } | null>(null);

  useEffect(() => {
    loadCatalog().then(setCatalog).catch((e) => setError(String(e.message || e)));
  }, []);

  const all: MediaItem[] = useMemo(
    () => (catalog ? [...catalog.shows, ...catalog.movies] : []),
    [catalog],
  );

  const hero = useMemo(() => {
    if (!catalog) return null;
    const recent = getRecent()[0];
    return all.find((i) => i.id === recent?.id) || catalog.movies[0] || catalog.shows[0] || null;
  }, [catalog, all]);

  const continueRow = useMemo(() => {
    const ids = getRecent().map((r) => r.id);
    return ids.map((id) => all.find((i) => i.id === id)).filter(Boolean) as MediaItem[];
  }, [all, playing]);

  const rows = useMemo(() => {
    if (!catalog) return [];
    const base = buildRows(catalog);
    if (filter === 'movies') return [{ name: 'All Movies', items: catalog.movies }];
    if (filter === 'series') return [{ name: 'Series', items: catalog.shows }];
    if (filter === 'list') {
      return [{ name: 'My List', items: all.filter((i) => myList.includes(i.id)) }];
    }
    return continueRow.length ? [{ name: 'Continue Watching', items: continueRow }, ...base] : base;
  }, [catalog, filter, myList, all, continueRow]);

  const results = useMemo(() => searchItems(all, q), [all, q]);

  const handleToggleList = (id: string) => setMyList(toggleMyList(id));

  return (
    <div className="relative max-w-7xl mx-auto pt-4 animate-fade-in">
      <ChatAmbient />

      <div className="relative z-10">
        {/* header bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight glow-text">Movies &amp; Series</h1>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              // stream anything, anywhere
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full glass-panel w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search titles…"
                aria-label="Search movies and series"
                className="flex-1 bg-transparent outline-none text-sm min-w-0"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border
                    ${filter === f.id
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                >
                  <f.icon className="w-3.5 h-3.5" /> {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && !catalog && (
          <p className="glass-panel p-4 text-sm text-destructive">Couldn’t load the library: {error}</p>
        )}

        {!catalog && !error && (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading library…
          </div>
        )}

        {catalog && q.trim() ? (
          <section>
            <h2 className="text-base font-bold mb-3">
              {results.length} result{results.length === 1 ? '' : 's'} for “{q.trim()}”
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              {results.map((item) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  inList={myList.includes(item.id)}
                  onPlay={(i) => setPlaying({ item: i })}
                  onToggleList={handleToggleList}
                />
              ))}
            </div>
            {!results.length && (
              <p className="text-sm text-muted-foreground py-12 text-center">Nothing matches that title.</p>
            )}
          </section>
        ) : (
          catalog && (
            <>
              {hero && filter === 'all' && (
                <MovieHero
                  item={hero}
                  inList={myList.includes(hero.id)}
                  onPlay={(i) => setPlaying({ item: i })}
                  onToggleList={handleToggleList}
                />
              )}
              <div className="space-y-8 pb-10">
                {rows.map((row) => (
                  <MovieRow
                    key={row.name}
                    title={row.name}
                    items={row.items}
                    myList={myList}
                    onPlay={(i) => setPlaying({ item: i })}
                    onToggleList={handleToggleList}
                  />
                ))}
              </div>
            </>
          )
        )}
      </div>

      {playing && (
        <PlayerModal
          item={playing.item}
          startEpisode={playing.ep ?? 0}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
};

export default MoviesPage;
