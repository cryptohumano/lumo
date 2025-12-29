/**
 * Hook para manejar notificaciones push
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  initializePushNotifications,
  sendSubscriptionToBackend,
} from '@/services/pushNotificationService'

export function usePushNotifications() {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar soporte
    const supported = 'Notification' in window && 'serviceWorker' in navigator
    setIsSupported(supported)

    if (!supported || !user) {
      setIsLoading(false)
      return
    }

    // Inicializar notificaciones push
    const init = async () => {
      try {
        const { permission, subscription } = await initializePushNotifications()
        setIsEnabled(permission)

        // Si hay suscripción, enviarla al backend
        if (subscription && user) {
          await sendSubscriptionToBackend(subscription, user.id)
        }
      } catch (error) {
        console.error('Error inicializando notificaciones push:', error)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [user])

  return {
    isSupported,
    isEnabled,
    isLoading,
  }
}

