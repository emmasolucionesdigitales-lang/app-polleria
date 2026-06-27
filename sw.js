/* sw.js — Service Worker de la Pollería (Emma Soluciones Digitales)
   ───────────────────────────────────────────────────────────────
   Estrategia: NETWORK-FIRST (la red primero).
   - SIEMPRE intenta bajar la versión más nueva de internet.
   - Solo usa el caché guardado si estás SIN conexión.
   Así nunca te quedás pegado con una versión vieja del código
   (que era el problema que rompía la app en GitHub Pages).
   Las llamadas a Firebase y a las CDNs NO pasan por acá: van
   directo a la red, para no interferir con la sincronización. */

const CACHE = 'polleria-v1';
const APP_SHELL = ['./', './index.html'];

// Instalación: guarda la pantalla principal por si después no hay internet.
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(APP_SHELL).catch(function () {});
    })
  );
});

// Activación: borra cachés viejos de versiones anteriores.
self.addEventListener('activate', function (e) {
  e.waitUntil(
    (async function () {
      const keys = await caches.keys();
      await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      await self.clients.claim();
    })()
  );
});

// Cada pedido: red primero, caché de respaldo si no hay internet.
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return; // POST/PUT van directo a la red

  const url = new URL(req.url);
  // Solo manejamos archivos de NUESTRO dominio. Firebase / gstatic / CDNs → red directa.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    (async function () {
      try {
        const fresh = await fetch(req);               // 1) intentar internet
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(function () {}); // guardar copia fresca
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);        // 2) sin internet → usar caché
        if (cached) return cached;
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
        throw err;
      }
    })()
  );
});
