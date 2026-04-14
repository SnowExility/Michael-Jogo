/* Service Worker — Michael: Em Busca do Big Mac Perdido */
const CACHE = 'michael-bigmac-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/fase1.html',
  '/css/style.css',
  '/css/fase1.css',
  '/js/main.js',
  '/js/fase1.js',
  '/js/music.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});