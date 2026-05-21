import { useEffect, useState } from 'react';

export interface AppSettings {
  proxyUrl: string;          // e.g. https://snoopy-proxy.onrender.com  (scramjet/uv server)
  proxyPrefix: string;       // path prefix appended to proxyUrl, e.g. /service/
  openInNewTab: boolean;     // bypass iframe entirely
  aboutBlankCloak: boolean;  // pop into about:blank window
  autoCloakOnLoad: boolean;
  defaultCloakTitle: string;
  defaultCloakFavicon: string;
  panicKey: string;          // e.g. "`" or "Escape"
  panicUrl: string;          // where to redirect on panic
  showParticles: boolean;
  searchEngine: 'duckduckgo' | 'google' | 'bing';
  accentHue: number;         // 0-360 for --primary
}

const DEFAULTS: AppSettings = {
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
  accentHue: 200,
};

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
    document.documentElement.style.setProperty('--primary', `${settings.accentHue} 80% 60%`);
    document.documentElement.style.setProperty('--ring', `${settings.accentHue} 80% 60%`);
    document.documentElement.style.setProperty('--accent', `${settings.accentHue} 80% 50%`);
    document.documentElement.style.setProperty('--glow-primary', `${settings.accentHue} 80% 60%`);
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
