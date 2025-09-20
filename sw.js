// sw.js
const VERSION = 'v14'; // bump on every deploy to force update
const STATIC_CACHE = `static-${VERSION}`;
const IMG_CACHE    = `images-${VERSION}`;

// Helper: resolve a URL inside the current SW scope (works on GitHub Pages /repo/)
const scopeURL = new URL(self.registration.scope);
const inScope = (p) => new URL(p, scopeURL).href;

// Precache *scoped* URLs. Include index.html for offline fallback.
const PRECACHE = [
  inScope('index.html'),
  inScope('style.css'),
  inScope('nav.js'),
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

// Optional: allow manual skipWaiting from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
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
    return; // non same-origin: do nothing
  }

  // Navigations: network-first, fallback to cached index.html within scope
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => (res.ok ? res : caches.match(inScope('index.html'), { ignoreSearch: true })))
        .catch(() => caches.match(inScope('index.html'), { ignoreSearch: true }))
    );
    return;
  }

  // Images: cache-first (ignore querystrings like ?v=…)
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
          return cache.match(req, { ignoreSearch: true });
        }
      })
    );
    return;
  }

  // CSS/JS: stale-while-revalidate (ignore querystrings so precached unversioned files satisfy ?v=…)
  if (req.destination === 'style' || req.destination === 'script') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        // Serve cached immediately if present; otherwise return network (or null)
        return cached || fetchPromise || fetch(req);
      })
    );
    return;
  }

  // Default same-origin GET: network-first, fallback to cache (ignoreSearch helps with small query diffs)
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
