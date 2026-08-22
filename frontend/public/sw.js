/*
 * Service worker for the Evinki System PWA.
 *
 * Two rules do most of the work:
 *
 *   - API traffic is never cached. Responses carry per-user data behind a
 *     bearer token, and a stale guarantee or part request is worse than no
 *     answer at all. Serving one user's cached response to the next person on
 *     a shared workshop tablet would be worse still.
 *
 *   - Build assets are cache-first. Vite fingerprints their filenames, so a
 *     given URL never changes contents and a new deploy simply asks for new
 *     names.
 *
 * Navigations are network-first with the cached shell as a fallback, so the
 * app still opens on a phone with no signal even though its data will not
 * load.
 */
const VERSION = 'evinki-v1'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const SHELL_URL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([SHELL_URL, '/evinki-logo.png', '/manifest.webmanifest']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !name.startsWith(VERSION))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Anything that changes state, and anything cross-origin, goes straight out.
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache the API. See the note at the top.
  if (url.pathname.startsWith('/api/')) return

  // Navigations: try the network so a fresh deploy is picked up, fall back to
  // the cached shell when offline. The router renders from there.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy))
          return response
        })
        .catch(() =>
          caches.match(SHELL_URL).then((cached) => cached || Response.error())
        )
    )
    return
  }

  // Fingerprinted build output and static files.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    })
  )
})
