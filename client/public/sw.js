// Orbloom service worker: keeps a copy of the whole app on the device so it opens with no internet.
// - On the first visit it saves EVERY app file (the list below is filled in by the build),
//   so pages that were never opened online still work offline.
// - The page itself: from the network when possible, otherwise the saved copy.
// - Supabase requests (sign-in, sync, AI) go to another address and are never cached.
const VERSION = '__VERSION__'
const PRECACHE = '__PRECACHE__'
const FILES = Array.isArray(PRECACHE) ? PRECACHE : ['./', './index.html', './manifest.webmanifest', './favicon.svg']
const CACHE = `orbloom-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || fresh
    }),
  )
})
