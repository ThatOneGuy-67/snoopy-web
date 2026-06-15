import { useEffect, useState } from 'react';
import { applyTheme } from './themes';

export interface AppSettings {
  themeId: string;
  proxyUrl: string;
  proxyPrefix: string;
  openInNewTab: boolean;
  aboutBlankCloak: boolean;
  autoCloakOnLoad: boolean;
  defaultCloakTitle: string;
  defaultCloakFavicon: string;
  panicKey: string;
  panicUrl: string;
  showParticles: boolean;
  searchEngine: 'duckduckgo' | 'google' | 'bing';
  accentHue: number;
  backgroundImage: string; // URL or '' for none
  backgroundDim: number;   // 0-100 overlay darkness
  autoAccentFromBg: boolean;
  useScramjet: boolean; // bundled in-app proxy
  wispUrl: string; // custom Wisp relay URL (empty = default)
}

const DEFAULTS: AppSettings = {
  themeId: 'matrix',
  proxyUrl: '',
  proxyPrefix: '/service/',
  openInNewTab: false,
  aboutBlankCloak: false,
  autoCloakOnLoad: false,
  defaultCloakTitle: '',
  defaultCloakFavicon: '',
  panicKey: '`',
  panicUrl: 'https://classroom.google.com',
  showParticles: true,
  searchEngine: 'duckduckgo',
  accentHue: 140,
  backgroundImage: '',
  backgroundDim: 60,
  autoAccentFromBg: false,
  useScramjet: true,
  wispUrl: '',
};

export async function extractDominantHue(url: string): Promise<number | null> {
  if (!url) return null;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const size = 40;
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const buckets = new Array(36).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const d = max - min;
          if (d < 0.15) continue; // skip grays
          let h = 0;
          if (max === r) h = ((g - b) / d) % 6;
          else if (max === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h = Math.round(h * 60);
          if (h < 0) h += 360;
          buckets[Math.floor(h / 10)] += d * 100;
        }
        let best = 0;
        for (let i = 1; i < 36; i++) if (buckets[i] > buckets[best]) best = i;
        resolve(best * 10 + 5);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const KEY = 'snoopy-settings-v1';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
    // Apply theme preset (sets background, card, border, primary, glow, etc.)
    applyTheme(settings.themeId);
    // Optional per-user hue override on top of theme
    if (settings.autoAccentFromBg && settings.backgroundImage) {
      document.documentElement.style.setProperty('--primary', `${settings.accentHue} 80% 60%`);
      document.documentElement.style.setProperty('--ring', `${settings.accentHue} 80% 60%`);
      document.documentElement.style.setProperty('--accent', `${settings.accentHue} 80% 50%`);
      document.documentElement.style.setProperty('--glow-primary', `${settings.accentHue} 80% 60%`);
    }
  }, [settings]);

  return [settings, setSettings] as const;
}

export function buildProxyUrl(target: string, s: AppSettings): string | null {
  if (!s.proxyUrl) return null;
  const base = s.proxyUrl.replace(/\/$/, '');
  const prefix = s.proxyPrefix.startsWith('/') ? s.proxyPrefix : `/${s.proxyPrefix}`;
  const encoded = encodeURIComponent(target);
  return `${base}${prefix}${encoded}`;
}

export function buildSearchUrl(query: string, engine: AppSettings['searchEngine']): string {
  const q = encodeURIComponent(query);
  switch (engine) {
    case 'google': return `https://www.google.com/search?q=${q}`;
    case 'bing': return `https://www.bing.com/search?q=${q}`;
    default: return `https://duckduckgo.com/?q=${q}`;
  }
}

export function openAboutBlank(url: string) {
  const win = window.open('about:blank', '_blank');
  if (!win) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>${document.title}</title><link rel="icon" href="${
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement)?.href || ''
    }"></head><body style="margin:0"><iframe src="${url}" style="border:0;width:100vw;height:100vh"></iframe></body></html>`
  );
}

// Best-effort reachability test. CORS prevents reading the response,
// but a successful no-cors fetch indicates the server is up.
export async function testProxyReachable(url: string): Promise<{ ok: boolean; message: string }> {
  if (!url) return { ok: false, message: 'No URL provided' };
  let target = url.trim().replace(/\/$/, '');
  if (!/^https?:\/\//.test(target)) target = `https://${target}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    await fetch(target, { method: 'GET', mode: 'no-cors', signal: ctrl.signal });
    clearTimeout(timer);
    return { ok: true, message: 'Proxy server is reachable' };
  } catch (e: any) {
    return { ok: false, message: e?.name === 'AbortError' ? 'Timed out after 7s' : 'Could not reach proxy' };
  }
}

export const BACKGROUND_PRESETS: { name: string; url: string }[] = [
  { name: 'None', url: '' },
  { name: 'Mountains', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
  { name: 'Ocean', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80' },
  { name: 'Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
  { name: 'Aurora', url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1920&q=80' },
  { name: 'City Night', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80' },
  { name: 'Galaxy', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80' },
  { name: 'Sunset', url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1920&q=80' },
];
