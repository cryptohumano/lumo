/**
 * Gestor de alertas para conductores
 * Maneja las alertas en tiempo real con polling
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { DriverAlertModal } from './DriverAlertModal'
import type { DriverAlert } from '@/types'
import { UserRole } from '@/types'

export function DriverAlertManager() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<DriverAlert[]>([])
  const [currentAlert, setCurrentAlert] = useState<DriverAlert | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Solo cargar alertas si el usuario es conductor
    if (!user || user.role !== UserRole.DRIVER) {
      setIsLoading(false)
      return
    }

    loadAlerts()
    
    // Polling cada 5 segundos para alertas nuevas
    const interval = setInterval(loadAlerts, 5000)
    
    return () => clearInterval(interval)
  }, [user])

  const loadAlerts = async () => {
    try {
      const result = await api.getDriverAlerts({
        status: 'PENDING',
        includeExpired: false,
      })
      
      // Mapear datos del API a tipo completo DriverAlert
      const mappedAlerts: DriverAlert[] = result.alerts.map(alert => ({
        ...alert,
        driverId: user?.id || '',
        status: alert.status as any,
        updatedAt: alert.createdAt, // Usar createdAt como fallback si no viene updatedAt
      }))
      
      // Filtrar alertas expiradas
      const now = new Date()
      const activeAlerts = mappedAlerts.filter(alert => {
        const expiresAt = new Date(alert.expiresAt)
        return expiresAt > now
      })
      
      setAlerts(activeAlerts)
      
      // Mostrar la primera alerta pendiente si no hay ninguna mostrándose
      if (activeAlerts.length > 0 && !currentAlert) {
        setCurrentAlert(activeAlerts[0])
        // Marcar como vista
        try {
          await api.markAlertAsViewed(activeAlerts[0].id)
        } catch (error) {
          console.error('Error marking alert as viewed:', error)
        }
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (alertId: string, vehicleId?: string): Promise<void> => {
    try {
      await api.acceptTripFromAlert(alertId, vehicleId)
      
      // Remover la alerta aceptada
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      setCurrentAlert(null)
      
      // Cargar nuevas alertas
      setTimeout(loadAlerts, 1000)
    } catch (error) {
      throw error
    }
  }

  const handleReject = async (alertId: string, reason?: string) => {
    try {
      await api.rejectTripFromAlert(alertId, reason)
      
      // Remover la alerta rechazada
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      setCurrentAlert(null)
      
      // Cargar nuevas alertas
      setTimeout(loadAlerts, 1000)
    } catch (error) {
      throw error
    }
  }

  const handleClose = () => {
    setCurrentAlert(null)
    // Si hay más alertas, mostrar la siguiente
    const remainingAlerts = alerts.filter(a => a.id !== currentAlert?.id)
    if (remainingAlerts.length > 0) {
      setCurrentAlert(remainingAlerts[0])
    }
  }

  // Solo mostrar para conductores - después de todos los hooks
  if (!user || user.role !== UserRole.DRIVER) {
    return null
  }

  if (isLoading || !currentAlert) {
    return null
  }

  return (
    <DriverAlertModal
      alert={currentAlert}
      onAccept={handleAccept}
      onReject={handleReject}
      onClose={handleClose}
    />
  )
}

