/**
 * Servicio para manejar notificaciones push
 * Permite recibir notificaciones incluso cuando el usuario está fuera del navegador
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/**
 * Solicita permisos para notificaciones y registra el Service Worker
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    console.warn('Permisos de notificación denegados')
    return false
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/**
 * Registra el Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Este navegador no soporta Service Workers')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    
    console.log('Service Worker registrado:', registration)
    return registration
  } catch (error) {
    console.error('Error registrando Service Worker:', error)
    return null
  }
}

/**
 * Obtiene el token de suscripción para notificaciones push
 */
export async function getPushSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID_PUBLIC_KEY no configurada')
        return null
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    return subscription
  } catch (error) {
    console.error('Error obteniendo suscripción push:', error)
    return null
  }
}

/**
 * Convierte una clave VAPID de base64 URL a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Inicializa el sistema de notificaciones push
 */
export async function initializePushNotifications(): Promise<{
  permission: boolean
  subscription: PushSubscription | null
}> {
  // 1. Solicitar permisos
  const permission = await requestNotificationPermission()
  if (!permission) {
    return { permission: false, subscription: null }
  }

  // 2. Registrar Service Worker
  const registration = await registerServiceWorker()
  if (!registration) {
    return { permission: true, subscription: null }
  }

  // 3. Obtener suscripción push
  const subscription = await getPushSubscription(registration)

  return { permission: true, subscription }
}

/**
 * Envía el token de suscripción al backend
 */
// Helper para obtener la URL base de la API (misma lógica que api.ts)
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL
  const hostname = window.location.hostname
  
  // En desarrollo, siempre usar localhost:3000 si estamos en localhost
  if (import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return 'http://localhost:3000/api'
  }
  
  // Si la URL contiene lumo.peranto.app pero estamos en desarrollo local, usar localhost
  if (import.meta.env.DEV && envUrl && envUrl.includes('lumo.peranto.app') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return 'http://localhost:3000/api'
  }
  
  if (envUrl && envUrl !== 'undefined') {
    // Si la URL del env usa localhost pero estamos accediendo desde la red, usar la IP del servidor
    if (envUrl.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const serverIP = hostname
      return envUrl.replace('localhost', serverIP)
    }
    return envUrl
  }
  
  // Fallback: detectar automáticamente
  if (import.meta.env.DEV) {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api'
    } else {
      // Estamos en la red, usar la IP del servidor
      return `http://${hostname}:3000/api`
    }
  }
  
  // Fallback para producción
  return '/api'
}

export async function sendSubscriptionToBackend(
  subscription: PushSubscription,
  userId: string
): Promise<boolean> {
  try {
    const apiUrl = getApiBaseUrl()
    // Forzar HTTP si la URL es HTTPS (para evitar errores de certificado)
    const finalUrl = apiUrl.startsWith('https://') ? apiUrl.replace('https://', 'http://') : apiUrl
    
    const response = await fetch(`${finalUrl}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON()
      })
    })

    return response.ok
  } catch (error) {
    console.error('Error enviando suscripción al backend:', error)
    return false
  }
}

