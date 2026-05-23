// Scramjet proxy bootstrap. Registers the SW, sets up bare-mux transport
// (epoxy + a public Wisp server), and exposes a shared controller.

declare global {
  interface Window {
    $scramjetLoadController?: () => { ScramjetController: any };
  }
}

export const WISP_URL = 'wss://wisp.mercurywork.shop/';

export function testWispReachable(url = WISP_URL, timeoutMs = 5000): Promise<{ ok: boolean; message: string }> {
  return new Promise(resolve => {
    let done = false;
    const finish = (ok: boolean, message: string) => {
      if (done) return;
      done = true;
      try { ws.close(); } catch {}
      resolve({ ok, message });
    };
    let ws: WebSocket;
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

let controllerPromise: Promise<any> | null = null;

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

async function init() {
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
  await conn.setTransport('/epoxy/index.mjs', [{ wisp: WISP_URL }]);

  return controller;
}

export function getController(): Promise<any> {
  if (!controllerPromise) controllerPromise = init();
  return controllerPromise;
}
