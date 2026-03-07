// Clarity Service Worker
const CACHE_NAME = 'clarity-v1'

// Pages to pre-cache for offline support
const PRECACHE_URLS = [
  '/dashboard',
]

// Install: pre-cache key pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API/auth, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Always use network for API routes, auth, and non-GET requests
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('supabase')
  ) {
    return
  }

  // For navigation requests: network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request) ?? caches.match('/dashboard'))
    )
    return
  }

  // For static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    })
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Clarity', {
      body: data.message ?? '',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: data.type ?? 'clarity',
      data: { url: data.url ?? '/dashboard' },
    })
  )
})

// Notification click: focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus().then((c) => c.navigate(target))
      return self.clients.openWindow(target)
    })
  )
})
