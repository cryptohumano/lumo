/**
 * Servicio de notificaciones
 * Maneja la creación y gestión de notificaciones para usuarios
 */

import { PrismaClient, NotificationType, NotificationChannel, NotificationPriority, NotificationStatus } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateNotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: any
  priority?: NotificationPriority
  channels?: NotificationChannel[]
  expiresAt?: Date
  actionUrl?: string
  actionLabel?: string
  metadata?: any
}

/**
 * Crea una notificación para un usuario
 */
export async function createNotification(data: CreateNotificationData) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || null,
      priority: data.priority || NotificationPriority.NORMAL,
      channels: data.channels || [NotificationChannel.IN_APP],
      expiresAt: data.expiresAt || null,
      actionUrl: data.actionUrl || null,
      actionLabel: data.actionLabel || null,
      metadata: data.metadata || null,
      status: NotificationStatus.UNREAD,
    },
  })

  // Aquí se pueden agregar lógicas para enviar por otros canales (email, push, SMS, WhatsApp)
  // según las preferencias del usuario

  return notification
}

/**
 * Crea notificaciones para múltiples usuarios
 */
export async function createBulkNotifications(notifications: CreateNotificationData[]) {
  const created = await prisma.notification.createMany({
    data: notifications.map(n => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data || null,
      priority: n.priority || NotificationPriority.NORMAL,
      channels: n.channels || [NotificationChannel.IN_APP],
      expiresAt: n.expiresAt || null,
      actionUrl: n.actionUrl || null,
      actionLabel: n.actionLabel || null,
      metadata: n.metadata || null,
      status: NotificationStatus.UNREAD,
    })),
  })

  return created
}

/**
 * Crea una notificación global (para todos los usuarios o un rol específico)
 */
export async function createGlobalNotification(
  data: Omit<CreateNotificationData, 'userId'>,
  options?: { role?: string; userIds?: string[] }
) {
  let userIds: string[] = []

  if (options?.userIds) {
    userIds = options.userIds
  } else if (options?.role) {
    const users = await prisma.user.findMany({
      where: {
        role: options.role as any,
        isActive: true,
      },
      select: { id: true },
    })
    userIds = users.map(u => u.id)
  } else {
    // Todos los usuarios activos
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    userIds = users.map(u => u.id)
  }

  if (userIds.length === 0) {
    return { count: 0 }
  }

  const notifications: CreateNotificationData[] = userIds.map(userId => ({
    ...data,
    userId,
  }))

  return createBulkNotifications(notifications)
}

/**
 * Obtiene las notificaciones de un usuario
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    status?: NotificationStatus
    type?: NotificationType
    limit?: number
    page?: number
  }
) {
  const page = options?.page || 1
  const limit = options?.limit || 20
  const skip = (page - 1) * limit

  const where: any = {
    userId,
  }

  if (options?.status) {
    where.status = options.status
  }

  if (options?.type) {
    where.type = options.type
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ])

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  })

  if (!notification) {
    throw new Error('Notificación no encontrada')
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  })
}

/**
 * Marca todas las notificaciones de un usuario como leídas
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      status: NotificationStatus.UNREAD,
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  })
}

/**
 * Archiva una notificación
 */
export async function archiveNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  })

  if (!notification) {
    throw new Error('Notificación no encontrada')
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.ARCHIVED,
      archivedAt: new Date(),
    },
  })
}

/**
 * Obtiene el conteo de notificaciones no leídas
 */
export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      status: NotificationStatus.UNREAD,
    },
  })
}

/**
 * Elimina notificaciones expiradas
 */
export async function deleteExpiredNotifications() {
  const result = await prisma.notification.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
      status: {
        not: NotificationStatus.DELETED,
      },
    },
  })

  return result
}

