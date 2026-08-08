// Scramjet proxy bootstrap. Registers the SW, sets up bare-mux transport
// (epoxy + a public Wisp server), and exposes a shared controller.

declare global {
  interface Window {
    $scramjetLoadController?: () => { ScramjetController: any };
  }
}

export const DEFAULT_WISP_URL = 'wss://wisp.mercurywork.shop/';

export const RELAY_PRESETS: { name: string; url: string }[] = [
  { name: 'Mercury (default)', url: 'wss://wisp.mercurywork.shop/' },
  { name: 'Anura', url: 'wss://anura.pro/' },
  { name: 'Echo (test only)', url: 'wss://echo.websocket.events/' },
];

export function getWispUrl(): string {
  try {
    const raw = localStorage.getItem('snoopy-settings-v1');
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.wispUrl && typeof s.wispUrl === 'string' && s.wispUrl.trim()) return s.wispUrl.trim();
    }
  } catch {}
  return DEFAULT_WISP_URL;
}

/** Open a WebSocket and measure handshake latency. */
function rawTestWisp(url: string, timeoutMs: number): Promise<{ ok: boolean; message: string; pingMs?: number }> {
  return new Promise(resolve => {
    let done = false;
    let ws: WebSocket;
    const start = performance.now();
    const finish = (ok: boolean, message: string, pingMs?: number) => {
      if (done) return;
      done = true;
      try { ws?.close(); } catch {}
      resolve({ ok, message, pingMs });
    };
    try {
      ws = new WebSocket(url);
    } catch (e: any) {
      return resolve({ ok: false, message: e?.message || 'Invalid WebSocket URL' });
    }
    const t = setTimeout(() => finish(false, `Timed out after ${timeoutMs}ms`), timeoutMs);
    ws.onopen = () => { clearTimeout(t); finish(true, 'Wisp relay reachable', Math.round(performance.now() - start)); };
    ws.onerror = () => { clearTimeout(t); finish(false, 'Could not connect to Wisp relay'); };
  });
}

/** Lightweight ping used by the live status indicator. */
export async function pingWisp(url = getWispUrl(), timeoutMs = 4000): Promise<number | null> {
  const r = await rawTestWisp(url, timeoutMs);
  return r.ok ? r.pingMs ?? null : null;
}

type CachedResult = { ok: boolean; message: string; at: number; url: string; pingMs?: number };
let sessionResult: CachedResult | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedWispResult(url = getWispUrl()): CachedResult | null {
  if (!sessionResult) return null;
  if (sessionResult.url !== url) return null;
  if (Date.now() - sessionResult.at > CACHE_TTL_MS) return null;
  return sessionResult;
}

export function clearCachedWispResult() { sessionResult = null; }

export type RetryEvent =
  | { kind: 'attempt'; attempt: number; total: number; url: string }
  | { kind: 'success'; pingMs?: number; url: string }
  | { kind: 'fail'; message: string; nextDelayMs?: number; attempt: number }
  | { kind: 'giveup'; message: string };

/**
 * Test Wisp reachability with exponential backoff retry.
 * Optionally streams progress via onEvent so UIs can render live status.
 */
export async function testWispReachable(
  url = getWispUrl(),
  opts: {
    useCache?: boolean;
    retries?: number;
    timeoutMs?: number;
    onEvent?: (e: RetryEvent) => void;
  } = {}
): Promise<{ ok: boolean; message: string; pingMs?: number }> {
  const { useCache = true, retries = 3, timeoutMs = 5000, onEvent } = opts;

  if (useCache) {
    const cached = getCachedWispResult(url);
    if (cached?.ok) {
      onEvent?.({ kind: 'success', pingMs: cached.pingMs, url });
      return { ok: cached.ok, message: cached.message + ' (cached)', pingMs: cached.pingMs };
    }
  }

  let lastMsg = '';
  for (let attempt = 1; attempt <= retries; attempt++) {
    onEvent?.({ kind: 'attempt', attempt, total: retries, url });
    const r = await rawTestWisp(url, timeoutMs);
    if (r.ok) {
      sessionResult = { ...r, at: Date.now(), url };
      onEvent?.({ kind: 'success', pingMs: r.pingMs, url });
      return r;
    }
    lastMsg = r.message;
    const more = attempt < retries;
    const nextDelayMs = more ? Math.min(8000, 500 * 2 ** (attempt - 1)) : undefined;
    onEvent?.({ kind: 'fail', message: r.message, nextDelayMs, attempt });
    if (more && nextDelayMs) await new Promise(res => setTimeout(res, nextDelayMs));
  }
  const result = { ok: false, message: `${lastMsg} (after ${retries} attempts)` };
  sessionResult = { ...result, at: Date.now(), url };
  onEvent?.({ kind: 'giveup', message: result.message });
  return result;
}

let controllerPromise: Promise<any> | null = null;
let controllerWispUrl: string | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

  async function init(wispUrl: string) {
    const { perfStart } = await import('./perf');
    const done = perfStart('scramjet.init');
  
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported in this browser');
    }
  
    const BASE = import.meta.env.BASE_URL;
  
    await loadScript(`${BASE}scramjet/scramjet.all.js`);
  
    if (typeof window.$scramjetLoadController !== 'function') {
      throw new Error('Scramjet failed to load (loader global missing)');
    }
  
    const { ScramjetController } = window.$scramjetLoadController();
  
    const controller = new ScramjetController({
      console.log('Scramjet BASE:', BASE);
      console.log('Scramjet prefix:', `${BASE}scramjet/service/`);
      console.log('Scramjet files:', {
        wasm: `${BASE}scramjet/scramjet.wasm.wasm`,
        all: `${BASE}scramjet/scramjet.all.js`,
        sync: `${BASE}scramjet/scramjet.sync.js`,
      });
      prefix: `${BASE}scramjet/service/`,
      files: {
        wasm: `${BASE}scramjet/scramjet.wasm.wasm`,
        all: `${BASE}scramjet/scramjet.all.js`,
        sync: `${BASE}scramjet/scramjet.sync.js`,
      },
      flags: {
        captureErrors: true,
        scramitize: false,
        sourcemaps: true,
      },
    });
  
    await controller.init();
  
    await navigator.serviceWorker.register(
      `${BASE}sw.js`,
      { scope: BASE }
    );
  
    await navigator.serviceWorker.ready;
  
    const { BareMuxConnection } =
      await import('@mercuryworkshop/bare-mux');
  
    const conn = new BareMuxConnection(
      `${BASE}baremux/worker.js`
    );
  
    await conn.setTransport(
      `${BASE}epoxy/index.mjs`,
      [{ wisp: wispUrl }]
    );
  
    done({ wispUrl });
  
    return controller;
  }
export function getController(): Promise<any> {
  const wispUrl = getWispUrl();
  if (!controllerPromise || controllerWispUrl !== wispUrl) {
    controllerWispUrl = wispUrl;
    controllerPromise = init(wispUrl);
  }
  return controllerPromise;
}

export function resetController() {
  controllerPromise = null;
  controllerWispUrl = null;
  clearCachedWispResult();
}

/** One-click cache repair. Wipes proxy SW caches + storage. */
export async function clearProxyCache(): Promise<{ cleared: string[]; errors: string[] }> {
  const cleared: string[] = [];
  const errors: string[] = [];
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      cleared.push(`${keys.length} cache(s)`);
    }
  } catch (e: any) { errors.push(`caches: ${e?.message}`); }
  try {
    indexedDB.deleteDatabase('scramjet');
    cleared.push('scramjet IDB');
  } catch (e: any) { errors.push(`idb: ${e?.message}`); }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      cleared.push(`${regs.length} SW(s)`);
    }
  } catch (e: any) { errors.push(`sw: ${e?.message}`); }
  resetController();
  return { cleared, errors };
}

/** Classify a raw error into something actionable for the user. */
export function classifyError(message: string): { title: string; hint: string; tag: string } {
  const m = (message || '').toLowerCase();
  if (m.includes('headers is not iterable')) return { title: 'Transport glitch', hint: 'Scramjet transport got into a bad state. Try Repair Cache and retry.', tag: 'TRANSPORT' };
  if (m.includes('connection_reset') || m.includes('reset')) return { title: 'Connection reset', hint: 'The site or relay closed the connection. Try switching relay.', tag: 'RESET' };
  if (m.includes('name_not_resolved') || m.includes('dns')) return { title: 'DNS failure', hint: 'Could not resolve the hostname. Check the URL or your network.', tag: 'DNS' };
  if (m.includes('failed to fetch') || m.includes('network')) return { title: 'Network error', hint: 'Relay or upstream is unreachable. Retry the connection.', tag: 'NETWORK' };
  if (m.includes('websocket') || m.includes('wisp')) return { title: 'Relay offline', hint: 'The Wisp relay is unreachable. Switch relay or retry.', tag: 'RELAY' };
  if (m.includes('refused') || m.includes('frame')) return { title: 'Embedding blocked', hint: 'The site refuses to be framed. Try Open in new tab.', tag: 'FRAME' };
  if (m.includes('timeout') || m.includes('timed out')) return { title: 'Request timed out', hint: 'Try again — relay may be slow.', tag: 'TIMEOUT' };
  return { title: 'Proxy failed to start', hint: 'Something went wrong. Try Retry, or Repair Cache.', tag: 'UNKNOWN' };
}
