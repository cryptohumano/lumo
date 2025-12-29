/**
 * Componente de campana de notificaciones
 * Muestra el contador de notificaciones no leídas
 */

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { NotificationPanel } from './NotificationPanel'
import { useTranslation } from 'react-i18next'

export function NotificationBell() {
  const { t } = useTranslation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUnreadCount()
    
    // Polling cada 30 segundos para actualizar el contador
    const interval = setInterval(loadUnreadCount, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    try {
      const result = await api.getUnreadNotificationCount()
      setUnreadCount(result.count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationRead = () => {
    // Actualizar contador cuando se marca una notificación como leída
    loadUnreadCount()
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <NotificationPanel
          onClose={() => setIsOpen(false)}
          onNotificationRead={handleNotificationRead}
        />
      )}
    </div>
  )
}

