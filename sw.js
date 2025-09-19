// sw.js
const VERSION = 'v9';   // bump when you change files
const STATIC_CACHE = `static-${VERSION}`;
const IMG_CACHE    = `images-${VERSION}`;

const PRECACHE = [
  '/',
  '/style.css',
  '/logo.jpg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => ![STATIC_CACHE, IMG_CACHE].includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (
    /supabase\.co$/.test(url.hostname) ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  if (req.destination === 'image') {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => { cache.put(req, res.clone()); return res; }))
      )
    );
    return;
  }

  if (req.destination === 'style' || req.destination === 'script') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(res => { cache.put(req, res.clone()); return res; });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  event.respondWith(fetch(req));
});
