/**
 * Service Worker para notificaciones push
 * Permite recibir notificaciones incluso cuando el usuario está fuera del navegador
 */

const CACHE_NAME = 'lumo-v2'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache abierto')
        return cache.addAll(urlsToCache)
      })
  )
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando cache antiguo', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Interceptar requests para cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Solo interceptar peticiones del mismo origen
  if (url.origin !== self.location.origin) {
    // No interceptar peticiones a otros orígenes
    return
  }
  
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') {
    return
  }
  
  // No interceptar peticiones a recursos de desarrollo de Vite
  if (url.pathname.startsWith('/@vite/') || url.pathname.startsWith('/@react-refresh')) {
    return
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - devolver respuesta
        if (response) {
          return response
        }
        // Intentar hacer fetch, pero manejar errores
        return fetch(event.request)
          .then((response) => {
            // Verificar que la respuesta sea válida
            if (!response || response.status !== 200 || response.type === 'error') {
              return response
            }
            // Clonar la respuesta para cachearla
            const responseToCache = response.clone()
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })
              .catch((err) => {
                console.log('Service Worker: Error al cachear:', err)
              })
            return response
          })
          .catch((error) => {
            console.log('Service Worker: Error en fetch:', error)
            // Si falla el fetch y no hay cache, devolver una respuesta de error
            // pero no lanzar el error para evitar que se propague
            return new Response('Network error', { status: 408, statusText: 'Request Timeout' })
          })
      })
      .catch((error) => {
        console.log('Service Worker: Error en cache match:', error)
        // Si falla todo, intentar hacer fetch directamente
        return fetch(event.request).catch(() => {
          return new Response('Service unavailable', { status: 503 })
        })
      })
  )
})

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push recibido', event)
  
  let notificationData = {
    title: 'Operations',
    body: 'Tienes una nueva notificación',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'operations-notification',
    requireInteraction: false,
    data: {}
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
        actions: data.actions || []
      }
    } catch (e) {
      console.error('Error parsing push data:', e)
      notificationData.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    })
  )
})

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notificación clickeada', event)
  
  event.notification.close()

  const notificationData = event.notification.data
  let urlToOpen = '/'

  if (notificationData && notificationData.actionUrl) {
    urlToOpen = notificationData.actionUrl
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Manejar acciones de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notificación cerrada', event)
})

