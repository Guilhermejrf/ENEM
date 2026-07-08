const CACHE_NAME = 'planner-enem-ifpe-v5';

const STATIC_ASSETS = [
  '/',
  'index.html',
  'manifest.json',
  'assets/icon.svg',
  'css/style.css',
  'css/cards.css',
  'css/calendar.css',
  'css/responsive.css',
  'js/app.js',
  'js/calendar.js',
  'js/progress.js',
  'js/storage.js',
  'js/dashboard.js',
  'js/planner.js',
  'js/review.js',
  'js/sync.js',
  'js/countdown.js',
  'data/cronograma.json',
  'data/backlog-pos-ifpe.json',
  'data/disciplinas.json',
  'data/estatisticas.json',
  'data/pesos-enem.json',
  'data/feriados.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.hostname === 'api.github.com') {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('index.html', copy));
          return response;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
