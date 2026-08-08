/**
 * Games library for TOG's Web.
 * The full catalog lives in /games.json (generated from the Games/ folder) and
 * is fetched lazily so the initial bundle stays small.
 */

export interface GameEntry {
  /** Display title */
  t: string;
  /** Playable file: local /Games/... path or CDN url */
  f: string;
}

export interface Game extends GameEntry {
  id: string;
  category: GameCategory;
  /** Deterministic hue used for the generated cover art */
  hue: number;
  initials: string;
}

export const GAME_CATEGORIES = [
  'All',
  'Favorites',
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

export function decorate(entry: GameEntry): Game {
  const h = hash(entry.f);
  return {
    ...entry,
    id: entry.f,
    category: categorize(entry.t, entry.f),
    hue: h % 360,
    initials: initialsOf(entry.t),
  };
}

let cache: Game[] | null = null;
let inflight: Promise<Game[]> | null = null;

export function loadGames(): Promise<Game[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch(`${import.meta.env.BASE_URL}games.json`)
    .then(r => {
      if (!r.ok) throw new Error(`games.json ${r.status}`);
      return r.json() as Promise<GameEntry[]>;
    })
    .then(list => {
      cache = list.map(decorate);
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
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
