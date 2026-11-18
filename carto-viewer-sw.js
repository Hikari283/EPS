/* CARTO Viewer: オフラインでも開けるようにするだけのService Worker。
   ページ本体は「ネットが使えれば常に最新版、使えなければ前回の版」を返します（更新の貼り直しは不要）。
   症例データはここを通らず、このPCの中だけで処理されます。 */
const CACHE = 'carto-viewer-v1';
const FILES = ['./carto-viewer.html', './carto-viewer.webmanifest', './carto-viewer-icon-192.png', './carto-viewer-icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./carto-viewer.html')))
  );
});
