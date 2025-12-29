/**
 * Servicio para manejo de WhatsApp
 * Registra interacciones y envía mensajes
 */

import { PrismaClient, InteractionType, InteractionDirection, InteractionStatus } from '@prisma/client'

const prisma = new PrismaClient()

export interface SendMessageData {
  whatsappNumberId: string
  to: string // Número de teléfono destino
  message: string
  type?: InteractionType
  metadata?: any
  userId?: string
  tripId?: string
}

export interface RecordInteractionData {
  whatsappNumberId: string
  phoneNumber: string
  message: string
  direction: InteractionDirection
  type: InteractionType
  messageId?: string
  status?: InteractionStatus
  metadata?: any
  userId?: string
  tripId?: string
}

/**
 * Registra una interacción de WhatsApp en la base de datos
 */
export async function recordInteraction(data: RecordInteractionData) {
  const interaction = await prisma.interaction.create({
    data: {
      whatsappNumberId: data.whatsappNumberId,
      userId: data.userId,
      tripId: data.tripId,
      type: data.type,
      direction: data.direction,
      messageId: data.messageId,
      phoneNumber: data.phoneNumber,
      message: data.message,
      status: data.status || 'PENDING',
      metadata: data.metadata || {},
      sentAt: data.direction === 'OUTBOUND' ? new Date() : undefined,
      receivedAt: data.direction === 'INBOUND' ? new Date() : undefined
    },
    include: {
      whatsappNumber: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  return interaction
}

/**
 * Actualiza el estado de una interacción
 */
export async function updateInteractionStatus(
  interactionId: string,
  status: InteractionStatus,
  messageId?: string
) {
  const interaction = await prisma.interaction.update({
    where: { id: interactionId },
    data: {
      status,
      messageId: messageId || undefined,
      updatedAt: new Date()
    }
  })

  return interaction
}

/**
 * Obtiene las interacciones de un número de WhatsApp
 */
export async function getInteractionsByWhatsAppNumber(
  whatsappNumberId: string,
  limit: number = 50,
  offset: number = 0
) {
  const interactions = await prisma.interaction.findMany({
    where: { whatsappNumberId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      trip: {
        select: {
          id: true,
          tripNumber: true,
          originAddress: true,
          destinationAddress: true,
          status: true
        }
      }
    }
  })

  const total = await prisma.interaction.count({
    where: { whatsappNumberId }
  })

  return {
    interactions,
    total,
    limit,
    offset
  }
}

/**
 * Obtiene las interacciones de un usuario
 */
export async function getInteractionsByUser(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const interactions = await prisma.interaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      whatsappNumber: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      trip: {
        select: {
          id: true,
          tripNumber: true,
          originAddress: true,
          destinationAddress: true,
          status: true
        }
      }
    }
  })

  const total = await prisma.interaction.count({
    where: { userId }
  })

  return {
    interactions,
    total,
    limit,
    offset
  }
}

/**
 * Obtiene las interacciones de un viaje
 */
export async function getInteractionsByTrip(tripId: string) {
  const interactions = await prisma.interaction.findMany({
    where: { tripId },
    orderBy: { createdAt: 'asc' },
    include: {
      whatsappNumber: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  return interactions
}





