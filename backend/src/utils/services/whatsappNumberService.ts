/**
 * Servicio para manejo de números de WhatsApp
 */

import { PrismaClient, WhatsAppNumber } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateWhatsAppNumberData {
  userId: string
  phoneNumber: string
  name?: string
  isPrimary?: boolean
  isActive?: boolean
  metadata?: any
}

/**
 * Crea un nuevo número de WhatsApp
 */
export async function createWhatsAppNumber(data: CreateWhatsAppNumberData): Promise<WhatsAppNumber> {
  // Verificar que el número no exista
  const existing = await prisma.whatsAppNumber.findUnique({
    where: { phoneNumber: data.phoneNumber }
  })

  if (existing) {
    throw new Error('El número de WhatsApp ya está registrado')
  }

  // Si es primario, desmarcar otros números primarios del mismo usuario
  if (data.isPrimary) {
    await prisma.whatsAppNumber.updateMany({
      where: {
        userId: data.userId,
        isPrimary: true
      },
      data: {
        isPrimary: false
      }
    })
  }

  // Crear número
  const whatsappNumber = await prisma.whatsAppNumber.create({
    data: {
      userId: data.userId,
      phoneNumber: data.phoneNumber,
      name: data.name,
      isPrimary: data.isPrimary || false,
      isActive: true,
      metadata: data.metadata || {}
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  return whatsappNumber
}

/**
 * Obtiene los números de WhatsApp de un usuario
 */
export async function getWhatsAppNumbersByUser(userId: string) {
  const numbers = await prisma.whatsAppNumber.findMany({
    where: { userId },
    orderBy: [
      { isPrimary: 'desc' },
      { createdAt: 'desc' }
    ],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          interactions: true
        }
      }
    }
  })

  return numbers
}

/**
 * Obtiene el número primario de un usuario
 */
export async function getPrimaryWhatsAppNumber(userId: string): Promise<WhatsAppNumber | null> {
  const number = await prisma.whatsAppNumber.findFirst({
    where: {
      userId,
      isPrimary: true,
      isActive: true
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  return number
}

/**
 * Actualiza un número de WhatsApp
 */
export async function updateWhatsAppNumber(
  id: string,
  data: Partial<CreateWhatsAppNumberData>
): Promise<WhatsAppNumber> {
  // Si se marca como primario, desmarcar otros
  if (data.isPrimary) {
    const current = await prisma.whatsAppNumber.findUnique({
      where: { id }
    })

    if (current) {
      await prisma.whatsAppNumber.updateMany({
        where: {
          userId: current.userId,
          isPrimary: true,
          id: { not: id }
        },
        data: {
          isPrimary: false
        }
      })
    }
  }

  const updated = await prisma.whatsAppNumber.update({
    where: { id },
    data: {
      name: data.name,
      isPrimary: data.isPrimary,
      isActive: data.isActive !== undefined ? data.isActive : undefined,
      metadata: data.metadata
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  return updated
}

/**
 * Desactiva un número de WhatsApp
 */
export async function deactivateWhatsAppNumber(id: string): Promise<WhatsAppNumber> {
  return prisma.whatsAppNumber.update({
    where: { id },
    data: { isActive: false },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })
}





