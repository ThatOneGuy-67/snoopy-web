importScripts('./scramjet/scramjet.all.js');

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

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

async function handleRequest(event) {
  const url = new URL(event.request.url);
  const isProxied = url.pathname.includes(PROXY_SEGMENT);

  // Serve Scramjet's own runtime files directly (but never the proxy route).
  if (!isProxied && isScramjetAsset(url.pathname)) {
    return fetch(event.request);
  }

  await scramjet.loadConfig();

  if (isProxied || scramjet.route(event)) {
    return scramjet.fetch(event);
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
