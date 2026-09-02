export interface Episode {
  name: string;
  link: string;
}

export interface MovieItem {
  id: string;
  type: 'movie';
  title: string;
  poster: string;
  link: string;
}

export interface ShowItem {
  id: string;
  type: 'show';
  title: string;
  poster: string;
  episodes: Episode[];
}

export type MediaItem = MovieItem | ShowItem;

export interface MovieCatalog {
  updated: string;
  movies: MovieItem[];
  shows: ShowItem[];
}

const CACHE_KEY = 'snoopy.movies.catalog.v1';
const RECENT_KEY = 'snoopy.movies.recent.v1';
const MY_LIST_KEY = 'snoopy.movies.mylist.v1';

const base = import.meta.env.BASE_URL || '/';

let inflight: Promise<MovieCatalog> | null = null;

export async function loadCatalog(): Promise<MovieCatalog> {
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(`${base}movies.json`, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`movies.json ${res.status}`);
    const data = (await res.json()) as MovieCatalog;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      /* quota — ignore */
    }
    return data;
  })().catch((err) => {
    inflight = null;
    const cached = readCache();
    if (cached) return cached;
    throw err;
  });
  return inflight;
}

export function readCache(): MovieCatalog | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MovieCatalog) : null;
  } catch {
    return null;
  }
}

/** Collections shown as Disney+ style rows, matched by title keywords. */
export const COLLECTIONS: { name: string; match: RegExp }[] = [
  { name: 'Marvel & Heroes', match: /spider|iron man|batman|supergirl|avenger|marvel|hulk|thor|captain/i },
  { name: 'Animated Favorites', match: /shrek|minion|despicable|cars|zootopia|kung fu|sonic|mario|lorax|bee|spongebob|simpsons|lego/i },
  { name: 'Comedy Night', match: /ted|happy gilmore|space jam|office|south park|rick|dumb|grown/i },
  { name: 'Action & Thrills', match: /top gun|terrifier|interstellar|mad max|dexter|backrooms|mutiny|odyssey|john wick/i },
];

export function buildRows(catalog: MovieCatalog) {
  const rows: { name: string; items: MediaItem[] }[] = [];
  if (catalog.shows.length) rows.push({ name: 'Series', items: catalog.shows });
  rows.push({ name: 'Recently Added', items: catalog.movies.slice(0, 14) });
  for (const c of COLLECTIONS) {
    const items = catalog.movies.filter((m) => c.match.test(m.title));
    if (items.length >= 3) rows.push({ name: c.name, items });
  }
  rows.push({ name: 'All Movies', items: catalog.movies });
  return rows;
}

/* ---------------- Continue watching + My List ---------------- */

export interface RecentEntry {
  id: string;
  episodeIndex?: number;
  at: number;
}

export function getRecent(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as RecentEntry[];
  } catch {
    return [];
  }
}

export function pushRecent(id: string, episodeIndex?: number) {
  const list = getRecent().filter((r) => r.id !== id);
  list.unshift({ id, episodeIndex, at: Date.now() });
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export function getMyList(): string[] {
  try {
    return JSON.parse(localStorage.getItem(MY_LIST_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

export function toggleMyList(id: string): string[] {
  const list = getMyList();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  try {
    localStorage.setItem(MY_LIST_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function searchItems(items: MediaItem[], q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return items;
  return items.filter((i) => i.title.toLowerCase().includes(term));
}
