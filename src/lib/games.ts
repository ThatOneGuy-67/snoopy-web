/**
 * Games library for TOG's Web.
 * The full catalog lives in /games.json (generated from the Games/ folder) and
 * is fetched lazily so the initial bundle stays small. Results are cached in
 * localStorage so repeat visits (and "load more" paging) never refetch.
 */

export interface GameEntry {
  t: string;
  f: string;
  offline?: boolean;
}

export interface Game extends GameEntry {
  id: string;
  category: GameCategory;
  /** Deterministic hue used for the generated cover art */
  hue: number;
  initials: string;
  /** Normalised search haystack */
  key: string;
  tags: string[];
  description: string;
}

export const GAME_CATEGORIES = [
  'All',
  'Favorites',
  'Offline',
  'Minecraft',
  'Retro',
  'Shooter',
  'Racing',
  'Sports',
  'Puzzle',
  '.io',
  'Idle',
  'Platformer',
  'Other',
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number];

const RULES: [GameCategory, RegExp][] = [
  ['Minecraft', /minecraft|eaglercraft|craft|client|mc\b/i],
  ['Retro', /nes|snes|gameboy|gba|n64|sega|genesis|atari|emulator|retro|arcade|pac.?man|mario|sonic|tetris|zelda|pokemon/i],
  ['Shooter', /shoot|gun|war|combat|strike|sniper|zombie|doom|bullet|tank|fps|1v1|krunker|surviv/i],
  ['Racing', /race|racing|drift|car|kart|moto|bike|drive|traffic|truck|rush/i],
  ['Sports', /soccer|football|basket|tennis|golf|pool|bowl|hockey|baseball|boxing|skate|sport|volley/i],
  ['Puzzle', /puzzle|2048|sudoku|word|match|block|chess|solitaire|mahjong|maze|escape|tile|quiz|brain/i],
  ['.io', /\.io|io$|agar|slither|paper|diep|zombs|shell|smash karts/i],
  ['Idle', /idle|clicker|tycoon|simulator|capitalist|merge|farm|incremental/i],
  ['Platformer', /jump|run|platform|slope|geometry|dash|parkour|adventure|ninja|climb|world/i],
];

const CATEGORY_BLURB: Record<GameCategory, string> = {
  All: 'A classic from the library.',
  Favorites: 'One of your saved favorites.',
  Offline: 'Games stored locally in TOG Web and playable from the offline game library.',
  Minecraft: 'A browser-playable Minecraft / Eaglercraft client — build, mine and survive with no install.',
  Retro: 'An old-school arcade or console throwback, emulated straight in the browser.',
  Shooter: 'Fast-paced action shooting — aim, react and outlast everyone else.',
  Racing: 'High-speed driving with tight corners and even tighter lap times.',
  Sports: 'Pick-up-and-play sports action for one or two players.',
  Puzzle: 'A brain teaser built for short breaks and long win streaks.',
  '.io': 'A multiplayer-style .io arena game — grow, dominate, repeat.',
  Idle: 'An idle / clicker experience that keeps growing while you play.',
  Platformer: 'Precision jumping and level running with a rising difficulty curve.',
  Other: 'A fun browser game from the unblocked collection.',
};

/** Common short-hands people type instead of the full title. */
const ALIASES: Record<string, string[]> = {
  mc: ['minecraft', 'eaglercraft'],
  minecraft: ['eaglercraft', 'craft'],
  fnf: ['friday night funkin'],
  gd: ['geometry dash'],
  cod: ['call of duty'],
  gta: ['grand theft auto'],
  botw: ['zelda'],
  ss: ['subway surfers'],
  rb: ['retro bowl'],
  '1v1': ['1v1 lol', '1 v 1 lol'],
  bloons: ['btd', 'bloons tower defense'],
  btd: ['bloons'],
  tf2: ['team fortress'],
  yt: ['youtube'],
  pkmn: ['pokemon'],
  smash: ['smash karts'],
};

function categorize(title: string, file: string): GameCategory {
  const hay = `${title} ${file}`;
  for (const [cat, re] of RULES) if (re.test(hay)) return cat;
  return 'Other';
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initialsOf(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** lowercase, strip everything that isn't a letter or digit */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const STOP = new Set(['the', 'a', 'of', 'and', 'game', 'html', 'cl', 'io', 'v', 'on']);

function tagsOf(title: string, category: GameCategory): string[] {
  const words = normalize(title)
    .split(' ')
    .filter(w => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
  const uniq = Array.from(new Set(words)).slice(0, 5);
  return [category.toLowerCase(), 'unblocked', ...uniq];
}

export function decorate(entry: GameEntry): Game {
  const h = hash(entry.f);
  const category = categorize(entry.t, entry.f);
  const nTitle = normalize(entry.t);
  return {
    ...entry,
    id: entry.f,
    category,
    hue: h % 360,
    initials: initialsOf(entry.t),
    key: `${nTitle} ${normalize(entry.f)}`,
    tags: tagsOf(entry.t, category),
    description: `${entry.t} — ${CATEGORY_BLURB[category]} Runs fully in your browser, no downloads or logins required.`,
  };
}

/* -------------------------------- loading -------------------------------- */

const CACHE_KEY = 'tog-games-cache-v1';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

function readCache(): GameEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; list: GameEntry[] };
    if (!parsed?.list?.length || Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed.list;
  } catch {
    return null;
  }
}

function writeCache(list: GameEntry[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), list }));
  } catch {
    /* quota — cache is optional */
  }
}

let cache: Game[] | null = null;
let inflight: Promise<Game[]> | null = null;

export function loadGames(): Promise<Game[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  const cached = readCache();
  if (cached) {
    cache = cached.map(decorate);
    // Refresh in the background so the catalog stays current.
    void fetch(`${import.meta.env.BASE_URL}games.json`, { cache: 'force-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then((list: GameEntry[] | null) => {
        if (list?.length) {
          writeCache(list);
          cache = list.map(decorate);
        }
      })
      .catch(() => undefined);
    return Promise.resolve(cache);
  }

  inflight = fetch(`${import.meta.env.BASE_URL}games.json`, { cache: 'force-cache' })
    .then(r => {
      if (!r.ok) throw new Error(`games.json ${r.status}`);
      return r.json() as Promise<GameEntry[]>;
    })
    .then(list => {
      writeCache(list);
      cache = list.map(decorate);
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/* -------------------------------- search --------------------------------- */

function expand(term: string): string[] {
  return [term, ...(ALIASES[term] ?? []).map(normalize)];
}

/**
 * Score a game against a normalised query. Higher is better, 0 = no match.
 * Handles aliases, partial matches and out-of-order terms.
 */
export function scoreGame(game: Game, terms: string[]): number {
  if (!terms.length) return 1;
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const variant of expand(term)) {
      if (!variant) continue;
      const idx = game.key.indexOf(variant);
      if (idx === -1) continue;
      const wordStart = idx === 0 || game.key[idx - 1] === ' ';
      const exact = game.key === variant;
      best = Math.max(best, exact ? 100 : wordStart ? (idx === 0 ? 40 : 25) : 10);
    }
    if (!best) return 0; // every term must match somewhere
    score += best;
  }
  // Prefer shorter titles — they're usually the canonical game.
  return score + Math.max(0, 20 - game.t.length / 4);
}

export function searchGames(games: Game[], query: string): Game[] {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length) return games;
  const scored: { g: Game; s: number }[] = [];
  for (const g of games) {
    const s = scoreGame(g, terms);
    if (s > 0) scored.push({ g, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.map(x => x.g);
}

/* ------------------------------- favorites ------------------------------- */

const FAV_KEY = 'snoopy-game-favorites';

export function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeFavorites(ids: string[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch {
    /* storage full or blocked — favorites are non-critical */
  }
}

/* ------------------------------ recent plays ----------------------------- */

const RECENT_KEY = 'snoopy-game-recent';

export function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(id: string) {
  const next = [id, ...readRecent().filter(x => x !== id)].slice(0, 12);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/* ----------------------------- filter state ------------------------------ */

const FILTER_KEY = 'tog-games-filters-v1';

export interface GameFilters {
  query: string;
  category: GameCategory;
  limit: number;
}

export function readFilters(): GameFilters {
  const fallback: GameFilters = { query: '', category: 'All', limit: 60 };
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<GameFilters>;
    return {
      query: typeof p.query === 'string' ? p.query : '',
      category: (GAME_CATEGORIES as readonly string[]).includes(p.category as string)
        ? (p.category as GameCategory)
        : 'All',
      limit: typeof p.limit === 'number' && p.limit > 0 ? Math.min(p.limit, 600) : 60,
    };
  } catch {
    return fallback;
  }
}

export function writeFilters(f: GameFilters) {
  try {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}

/**
 * Origin that serves the oversized games which were offloaded to CDN storage
 * (`/__l5e/assets-v1/...`). Those paths only resolve on the Lovable-hosted
 * deployment, so when the app runs anywhere else (GitHub Pages, a Chromebook
 * hitting the Pages build, localhost) we point them back at the canonical
 * origin instead of 404-ing.
 */
export const ASSET_ORIGIN = 'https://snoopy-web.lovable.app';

function servesLovableAssets(): boolean {
  if (typeof window === 'undefined') return true;
  return /(^|\.)lovable\.(app|dev)$/.test(window.location.hostname);
}

/** Resolve a game's playable URL (CDN or app-relative). */
export function gameUrl(game: Game): string {
  const f = game.f;
  if (f.startsWith('http')) return f;
  // CDN-offloaded assets live at a fixed absolute path, never under BASE_URL.
  if (f.startsWith('/__l5e/')) {
    return servesLovableAssets() ? f : `${ASSET_ORIGIN}${f}`;
  }
  return `${import.meta.env.BASE_URL}${f.replace(/^\/+/, '')}`;
}

/* ------------------------------ prefetching ------------------------------ */

const prefetched = new Set<string>();

function isMobileLike(): boolean {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia?.('(max-width: 767px)').matches ?? false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return narrow || coarse;
}

function saveData(): boolean {
  const c = (navigator as any)?.connection;
  return Boolean(c?.saveData) || /2g/.test(String(c?.effectiveType ?? ''));
}

/**
 * Prefetch budget: game bundles are heavy (some are multiple MB), so on mobile
 * we only ever warm a handful, and we warm nothing at all on save-data or 2G.
 */
function prefetchBudget(): number {
  if (saveData()) return 0;
  return isMobileLike() ? 6 : 40;
}

/** Warm the browser cache for a game so clicking Play feels instant. */
export function prefetchGame(game: Game) {
  if (prefetched.has(game.id)) return;
  if (prefetched.size >= prefetchBudget()) return;
  prefetched.add(game.id);
  try {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = gameUrl(game);
    document.head.appendChild(link);
  } catch {
    /* ignore */
  }
}

/**
 * Shared IntersectionObserver that prefetches a card's game once it has been
 * visible for a moment — bounded by the same budget above. One observer for
 * the whole grid keeps the cost flat no matter how many cards are rendered.
 */
type Observed = { game: Game; timer?: number };
let io: IntersectionObserver | null = null;
const observed = new WeakMap<Element, Observed>();

function ensureObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (io) return io;
  io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        const rec = observed.get(entry.target);
        if (!rec) continue;
        if (entry.isIntersecting) {
          rec.timer = window.setTimeout(() => prefetchGame(rec.game), 600);
        } else if (rec.timer) {
          clearTimeout(rec.timer);
          rec.timer = undefined;
        }
      }
    },
    { rootMargin: '200px 0px' }
  );
  return io;
}

/** Observe a card element; returns a cleanup function. */
export function observeForPrefetch(el: Element | null, game: Game): () => void {
  if (!el) return () => undefined;
  const obs = ensureObserver();
  if (!obs) return () => undefined;
  observed.set(el, { game });
  obs.observe(el);
  return () => {
    const rec = observed.get(el);
    if (rec?.timer) clearTimeout(rec.timer);
    observed.delete(el);
    obs.unobserve(el);
  };
}

