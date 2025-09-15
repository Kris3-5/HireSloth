// tiny cache-first SW for static assets
const CACHE = 'hiresloth-v1';
const ASSETS = [
  '/', '/index.html', '/jobs.html', '/about.html', '/contact.html',
  '/post-job.html', '/my-jobs.html', '/style.css', '/logo.jpg',
  '/favicon.ico', '/favicon-16x16.png', '/favicon-32x32.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(()=>cached))
  );
});
