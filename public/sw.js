importScripts('./scramjet/scramjet.all.js');

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
  const url = new URL(event.request.url);

  // Don't proxy Scramjet's own files.
  if (
    url.pathname.includes('/scramjet/') ||
    url.pathname.includes('/baremux/') ||
    url.pathname.includes('/epoxy/') ||
    url.pathname.endsWith('/sw.js')
  ) {
    return fetch(event.request);
  }

  await scramjet.loadConfig();

  if (scramjet.route(event)) {
    return scramjet.fetch(event);
  }

  return fetch(event.request);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});
