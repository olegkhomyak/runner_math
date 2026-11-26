// Keep version synced with .version-badge in index.html
const CACHE_NAME = 'runner-math-v1.3';
const urlsToCache = [
  './',
  './styles.css',
  './logic.js',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Strip the redirected flag so navigation requests (redirect: "manual") never fail with ERR_FAILED
function cleanResponse(response) {
  if (!response || !response.redirected) {
    return Promise.resolve(response);
  }
  return response.blob().then(body => new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        urlsToCache.map(url =>
          fetch(new Request(url, { cache: 'reload' }))
            .then(cleanResponse)
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to cache ${url}: ${response.status}`);
              }
              return cache.put(url, response);
            })
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isLocalDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
  if (isLocalDev) {
    event.respondWith(
      fetch(event.request.mode === 'navigate' ? './' : event.request)
        .then(cleanResponse)
        .catch(() => caches.open(CACHE_NAME).then(cache =>
          cache.match(event.request.mode === 'navigate' ? './' : event.request, { ignoreSearch: true })
        ))
    );
    return;
  }

  // Serve the canonical non-redirected app shell for all navigations (including legacy /index.html shortcuts)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then(cache => cache.match('./'))
        .then(cached => cached || fetch('./').then(cleanResponse))
        .then(cleanResponse)
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME)
      .then(cache => cache.match(event.request, { ignoreSearch: true }))
      .then(cached => cached || fetch(event.request).then(cleanResponse))
  );
});

self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];

  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheAllowlist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
