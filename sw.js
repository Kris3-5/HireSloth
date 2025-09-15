// sw.js
const VERSION = 'v5';                    // ← bump to invalidate old caches
const STATIC_CACHE = `static-${VERSION}`;
const IMG_CACHE    = `images-${VERSION}`;

const PRECACHE = [
  '/',                 // optional: index shell
  '/style.css',
  '/logo.jpg',         // ensure logo is cached for offline
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png'
];

// Install: pre-cache a few core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => ![STATIC_CACHE, IMG_CACHE].includes(k))
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: choose strategy per request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept Supabase/CDN/fonts calls
  if (
    /supabase\.co$/.test(url.hostname) ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) return;

  // 1) HTML/page navigations → network-first (no cached HTML)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/')) // basic offline fallback
    );
    return;
  }

  // 2) Images → cache-first (then fill cache)
  if (req.destination === 'image') {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(req).then(hit => {
          if (hit) return hit;
          return fetch(req).then(res => {
            cache.put(req, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // 3) CSS/JS → stale-while-revalidate
  if (req.destination === 'style' || req.destination === 'script') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(res => {
            cache.put(req, res.clone());
            return res;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Default → network
  event.respondWith(fetch(req));
});
