// Service worker for Pulse: PWA offline shell caching.
//
// OneSignal manages Web Push notifications itself through its own service
// worker (`OneSignalSDKWorker.js`), so this worker is intentionally limited
// to offline caching only. No `push`, `notificationclick`, or
// `pushsubscriptionchange` handlers are registered here.
const CACHE = 'pulse-v2';
const ASSETS = ['/', '/index.html', '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Don't intercept Vite development files.
  if (
    self.location.hostname === 'localhost' ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('.ts') ||
    url.pathname.includes('.tsx') ||
    // Let OneSignal's service worker handle its own requests.
    url.pathname.startsWith('/OneSignalSDKWorker.js')
  ) {
    return;
  }

  if (request.method !== 'GET') return;

  // Network-first for page navigation.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Cache-first for static assets.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;

        try {
          const response = await fetch(request);
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        } catch {
          return caches.match(request);
        }
      })
    );
  }
});
