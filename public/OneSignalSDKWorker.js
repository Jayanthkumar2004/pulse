// ===========================================================================
// OneSignal SDK Service Worker + Pulse PWA offline caching
// ===========================================================================
// This is the PRIMARY (and ONLY) service worker for the app.
//
// IMPORTANT: OneSignal v16 REQUIRES that this worker is the one registered for
// the app scope. OneSignal registers it automatically when `init()` is called.
// We therefore merge our PWA offline-shell caching into this same file so we
// do NOT have to register a separate `sw.js` (which would conflict with
// OneSignal's worker at the same scope and break push subscriptions).
// ===========================================================================

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ----- PWA offline shell caching ------------------------------------------
const CACHE = 'pulse-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];

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

// Careful fetch handler: only respond for navigation + same-origin static
// assets. For everything else we return early WITHOUT calling respondWith so
// OneSignal's own (imported) handlers are not blocked.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept dev files or OneSignal's own SDK requests.
  if (
    self.location.hostname === 'localhost' ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('.ts') ||
    url.pathname.includes('.tsx') ||
    url.pathname.startsWith('/OneSignalSDK') ||
    url.hostname.includes('onesignal.com')
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

  // Cache-first for same-origin static assets.
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
