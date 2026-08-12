const CACHE_NAME = 'rg-billing-v2'; // bump this number whenever the app is updated
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // activate the new version immediately, don't wait for tabs to close
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of any already-open tabs right away
});

// NETWORK-FIRST for the app shell: always try to fetch the latest version first,
// and only fall back to the cached copy if there's no internet connection.
// (Cache-first was the old approach — it made updates invisible until the cache
// was manually cleared, which is why the app kept showing an old version.)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isAppShell = APP_SHELL.some((path) => req.url.endsWith(path.replace('./', '')));

  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
  }
});
