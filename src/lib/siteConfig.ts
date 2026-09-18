/**
 * Central, environment-driven configuration.
 *
 * Every deployment-specific value lives here and is read from Vite env vars,
 * so a fork of this repository never silently talks to somebody else's
 * backend, CDN or analytics. Everything is optional: when a value is missing
 * the related feature degrades gracefully instead of breaking the build.
 */

const env = import.meta.env as Record<string, string | undefined>;

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

/** Absolute public URL of this deployment (no trailing slash), '' if unknown. */
export const SITE_URL = clean(env.VITE_SITE_URL).replace(/\/*$/, '');

/** Build a canonical URL for a route, or '' when no site URL is configured. */
export function canonicalUrl(path = '/'): string {
  if (!SITE_URL) return '';
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Apply (or remove) the canonical <link> for the current route. */
export function setCanonical(path = '/'): void {
  const href = canonicalUrl(path);
  let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

/* ------------------------------- backend -------------------------------- */

export const SUPABASE_URL = clean(env.VITE_SUPABASE_URL).replace(/\/*$/, '');
export const SUPABASE_PUBLISHABLE_KEY = clean(env.VITE_SUPABASE_PUBLISHABLE_KEY);
/** True when this fork has its own backend configured. */
export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/* -------------------------------- chat ---------------------------------- */

/**
 * Chat database. Defaults to this deployment's own Realtime Database; a fork
 * can point it at its own project with the VITE_FIREBASE_* variables.
 */
export const FIREBASE_CONFIG = {
  apiKey: clean(env.VITE_FIREBASE_API_KEY) || 'AIzaSyAUh8VuVTZJ4kPZF203-bml44dtHCDQRl8',
  authDomain: clean(env.VITE_FIREBASE_AUTH_DOMAIN) || 'snoopys-chat.firebaseapp.com',
  databaseURL:
    clean(env.VITE_FIREBASE_DATABASE_URL) || 'https://snoopys-chat-default-rtdb.firebaseio.com',
  projectId: clean(env.VITE_FIREBASE_PROJECT_ID) || 'snoopys-chat',
};

/** True when this fork has its own Realtime Database configured. */
export const HAS_CHAT = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);

/* -------------------------------- proxy --------------------------------- */

/** Public Wisp relay used when the user hasn't picked one in Settings. */
export const DEFAULT_WISP_URL = clean(env.VITE_WISP_URL) || 'wss://wisp.mercurywork.shop/';

/** Optional default HTTP proxy server URL. */
export const DEFAULT_PROXY_URL = clean(env.VITE_PROXY_URL);

/* -------------------------------- assets -------------------------------- */

/**
 * Origin serving large, CDN-offloaded assets. Empty by default so a fork
 * serves everything from its own deployment.
 */
export const ASSET_ORIGIN = clean(env.VITE_ASSET_ORIGIN).replace(/\/*$/, '');

/** CDN base for the music library. */
export const MUSIC_CDN =
  clean(env.VITE_MUSIC_CDN).replace(/\/*$/, '/') ||
  'https://cdn.jsdelivr.net/gh/ThatOneGuy-67/Snoopys-Spotify@main/';
