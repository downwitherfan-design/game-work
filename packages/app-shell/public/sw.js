/**
 * Service Worker دُردانه — آفلاین-اول (خط قرمز ۱۸).
 * راهبرد: precache پوسته + cache-first برای اسکریپت/استایل هش‌دار vite +
 * network-falling-back-to-cache برای ناوبری (SPA fallback به index.html).
 * نسخه را با هر انتشار عوض کنید تا کش کهنه پاک شود.
 */
const VERSION = 'dor-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // فقط same-origin

  // ناوبری SPA: شبکه → فالبک کش → فالبک index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html'))),
    );
    return;
  }

  // دارایی‌های هش‌دار vite (/assets/*): cache-first (immutable)
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
