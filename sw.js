// sw.js
const VERSION = 'v10'; // bump on every deploy to force update
const STATIC_CACHE = `static-${VERSION}`;
const IMG_CACHE    = `images-${VERSION}`;

// Helper: resolve a path inside the current SW scope (works on GitHub Pages /repo/)
const scopeURL = new URL(self.registration.scope);
const inScope = (p) => new URL(p, scopeURL).pathname;

// Precache *scoped* URLs. Include index.html for SPA-ish fallback.
const PRECACHE = [
  inScope('index.html'),
  inScope('style.css'),
  inScope('logo.jpg'),
  inScope('favicon-32x32.png'),
  inScope('favicon-16x16.png'),
  inScope('apple-touch-icon.png'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, IMG_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

const BYPASS_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  // Supabase (auth/storage/rest/realtime)
  'supabase.co',
  'supabase.in',
  // Stripe payment links & dashboard callbacks
  'stripe.com',
  'buy.stripe.com',
]);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only intercept same-origin GET requests; let others pass through untouched.
  if (req.method !== 'GET' || url.origin !== scopeURL.origin) {
    if (BYPASS_HOSTS.has(url.hostname) || /(\.|^)supabase\.(co|in)$/.test(url.hostname)) {
      return; // do nothing: browser goes to network
    }
    // Non same-origin but not in bypass list -> also do nothing
    return;
  }

  // Navigations: network-first, fallback to cached index.html within scope
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Optionally: cache a fresh copy of index.html when network succeeds
          if (res.ok) return res;
          return caches.match(inScope('index.html'), { ignoreSearch: true });
        })
        .catch(() => caches.match(inScope('index.html'), { ignoreSearch: true }))
    );
    return;
  }

  // Images: cache-first
  if (req.destination === 'image') {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          // fallback to any cached version (might be null)
          return cache.match(req, { ignoreSearch: true });
        }
      })
    );
    return;
  }

  // CSS/JS: stale-while-revalidate
  if (req.destination === 'style' || req.destination === 'script') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        // Serve cached immediately if there, otherwise wait for network
        return cached || fetchPromise || fetch(req);
      })
    );
    return;
  }

  // Default same-origin GET: network-first, fallback to cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Optionally cache successful GETs under STATIC_CACHE
        if (res && res.ok) {
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
