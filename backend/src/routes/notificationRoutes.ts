/**
 * Rutas de notificaciones
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
  getUnreadCount,
} from '../services/notificationService'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticate)

/**
 * GET /api/notifications
 * Obtiene las notificaciones del usuario autenticado
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id
    const status = req.query.status as string | undefined
    const type = req.query.type as string | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const result = await getUserNotifications(userId, {
      status: status as any,
      type: type as any,
      page,
      limit,
    })

    res.json(result)
  } catch (error: any) {
    console.error('Error getting notifications:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/notifications/unread-count
 * Obtiene el conteo de notificaciones no leídas
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user!.id
    const count = await getUnreadCount(userId)

    res.json({ count })
  } catch (error: any) {
    console.error('Error getting unread count:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * PATCH /api/notifications/:id/read
 * Marca una notificación como leída
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user!.id
    const notificationId = req.params.id

    const notification = await markNotificationAsRead(notificationId, userId)

    res.json(notification)
  } catch (error: any) {
    console.error('Error marking notification as read:', error)
    if (error.message === 'Notificación no encontrada') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      })
    }
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * PATCH /api/notifications/read-all
 * Marca todas las notificaciones como leídas
 */
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user!.id
    const result = await markAllNotificationsAsRead(userId)

    res.json(result)
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * PATCH /api/notifications/:id/archive
 * Archiva una notificación
 */
router.patch('/:id/archive', async (req, res) => {
  try {
    const userId = req.user!.id
    const notificationId = req.params.id

    const notification = await archiveNotification(notificationId, userId)

    res.json(notification)
  } catch (error: any) {
    console.error('Error archiving notification:', error)
    if (error.message === 'Notificación no encontrada') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      })
    }
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

export default router

