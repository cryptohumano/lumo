/**
 * Panel de notificaciones
 * Muestra la lista de notificaciones del usuario
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { X, Check, CheckCheck, Archive, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/services/api'
import { toast } from 'sonner'
import type { Notification, NotificationStatus, NotificationPriority } from '@/types'

interface NotificationPanelProps {
  onClose: () => void
  onNotificationRead?: () => void
}

export function NotificationPanel({ onClose, onNotificationRead }: NotificationPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [page])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const result = await api.getNotifications({
        page,
        limit: 20,
      })
      
      // Mapear datos del API a tipo completo Notification
      const mappedNotifications: Notification[] = result.notifications.map(notif => ({
        ...notif,
        userId: '', // El backend no devuelve userId, pero es requerido en el tipo
        channels: [], // El backend no devuelve channels, pero es requerido en el tipo
        priority: notif.priority as NotificationPriority,
        status: notif.status as NotificationStatus,
        updatedAt: notif.createdAt, // Usar createdAt como fallback si no viene updatedAt
      }))
      
      if (page === 1) {
        setNotifications(mappedNotifications)
      } else {
        setNotifications(prev => [...prev, ...mappedNotifications])
      }
      
      setHasMore(result.page < result.totalPages)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error(t('notifications.loadError') || 'Error al cargar notificaciones')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'READ' as NotificationStatus, readAt: new Date().toISOString() } : n)
      )
      onNotificationRead?.()
      toast.success(t('notifications.markedAsRead') || 'Notificación marcada como leída')
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error(t('notifications.markError') || 'Error al marcar notificación')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'READ' as NotificationStatus, readAt: new Date().toISOString() }))
      )
      onNotificationRead?.()
      toast.success(t('notifications.allMarkedAsRead') || 'Todas las notificaciones marcadas como leídas')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error(t('notifications.markAllError') || 'Error al marcar todas las notificaciones')
    }
  }

  const handleArchive = async (notificationId: string) => {
    try {
      await api.archiveNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast.success(t('notifications.archived') || 'Notificación archivada')
    } catch (error) {
      console.error('Error archiving notification:', error)
      toast.error(t('notifications.archiveError') || 'Error al archivar notificación')
    }
  }

  const handleAction = async (notification: Notification) => {
    if (notification.actionUrl) {
      // Marcar como leída si no lo está
      if (notification.status === 'UNREAD') {
        try {
          await api.markNotificationAsRead(notification.id)
          setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, status: 'READ' as NotificationStatus, readAt: new Date().toISOString() } : n)
          )
          onNotificationRead?.()
        } catch (error) {
          console.error('Error marking notification as read:', error)
        }
      }

      // Cerrar el panel antes de navegar
      onClose()

      // Navegar después de un pequeño delay para que el panel se cierre suavemente
      setTimeout(() => {
        if (notification.actionUrl) {
          if (notification.actionUrl.startsWith('http')) {
            window.open(notification.actionUrl, '_blank')
          } else {
            navigate(notification.actionUrl)
          }
        }
      }, 100)
    }
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive'
      case 'HIGH':
        return 'default'
      case 'NORMAL':
        return 'secondary'
      case 'LOW':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return t('notifications.justNow') || 'Ahora'
    if (minutes < 60) return `${minutes} ${t('notifications.minutesAgo') || 'min'}`
    if (hours < 24) return `${hours} ${t('notifications.hoursAgo') || 'h'}`
    return `${days} ${t('notifications.daysAgo') || 'd'}`
  }

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length

  return (
    <>
      {/* Overlay para móvil */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      <Card className="fixed md:absolute right-0 top-0 md:top-12 w-full md:w-96 h-screen md:h-auto z-50 shadow-lg md:rounded-lg rounded-none border-0 md:border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 md:pt-6">
          <CardTitle className="text-base md:text-lg">
            {t('notifications.title') || 'Notificaciones'}
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                title={t('notifications.markAllAsRead') || 'Marcar todas como leídas'}
                className="h-8 w-8 p-0"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-80px)] md:h-[500px]">
          {isLoading && notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {t('common.loading') || 'Cargando...'}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>{t('notifications.noNotifications') || 'No hay notificaciones'}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 md:p-4 hover:bg-accent transition-colors ${
                    notification.status === 'UNREAD' ? 'bg-muted/50' : ''
                  } ${notification.actionUrl ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    // Solo navegar si se hace clic en el área principal, no en los botones
                    if (notification.actionUrl && !(e.target as HTMLElement).closest('button')) {
                      handleAction(notification)
                    }
                  }}
                >
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={getPriorityColor(notification.priority)} className="text-[10px] md:text-xs">
                          {notification.priority}
                        </Badge>
                        {notification.status === 'UNREAD' && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <h4 className="font-semibold text-xs md:text-sm mb-1 line-clamp-2">{notification.title}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground mb-2 line-clamp-2">{notification.message}</p>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] md:text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {notification.status === 'UNREAD' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                              title={t('notifications.markAsRead') || 'Marcar como leída'}
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchive(notification.id)
                            }}
                            title={t('notifications.archive') || 'Archivar'}
                            className="h-7 w-7 p-0"
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                          {notification.actionUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAction(notification)
                              }}
                              title={notification.actionLabel || t('notifications.view') || 'Ver'}
                              className="h-7 w-7 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasMore && !isLoading && (
            <div className="p-3 md:p-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                className="text-xs md:text-sm"
              >
                {t('common.loadMore') || 'Cargar más'}
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
    </>
  )
}

