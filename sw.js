/* Service worker: app utilizzabile offline.
   - file dell'app: cache all'installazione (aggiornata a ogni nuova versione)
   - tessere della mappa: solo quelle già visualizzate, con limite (policy OpenStreetMap: niente scaricamento massivo) */
const VERSIONE = 'aree-danno-1.3-beta-2';
const APP = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'css/extra.css',
  'js/engine.js', 'js/data.js', 'js/onu.js', 'js/app.onu.js', 'js/props-3b.js', 'js/props-gl.js', 'js/app.base.js', 'js/app.extra.js',
  'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/images/marker-icon.png', 'vendor/images/marker-icon-2x.png',
  'vendor/images/marker-shadow.png', 'vendor/images/layers.png', 'vendor/images/layers-2x.png',
  'icons/icon-192.png', 'icons/icon-512.png'];
const TILE_CACHE = 'tessere-osm', MAX_TILES = 600;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSIONE && k !== TILE_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(TILE_CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try {
        const res = await fetch(e.request);
        if (res.ok || res.type === 'opaque') {
          await c.put(e.request, res.clone());
          const keys = await c.keys();
          if (keys.length > MAX_TILES) for (const k of keys.slice(0, keys.length - MAX_TILES)) await c.delete(k);
        }
        return res;
      } catch (err) { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
  }
});
