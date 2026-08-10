const CACHE_NAME = 'rg-billing-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell, network-first fallback for everything else
// (so CDN libraries like html2canvas/jsPDF/fonts always try to fetch fresh).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isAppShell = APP_SHELL.some((path) => req.url.endsWith(path.replace('./', '')));
  if (isAppShell) {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  } else {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});
