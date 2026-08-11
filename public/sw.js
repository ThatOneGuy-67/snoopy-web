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

// Static-asset cache for the game library. GitHub Pages can't set custom
// Cache-Control headers, so the service worker owns caching for these: game
// bundles never change once published, and games.json is refreshed in the
// background (stale-while-revalidate).
const ASSET_CACHE = 'tog-assets-v2';

function isGameAsset(pathname) {
  return (
    /\/Games\/.*\.html$/i.test(pathname) ||
    /\/games\.json$/i.test(pathname) ||
    /\/covers?\/.*\.(?:avif|webp|png|jpe?g|gif)$/i.test(pathname)
  );
}

function withCacheHeaders(response, maxAge) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${maxAge}`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleGameAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const isIndex = /games\.json$/i.test(new URL(request.url).pathname);

  const network = fetch(request)
    .then(async res => {
      if (res.ok) {
        const stamped = withCacheHeaders(res.clone(), isIndex ? 3600 : 31536000);
        await cache.put(request, stamped.clone());
        return stamped;
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    if (isIndex) network.catch(() => null); // refresh in background
    return cached;
  }
  const fresh = await network;
  return fresh || new Response('Asset unavailable offline', { status: 504 });
}

async function handleRequest(event) {
  const url = new URL(event.request.url);
  const isProxied = url.pathname.includes(PROXY_SEGMENT);

  // Serve Scramjet's own runtime files directly (but never the proxy route).
  if (!isProxied && isScramjetAsset(url.pathname)) {
    return fetch(event.request);
  }

  if (!isProxied && event.request.method === 'GET' && isGameAsset(url.pathname)) {
    return handleGameAsset(event.request);
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
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('tog-assets-') && key !== ASSET_CACHE).map(key => caches.delete(key))
    )),
  ]));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});
