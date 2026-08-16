/* Service worker: guarda el juego en el teléfono para que ande sin internet.
 *
 * Las dos constantes de abajo las reescribe el plugin `swConAssets` de
 * vite.config.js durante `npm run build`, con los nombres reales de los assets
 * (que llevan hash) y una versión derivada de esos nombres. Si el reemplazo
 * falla, la build se corta: no queremos publicar un sw que precachea nada.
 *
 * Estrategia (esto es lo que arregla la deuda #1):
 *
 *   navegación / index.html  ->  RED PRIMERO, caché como respaldo
 *   assets/ con hash         ->  CACHÉ PRIMERO (el hash los hace inmutables)
 *   resto (iconos, manifest) ->  CACHÉ PRIMERO, revalidando de fondo
 *
 * El index.html tiene que salir de la red siempre que haya conexión: es el que
 * dice qué assets con hash cargar. Si se sirviera de caché como antes, quien ya
 * tuviera el juego instalado se quedaba con la versión vieja para siempre.
 */

const VERSION = 'dev';   /* swConAssets: VERSION */
const ASSETS = [];       /* swConAssets: ASSETS */

const CACHE = 'rutina-legendaria-' + VERSION;

const ESENCIALES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icono-192.png',
  './icono-512.png',
  './icono-maskable.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ESENCIALES.concat(ASSETS)))
      .catch(() => { })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ¿Es la petición del documento en sí? */
function esNavegacion(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

/* ¿Es un asset con hash en el nombre? Esos nunca cambian de contenido. */
function esAssetConHash(url) {
  return url.pathname.includes('/assets/');
}

async function redPrimero(req) {
  try {
    const res = await fetch(req);
    const c = await caches.open(CACHE);
    c.put(req, res.clone()).catch(() => { });
    return res;
  } catch {
    // Sin conexión: servimos lo último que quedó guardado.
    const hit = await caches.match(req);
    return hit || caches.match('./index.html');
  }
}

async function cachePrimero(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  const c = await caches.open(CACHE);
  c.put(req, res.clone()).catch(() => { });
  return res;
}

/* Devuelve la caché al toque y actualiza de fondo para la próxima visita. */
async function cacheYRevalida(req) {
  const hit = await caches.match(req);
  const red = fetch(req).then(res => {
    caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => { });
    return res;
  }).catch(() => null);
  return hit || red || fetch(req);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (esNavegacion(req)) { e.respondWith(redPrimero(req)); return; }
  if (esAssetConHash(url)) { e.respondWith(cachePrimero(req)); return; }
  e.respondWith(cacheYRevalida(req));
});
