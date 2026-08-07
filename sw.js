/* Adams Sizer service worker.
   Network-first for the page itself so a new deploy lands on the FIRST refresh,
   cache-first for everything else so the tool still works with no signal. */
const CACHE = 'adams-sizer-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isPage(req) {
  return req.mode === 'navigate' || new URL(req.url).pathname.endsWith('/index.html')
      || new URL(req.url).pathname.endsWith('/');
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // The page: try the network, fall back to cache when offline.
  if (isPage(e.request)) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
        }
        return res;
      }).catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Everything else: cache-first.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
