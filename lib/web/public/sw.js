const CACHE_NAME = 'checkout-journal-v1';
const STATIC_ASSETS = [
  '/',
  '/css/doogie.css',
  '/js/terminal.js',
  '/manifest.json'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for API/pages
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Static assets: cache-first
  if (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
