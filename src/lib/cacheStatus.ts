export interface ServiceWorkerCacheStatus {
  supported: boolean;
  controlled: boolean;
  cacheName: string | null;
  catalog: number;
  covers: number;
  html: number;
  total: number;
  checkedAt: number;
}

const EMPTY: ServiceWorkerCacheStatus = {
  supported: false,
  controlled: false,
  cacheName: null,
  catalog: 0,
  covers: 0,
  html: 0,
  total: 0,
  checkedAt: 0,
};

/** Inspect the same-origin CacheStorage populated by public/sw.js. */
export async function readServiceWorkerCacheStatus(): Promise<ServiceWorkerCacheStatus> {
  if (typeof window === 'undefined' || !('caches' in window)) return EMPTY;

  const names = await caches.keys();
  const assetNames = names.filter(name => name.startsWith('tog-assets-'));
  const requests = (await Promise.all(
    assetNames.map(async name => Array.from(await (await caches.open(name)).keys()))
  )).flat();
  const paths = requests.map(request => new URL(request.url).pathname);

  return {
    supported: true,
    controlled: Boolean(navigator.serviceWorker?.controller),
    cacheName: assetNames.at(-1) ?? null,
    catalog: paths.filter(path => /\/games\.json$/i.test(path)).length,
    covers: paths.filter(path => /\/covers?\/|\.(?:avif|webp|png|jpe?g|gif)$/i.test(path)).length,
    html: paths.filter(path => /\/Games\/[^/]+\.html$/i.test(path)).length,
    total: requests.length,
    checkedAt: Date.now(),
  };
}