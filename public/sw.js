self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // OBLIGATOIRE : Intercepte les requêtes pour que le téléphone Android/iOS valide l'application
  e.respondWith(
    fetch(e.request).catch(() => {
      return new Response('Mode hors ligne (La connexion a échoué)');
    })
  );
});
