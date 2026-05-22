// Scramjet proxy bootstrap. Loads UMD bundles from /scramjet and /baremux
// and exposes a single getController() promise so the rest of the app can
// share one instance.

declare global {
  interface Window {
    $scramjetLoadController?: () => { ScramjetController: any };
    BareMux?: { BareMuxConnection: new (workerUrl: string) => any };
  }
}

const WISP_URL = 'wss://wisp.mercurywork.shop/';

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

  // Load Scramjet + bare-mux client scripts
  await loadScript('/scramjet/scramjet.bundle.js');
  // bare-mux ships an ESM worker but we need its client API too — use a tiny inline shim
  // bundled via dynamic import of the package's index.mjs alternative: copy index.js then load
  // Simpler: use dynamic ESM import.
  const baremux = await import(/* @vite-ignore */ '/baremux-client.mjs').catch(() => null);
  if (!baremux) {
    // fall back to npm import (bundled)
  }

  const { ScramjetController } = window.$scramjetLoadController!();
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

  // Register service worker
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  // Set bare-mux transport to epoxy + wisp
  const { BareMuxConnection } = await import('@mercuryworkshop/bare-mux');
  const conn = new BareMuxConnection('/baremux/worker.js');
  await conn.setTransport('/epoxy/index.mjs', [{ wisp: WISP_URL }]);

  return controller;
}

export function getController(): Promise<any> {
  if (!controllerPromise) controllerPromise = init();
  return controllerPromise;
}

export function encodeUrl(controller: any, url: string): string {
  return controller.encodeUrl(url);
}
