// sw v3 — config-race fix. Bump this comment to force browsers to pick up a new worker.
importScripts('./scramjet/scramjet.all.js');

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

// Scramjet v1 bug: when the page posts `{scramjet$type:'loadConfig'}` the
// worker stores `this.config` but never applies it to its global config or
// loads the WASM. `loadConfig()` then early-returns because `this.config` is
// set, and the first proxied request throws "Cannot read properties of
// undefined (reading 'prefix')" — Chrome shows that as ERR_FAILED / a blank
// 500. Our listener runs *after* Scramjet's, so we drop the half-applied
// config and force the next request to do the full IndexedDB load (which the
// controller always writes before posting the message).
self.addEventListener('message', ({ data }) => {
  if (data && typeof data === 'object' && data.scramjet$type === 'loadConfig') {
    scramjet.config = undefined;
  }
});

// Everything under this segment is a proxied request and MUST be routed
// through Scramjet. Note it lives *inside* /scramjet/, so the static-asset
// bypass below has to be checked second.
const PROXY_SEGMENT = '/scramjet/service/';

function isScramjetAsset(pathname) {
  return (
    pathname.includes('/scramjet/') ||
    pathname.includes('/baremux/') ||
    pathname.includes('/epoxy/') ||
    pathname.endsWith('/sw.js')
  );
}

function errorResponse(title, detail, status = 500) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const html = `<!doctype html><meta charset="utf-8"><title>Proxy error</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#eee;font:14px/1.5 ui-monospace,monospace">
<div style="max-width:640px;padding:32px"><h1 style="font-size:18px;margin:0 0 12px">Uh oh! ${esc(title)}</h1>
<pre style="white-space:pre-wrap;color:#f88;background:#000;padding:12px;border-radius:8px">${esc(detail)}</pre>
<p style="color:#999">Snoopy's Web service worker · retry from the app or use Repair Cache in Settings.</p></div>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

async function handleRequest(event) {
  const url = new URL(event.request.url);
  const isProxied = url.pathname.includes(PROXY_SEGMENT);

  // Serve Scramjet's own runtime files directly (but never the proxy route).
  if (!isProxied && isScramjetAsset(url.pathname)) {
    return fetch(event.request);
  }

  try {
    await scramjet.loadConfig();
  } catch (e) {
    if (isProxied) return errorResponse('Proxy config failed to load', String(e && e.stack || e));
    return fetch(event.request);
  }

  if (!scramjet.config) {
    // Nothing in IndexedDB yet — the page never ran controller.init().
    if (isProxied) {
      return errorResponse(
        'Proxy is not initialised',
        'The service worker has no Scramjet config. Reload the app so it can initialise the proxy, then try again.',
        503,
      );
    }
    return fetch(event.request);
  }

  if (isProxied || scramjet.route(event)) {
    try {
      return await scramjet.fetch(event);
    } catch (e) {
      // Never let respondWith() reject — that is what Chrome renders as
      // "might be temporarily down" (ERR_FAILED) with zero information.
      return errorResponse('There was an error loading ' + url.pathname, String(e && e.stack || e));
    }
  }

  return fetch(event.request);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    // Drop every legacy game/asset cache — the service worker no longer caches
    // site assets, the network (and the browser's own HTTP cache) owns that now.
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('tog-assets-')).map(key => caches.delete(key))
    )),
  ]));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});
