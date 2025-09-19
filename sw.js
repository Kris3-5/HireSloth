// sw.js
const VERSION = 'v6'; // bump to invalidate old caches
const STATIC_CACHE = `static-${VERSION}`;
const IMG_CACHE    = `images-${VERSION}`;

const PRECACHE = [
  '/',                          // index shell
  '/style.css',                 // generic (in case you load it without ?v)
  '/style.css?v=20250912a',     // exact version used in pages
  '/logo.jpg',                  // generic
  '/logo.jpg?v=2',              // exact version used in pages
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png'
];

const sameOrigin = (url) => url.origin === self.location.origin;

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
      Promise.all(
        keys
          .filter(k => ![STATIC_CACHE, IMG_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Optional: allow clients to tell SW to activate immediately
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function cachePutSafe(cacheName, req, res) {
  try {
    if (res && res.ok && req.method === 'GET') {
      const cache = await caches.open(cacheName);
      await cache.put(req, res.clone());
    }
  } catch (_) {
    // ignore cache write errors
  }
  return res;
}

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
  ) {
    return; // let the browser handle it
  }

  // 1) HTML/page navigations → network-first (fallback to cached '/')
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          return (await caches.match('/')) || Response.error();
        }
      })()
    );
    return;
  }

  // Only cache same-origin assets below
  if (!sameOrigin(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // 2) Images → cache-first (then fill cache)
  if (req.destination === 'image') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMG_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          return cachePutSafe(IMG_CACHE, req, res);
        } catch {
          return Response.error();
        }
      })()
    );
    return;
  }

  // 3) CSS/JS → stale-while-revalidate
  if (req.destination === 'style' || req.destination === 'script') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then(res => cachePutSafe(STATIC_CACHE, req, res))
          .catch(() => null);
        return cached || (await fetchPromise) || Response.error();
      })()
    );
    return;
  }

  // Default → network
  event.respondWith(fetch(req));
});
