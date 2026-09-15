import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { FIREBASE_CONFIG, HAS_CHAT } from './siteConfig';

/**
 * The chat page runs on a Firebase Realtime Database that each deployment
 * supplies itself (see .env.example). When it isn't configured the page shows
 * a setup notice instead of connecting to anyone else's database.
 */
export const CHAT_CONFIGURED = HAS_CHAT;

function connect(): Database {
  if (!HAS_CHAT) {
    // Never reached: the Chat page guards on CHAT_CONFIGURED first.
    throw new Error('Chat is not configured. Set the VITE_FIREBASE_* variables in .env.');
  }
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

let cached: Database | null = null;

/** Lazily-created database handle; throws only if used while unconfigured. */
export const db = new Proxy({} as Database, {
  get(_t, prop) {
    cached ??= connect();
    const value = (cached as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(cached) : value;
  },
});

const env = import.meta.env as Record<string, string | undefined>;

export const ADMIN_PASSWORD = env.VITE_CHAT_ADMIN_PASSWORD ?? '';
export const MOD_PASSWORD = env.VITE_CHAT_MOD_PASSWORD ?? '';
export const OWNER_PASSWORD = env.VITE_CHAT_OWNER_PASSWORD ?? '';


export type Role = 'owner' | 'admin' | 'mod' | 'user';

export interface RoomMeta {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  gifOnly?: boolean;
  participants?: Record<string, boolean>;
  createdAt?: number;
  createdBy?: string;
}

export interface ChatMsg {
  key: string;
  name: string;
  msg: string;
  admin?: boolean;
  role?: Role | 'system';
  color?: string | null;
  isImage?: boolean;
  time: number;
  roomId?: string;
}

export const PUBLIC_ROOMS: RoomMeta[] = [
  { id: 'general', name: 'General', description: 'Everyone welcome', type: 'public', gifOnly: false },
  { id: 'gifs-only', name: 'GIFs only', description: 'Send only GIF posts', type: 'public', gifOnly: true },
];

export const BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'nigger', 'nigga', '1700300041'];

export const OWNER_GIFS = [
  'https://media.tenor.com/IvMj_IDQHzoAAAAM/kenjou-cat.gif',
  'https://media.tenor.com/pv0FSK0tt4UAAAAM/cute-cat.gif',
  'https://media.tenor.com/0jLTYEhwvyYAAAAM/cat-kitty.gif',
];
export const MOD_GIFS = [
  'https://media.tenor.com/HAU_nZjbw9gAAAAm/cat-dance.webp',
  'https://media.tenor.com/iALgQGVcpz4AAAAm/scemer-staring-cat.webp',
];
export const CAT_GIFS = [
  'https://media.tenor.com/_WZy7E7hoTcAAAAM/cat-smile.gif',
  'https://media.tenor.com/Ti6AFXIRrGsAAAAM/meme-funny.gif',
  'https://media.tenor.com/Ikyo4TNzZowAAAAM/cat-cats.gif',
  'https://media.tenor.com/QWemspX4xQgAAAAm/cat-eating-chips.webp',
  'https://media.tenor.com/GJUz8DogSTUAAAAm/cute-cat-cutie.webp',
  'https://media.tenor.com/ZksJbG5NhIQAAAAm/cat-kitten.webp',
  'https://media.tenor.com/4DiFwww6548AAAAm/kitty.webp',
  'https://media.tenor.com/yZPGL8Byn2oAAAAM/cat.gif',
];

export const COLORS = [
  '#69c0ff',
  '#7cdbd5',
  '#ffd86f',
  '#ff7f7f',
  '#c8a2ff',
  '#a3ffa3',
  '#ffb7c5',
  '#f7ecb5',
  '#91d5ff',
  '#d3adff',
];

export function browserFingerprint() {
  const data = [
    navigator.userAgent,
    navigator.language,
    (navigator as Navigator & { platform?: string }).platform ?? '',
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('||');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return 'u_' + String(Math.abs(hash));
}

export function censor(text: string) {
  let out = text;
  BAD_WORDS.forEach((w) => {
    out = out.replace(new RegExp(w, 'gi'), '***');
  });
  return out;
}
