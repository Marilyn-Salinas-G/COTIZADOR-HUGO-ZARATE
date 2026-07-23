const CACHE_NAME = 'cotizador-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/pwa.js',
  '/manifest.json',
  '/logo.png',
  '/logo_pwa.png',
  '/header_banner.png'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('Precaching warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  // Only handle GET requests and exclude database/uploads APIs
  if (e.request.method !== 'GET' || e.request.url.includes('/api/') || e.request.url.includes('/uploads/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Cache new successful requests
        if (response && response.status === 200) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseCopy);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failure, fallback to cache
        return caches.match(e.request);
      })
  );
});
