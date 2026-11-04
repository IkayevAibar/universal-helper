// Офлайн-кеш: сначала сеть, при отсутствии — кеш (для файлов сайта).
const CACHE = 'uh-v2';
const FILES = ['./', './index.html', './css/style.css', './icon.svg', './manifest.webmanifest',
  './js/core.js', './js/home.js', './js/money.js', './js/todo.js', './js/jobs.js', './js/finance.js',
  './data/recipes.js', './js/recipes.js', './js/laundry-icons.js', './data/guide.js', './js/guide.js',
  './js/extras.js', './js/settings.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // внешние API не кешируем
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request)));
});
