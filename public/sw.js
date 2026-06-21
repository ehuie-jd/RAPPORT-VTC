const CACHE_NAME = 'flotte-pro-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Cette logique est obligatoire pour valider la PWA (mode hors-ligne)
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request).then(response => {
        if (response) {
          return response;
        }
        return new Response('Flotte Pro est en mode hors-ligne.');
      });
    })
  );
});
