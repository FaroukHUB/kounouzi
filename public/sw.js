// Kounouzi : petite mise en cache pour que l'appli s'ouvre vite (images, polices, moteur 3D).
// Les pages et les questions passent d'abord par le réseau ; l'API n'est jamais mise en cache.
const V = 'kz-v2'; // v2 : nouveau logo et nouvelles icônes
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin && u.pathname.startsWith('/api/')) return;
  const statique = (u.origin === location.origin && (u.pathname.startsWith('/img/') || u.pathname === '/manifest.webmanifest'))
    || u.hostname === 'fonts.gstatic.com' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'cdn.jsdelivr.net';
  if (statique) {
    e.respondWith(caches.open(V).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; })));
    return;
  }
  if (u.origin === location.origin && (r.mode === 'navigate' || u.pathname === '/data.json')) {
    e.respondWith(fetch(r).then(res => { if (res.ok && !res.redirected) caches.open(V).then(c => c.put(r, res.clone())); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match(u.pathname.startsWith('/en') ? '/en/' : '/'))));
  }
});
