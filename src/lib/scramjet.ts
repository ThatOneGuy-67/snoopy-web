// Scramjet proxy bootstrap. Registers the SW, sets up bare-mux transport
// (epoxy + a public Wisp server), and exposes a shared controller.

declare global {
  interface Window {
    $scramjetLoadController?: () => { ScramjetController: any };
  }
}

export const DEFAULT_WISP_URL = 'wss://wisp.mercurywork.shop/';

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

function rawTestWisp(url: string, timeoutMs: number): Promise<{ ok: boolean; message: string }> {
  return new Promise(resolve => {
    let done = false;
    let ws: WebSocket;
    const finish = (ok: boolean, message: string) => {
      if (done) return;
      done = true;
      try { ws?.close(); } catch {}
      resolve({ ok, message });
    };
    try {
      ws = new WebSocket(url);
    } catch (e: any) {
      return resolve({ ok: false, message: e?.message || 'Invalid WebSocket URL' });
    }
    const t = setTimeout(() => finish(false, `Timed out after ${timeoutMs}ms`), timeoutMs);
    ws.onopen = () => { clearTimeout(t); finish(true, 'Wisp relay reachable'); };
    ws.onerror = () => { clearTimeout(t); finish(false, 'Could not connect to Wisp relay'); };
  });
}

// Session cache so we don't re-test on every proxy load.
type CachedResult = { ok: boolean; message: string; at: number; url: string };
let sessionResult: CachedResult | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedWispResult(url = getWispUrl()): CachedResult | null {
  if (!sessionResult) return null;
  if (sessionResult.url !== url) return null;
  if (Date.now() - sessionResult.at > CACHE_TTL_MS) return null;
  return sessionResult;
}

export function clearCachedWispResult() { sessionResult = null; }

/**
 * Test Wisp reachability with exponential backoff retry.
 * Honors session cache when useCache=true (default).
 */
export async function testWispReachable(
  url = getWispUrl(),
  opts: { useCache?: boolean; retries?: number; timeoutMs?: number } = {}
): Promise<{ ok: boolean; message: string }> {
  const { useCache = true, retries = 3, timeoutMs = 5000 } = opts;

  if (useCache) {
    const cached = getCachedWispResult(url);
    if (cached?.ok) return { ok: cached.ok, message: cached.message + ' (cached)' };
  }

  let lastMsg = '';
  for (let attempt = 0; attempt < retries; attempt++) {
    const r = await rawTestWisp(url, timeoutMs);
    if (r.ok) {
      sessionResult = { ...r, at: Date.now(), url };
      return r;
    }
    lastMsg = r.message;
    if (attempt < retries - 1) {
      const backoff = Math.min(4000, 500 * 2 ** attempt);
      await new Promise(res => setTimeout(res, backoff));
    }
  }
  const result = { ok: false, message: `${lastMsg} (after ${retries} attempts)` };
  sessionResult = { ...result, at: Date.now(), url };
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
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported in this browser');
  }

  await loadScript('/scramjet/scramjet.all.js');

  if (typeof window.$scramjetLoadController !== 'function') {
    throw new Error('Scramjet failed to load (loader global missing)');
  }
  const { ScramjetController } = window.$scramjetLoadController();
  const controller = new ScramjetController({
    prefix: '/scramjet/service/',
    files: {
      wasm: '/scramjet/scramjet.wasm.wasm',
      all: '/scramjet/scramjet.all.js',
      sync: '/scramjet/scramjet.sync.js',
    },
    flags: { captureErrors: true, scramitize: false, sourcemaps: true },
  });
  await controller.init();

  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  const { BareMuxConnection } = await import('@mercuryworkshop/bare-mux');
  const conn = new BareMuxConnection('/baremux/worker.js');
  await conn.setTransport('/epoxy/index.mjs', [{ wisp: wispUrl }]);

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
