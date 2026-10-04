/* global self, caches */
const CACHE_PREFIX = 'cinewrapped-pwa-';
const CACHE_NAME = CACHE_PREFIX + '__VERSION__';
const PUBLIC_ASSETS = __ASSETS__; // eslint-disable-line no-undef

self.addEventListener('install', (event) => {
  // Failure keeps the previous worker active. Updates wait until every old tab closes.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Network-only HTML prevents stale releases and caching OAuth callback tokens.
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match('/offline.html')) ??
          new Response('CineWrapped is offline. Reconnect and reload.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        );
      }),
    );
  } else if (!url.search && PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches
        .open(CACHE_NAME)
        .then(async (cache) => (await cache.match(url.pathname)) ?? fetch(request)),
    );
  }
});
