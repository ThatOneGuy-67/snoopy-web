import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gamepad2, Search, Loader2, RefreshCw, Star, X } from 'lucide-react';
import GameCard from '../games/GameCard';
import GameDetailsModal from '../games/GameDetailsModal';
import CacheStatus from '@/components/CacheStatus';
import {
  GAME_CATEGORIES,
  gameUrl,
  loadGames,
  pushRecent,
  readFavorites,
  readFilters,
  readRecent,
  searchGames,
  writeFavorites,
  writeFilters,
  type Game,
  type GameCategory,
} from '@/lib/games';

const PAGE = 60;

const GamesPage = () => {
  const saved = useMemo(readFilters, []);
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(saved.query);
  const [category, setCategory] = useState<GameCategory>(saved.category);
  const [limit, setLimit] = useState(saved.limit);
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites());
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const [details, setDetails] = useState<Game | null>(null);

  const fetchGames = useCallback(() => {
    setError(null);
    loadGames()
      .then(setGames)
      .catch(() => setError('Could not load the game catalog.'));
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Persist filters (including how far the user has paged) for the session.
  useEffect(() => {
    writeFilters({ query, category, limit });
  }, [query, category, limit]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      writeFavorites(next);
      return next;
    });
  }, []);

  const play = useCallback((game: Game) => {
    setRecent(pushRecent(game.id));
    window.open(gameUrl(game), '_blank', 'noopener,noreferrer');
  }, []);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const byCategory = useMemo(() => {
    if (!games) return [];
    if (category === 'Favorites') return games.filter(g => favoriteSet.has(g.id));
    if (category === 'All') return games;
    return games.filter(g => g.category === category);
  }, [games, category, favoriteSet]);

  const filtered = useMemo(() => searchGames(byCategory, query), [byCategory, query]);

  // Counts for the category chips.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    if (games) for (const g of games) map.set(g.category, (map.get(g.category) ?? 0) + 1);
    return map;
  }, [games]);

  const recentGames = useMemo(() => {
    if (!games || query || category !== 'All' || !recent.length) return [];
    const byId = new Map(games.map(g => [g.id, g]));
    return recent.map(id => byId.get(id)).filter(Boolean).slice(0, 6) as Game[];
  }, [games, recent, query, category]);

  const visible = filtered.slice(0, limit);

  const changeCategory = (cat: GameCategory) => {
    setCategory(cat);
    setLimit(PAGE);
  };

  const changeQuery = (q: string) => {
    setQuery(q);
    setLimit(PAGE);
  };

  const chipCount = (cat: GameCategory) =>
    cat === 'All' ? games?.length : cat === 'Favorites' ? favorites.length : counts.get(cat);

  return (
    <div className="max-w-7xl mx-auto pt-6 animate-fade-in">
      {/* Hero */}
      <section className="glass-panel hover-glow p-5 sm:p-7 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="p-2.5 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.05))',
              boxShadow: '0 0 30px hsl(var(--glow-primary) / 0.2)',
            }}
          >
            <Gamepad2 className="w-6 h-6 text-primary" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold glow-text tracking-tight">Games</h1>
            <p className="text-xs font-mono text-muted-foreground">
              // {games ? games.length.toLocaleString() : '…'} unblocked games, one click away
            </p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => changeQuery(e.target.value)}
            type="search"
            placeholder="Search games — try “mc”, “1v1”, “btd”…"
            aria-label="Search games"
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-foreground/5 border border-border/60 text-sm outline-none transition-colors focus:border-primary/60 placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => changeQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1">
          {GAME_CATEGORIES.map(cat => {
            const active = cat === category;
            const n = chipCount(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => changeCategory(cat)}
                aria-pressed={active}
                className={`shrink-0 inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-mono border transition-all duration-200 ${
                  active
                    ? 'border-primary/60 text-primary bg-primary/10 shadow-[0_0_18px_hsl(var(--glow-primary)/0.25)]'
                    : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {cat === 'Favorites' && <Star className={`w-3 h-3 ${favorites.length ? 'fill-primary text-primary' : ''}`} />}
                {cat}
                {typeof n === 'number' && n > 0 && (
                  <span
                    className={`px-1.5 rounded-full text-[10px] ${
                      active ? 'bg-primary/20 text-primary' : 'bg-foreground/10 text-muted-foreground'
                    }`}
                  >
                    {n > 999 ? `${Math.floor(n / 1000)}k` : n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mb-6">
        <CacheStatus />
      </div>

      {/* Recently played */}
      {recentGames.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-mono text-muted-foreground mb-3">// recently played</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentGames.map(g => (
              <GameCard
                key={`recent-${g.id}`}
                game={g}
                favorite={favoriteSet.has(g.id)}
                onToggleFavorite={toggleFavorite}
                onPlay={play}
                onDetails={setDetails}
              />
            ))}
          </div>
        </section>
      )}

      {/* Grid */}
      {error && (
        <div className="glass-panel p-6 text-center">
          <p className="text-sm text-foreground/80 mb-3">{error}</p>
          <button
            type="button"
            onClick={fetchGames}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> retry
          </button>
        </div>
      )}

      {!games && !error && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground text-sm font-mono">
          <Loader2 className="w-4 h-4 animate-spin" /> loading catalog...
        </div>
      )}

      {games && !error && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono text-muted-foreground">
              // {category.toLowerCase()} — {filtered.length.toLocaleString()} result
              {filtered.length === 1 ? '' : 's'}
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-panel p-10 text-center text-sm text-muted-foreground">
              {category === 'Favorites'
                ? 'No favorites yet — tap the star on any game.'
                : 'No games matched your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {visible.map(g => (
                <GameCard
                  key={g.id}
                  game={g}
                  favorite={favoriteSet.has(g.id)}
                  onToggleFavorite={toggleFavorite}
                  onPlay={play}
                  onDetails={setDetails}
                />
              ))}
            </div>
          )}

          {limit < filtered.length && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setLimit(l => l + PAGE)}
                className="px-5 py-2.5 rounded-xl text-xs font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              >
                load more ({(filtered.length - limit).toLocaleString()} left)
              </button>
            </div>
          )}
        </>
      )}

      {details && (
        <GameDetailsModal
          game={details}
          favorite={favoriteSet.has(details.id)}
          onToggleFavorite={toggleFavorite}
          onPlay={g => {
            play(g);
            setDetails(null);
          }}
          onClose={() => setDetails(null)}
        />
      )}
    </div>
  );
};

export default GamesPage;
