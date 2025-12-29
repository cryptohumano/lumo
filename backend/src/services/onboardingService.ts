/**
 * Servicio para manejo del onboarding de conductores
 */

import { PrismaClient, DriverOnboardingStatus, DriverDocumentType, DocumentStatus } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateOnboardingData {
  fullName?: string
  dateOfBirth?: Date
  nationalId?: string
  address?: string
  city?: string
  country?: string
  driverType?: 'INDEPENDENT' | 'COMPANY'
  companyName?: string
  companyTaxId?: string
  companyAddress?: string
  companyCity?: string
  companyCountry?: string
  taxId?: string
  taxIdType?: string
}

export interface UpdateOnboardingData {
  fullName?: string
  dateOfBirth?: Date
  nationalId?: string
  address?: string
  city?: string
  country?: string
  driverType?: 'INDEPENDENT' | 'COMPANY'
  companyName?: string
  companyTaxId?: string
  companyAddress?: string
  companyCity?: string
  companyCountry?: string
  taxId?: string
  taxIdType?: string
  licenseNumber?: string
  licenseExpiryDate?: Date
  licenseIssuedBy?: string
  bankName?: string
  accountNumber?: string
  accountType?: string
  routingNumber?: string
  bankCountry?: string
  currentStep?: number
}

export interface UploadDocumentData {
  type: DriverDocumentType
  fileName: string
  fileUrl: string
  fileSize?: number
  mimeType?: string
}

/**
 * Obtiene o crea el registro de onboarding para un conductor
 */
export async function getOrCreateOnboarding(userId: string) {
  let onboarding = await prisma.driverOnboarding.findUnique({
    where: { userId },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' }
      },
      vehicle: true
    }
  })

  if (!onboarding) {
    onboarding = await prisma.driverOnboarding.create({
      data: {
        userId,
        status: DriverOnboardingStatus.NOT_STARTED,
        currentStep: 0,
        totalSteps: 5
      },
      include: {
        documents: true,
        vehicle: true
      }
    })
  }

  return onboarding
}

/**
 * Obtiene el estado del onboarding de un conductor
 */
export async function getOnboardingStatus(userId: string) {
  return await getOrCreateOnboarding(userId)
}

/**
 * Inicia el proceso de onboarding
 */
export async function startOnboarding(userId: string, data: CreateOnboardingData) {
  const onboarding = await getOrCreateOnboarding(userId)

  const updateData: any = {
    status: DriverOnboardingStatus.IN_PROGRESS,
    currentStep: 1,
    ...data
  }

  const updated = await prisma.driverOnboarding.update({
    where: { id: onboarding.id },
    data: updateData,
    include: {
      documents: {
        orderBy: { createdAt: 'desc' }
      },
      vehicle: true
    }
  })

  return updated
}

/**
 * Actualiza la información del onboarding
 */
export async function updateOnboarding(userId: string, data: UpdateOnboardingData) {
  const onboarding = await getOrCreateOnboarding(userId)

  const wasPendingReview = onboarding.status === DriverOnboardingStatus.PENDING_REVIEW
  const willBePendingReview = data.currentStep !== undefined && data.currentStep >= onboarding.totalSteps

  const updateData: any = {
    ...data,
    status: willBePendingReview
      ? DriverOnboardingStatus.PENDING_REVIEW
      : DriverOnboardingStatus.IN_PROGRESS
  }

  const updated = await prisma.driverOnboarding.update({
    where: { id: onboarding.id },
    data: updateData,
    include: {
      documents: {
        orderBy: { createdAt: 'desc' }
      },
      vehicle: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  // Si se marca como PENDING_REVIEW y antes no lo estaba, notificar a administradores
  if (willBePendingReview && !wasPendingReview) {
    setImmediate(async () => {
      try {
        const { createGlobalNotification } = await import('./notificationService')
        const { NotificationType, NotificationChannel, NotificationPriority } = await import('@prisma/client')
        
        await createGlobalNotification({
          type: NotificationType.SYSTEM_ALERT,
          title: 'Nueva solicitud de onboarding pendiente',
          message: `${updated.user?.name || 'Un conductor'} ha actualizado su información de licencia y documentos. Requiere revisión.`,
          priority: NotificationPriority.HIGH,
          channels: [NotificationChannel.IN_APP],
          data: {
            onboardingId: updated.id,
            userId: userId,
            driverName: updated.user?.name,
            driverEmail: updated.user?.email
          },
          actionUrl: '/admin/onboarding',
          actionLabel: 'Revisar solicitud'
        }, { role: 'ADMIN' })
      } catch (error) {
        console.error('Error creando notificación para administradores:', error)
      }
    })
  }

  return updated
}

/**
 * Sube un documento para el onboarding
 */
export async function uploadDocument(userId: string, data: UploadDocumentData) {
  const onboarding = await getOrCreateOnboarding(userId)

  const document = await prisma.driverDocument.create({
    data: {
      onboardingId: onboarding.id,
      ...data,
      status: DocumentStatus.PENDING
    }
  })

  // Verificar el estado actual antes de actualizar
  const currentStatus = onboarding.status
  const wasPendingReview = currentStatus === DriverOnboardingStatus.PENDING_REVIEW
  
  // Si ya estaba en PENDING_REVIEW, mantenerlo así (no cambiar a IN_PROGRESS)
  // Solo cambiar a IN_PROGRESS si estaba en otro estado
  const newStatus = wasPendingReview 
    ? DriverOnboardingStatus.PENDING_REVIEW 
    : DriverOnboardingStatus.IN_PROGRESS

  // Obtener el onboarding con el usuario para las notificaciones
  const updatedOnboarding = await prisma.driverOnboarding.update({
    where: { id: onboarding.id },
    data: {
      status: newStatus
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

  // Si el onboarding está en PENDING_REVIEW (ya sea que ya estaba o se acaba de marcar), notificar a administradores
  if (updatedOnboarding.status === DriverOnboardingStatus.PENDING_REVIEW) {
    setImmediate(async () => {
      try {
        const { createGlobalNotification } = await import('./notificationService')
        const { NotificationType, NotificationChannel, NotificationPriority } = await import('@prisma/client')
        
        await createGlobalNotification({
          type: NotificationType.SYSTEM_ALERT,
          title: 'Documentos actualizados en onboarding',
          message: `${updatedOnboarding.user?.name || 'Un conductor'} ha subido nuevos documentos. Requiere revisión.`,
          priority: NotificationPriority.HIGH,
          channels: [NotificationChannel.IN_APP],
          data: {
            onboardingId: updatedOnboarding.id,
            userId: userId,
            driverName: updatedOnboarding.user?.name,
            driverEmail: updatedOnboarding.user?.email,
            documentType: data.type
          },
          actionUrl: '/admin/onboarding',
          actionLabel: 'Revisar documentos'
        }, { role: 'ADMIN' })
      } catch (error) {
        console.error('Error creando notificación para administradores:', error)
      }
    })
  }

  return document
}

/**
 * Elimina un documento
 */
export async function deleteDocument(userId: string, documentId: string) {
  const onboarding = await getOrCreateOnboarding(userId)

  const document = await prisma.driverDocument.findFirst({
    where: {
      id: documentId,
      onboardingId: onboarding.id
    }
  })

  if (!document) {
    throw new Error('Documento no encontrado')
  }

  await prisma.driverDocument.delete({
    where: { id: documentId }
  })

  return { success: true }
}

/**
 * Asocia un vehículo al onboarding
 */
export async function linkVehicleToOnboarding(userId: string, vehicleId: string) {
  const onboarding = await getOrCreateOnboarding(userId)

  // Verificar que el vehículo pertenece al usuario
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId
    }
  })

  if (!vehicle) {
    throw new Error('Vehículo no encontrado o no pertenece al usuario')
  }

  const updated = await prisma.driverOnboarding.update({
    where: { id: onboarding.id },
    data: {
      vehicleId,
      currentStep: Math.max(onboarding.currentStep, 5), // Paso 5 es el registro de vehículo
      status: onboarding.currentStep >= 5
        ? DriverOnboardingStatus.PENDING_REVIEW
        : DriverOnboardingStatus.IN_PROGRESS
    },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' }
      },
      vehicle: true
    }
  })

  return updated
}

/**
 * Completa el onboarding (marca como listo para revisión)
 */
export async function completeOnboarding(userId: string) {
  const onboarding = await getOrCreateOnboarding(userId)

  // Verificar que todos los pasos estén completos
  const requiredDocuments = [
    DriverDocumentType.NATIONAL_ID_FRONT,
    DriverDocumentType.DRIVER_LICENSE_FRONT
  ]

  const documents = await prisma.driverDocument.findMany({
    where: {
      onboardingId: onboarding.id,
      type: { in: requiredDocuments }
    }
  })

  const hasRequiredDocs = requiredDocuments.every(type =>
    documents.some(doc => doc.type === type)
  )

  if (!hasRequiredDocs) {
    throw new Error('Faltan documentos requeridos')
  }

  if (!onboarding.vehicleId) {
    throw new Error('Debe registrar un vehículo antes de completar el onboarding')
  }

  const updated = await prisma.driverOnboarding.update({
    where: { id: onboarding.id },
    data: {
      status: DriverOnboardingStatus.PENDING_REVIEW,
      currentStep: onboarding.totalSteps
    },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' }
      },
      vehicle: true
    }
  })

  return updated
}

/**
 * Obtiene todos los onboarding pendientes de revisión (para admin)
 */
export async function getPendingOnboardings() {
  return await prisma.driverOnboarding.findMany({
    where: {
      status: DriverOnboardingStatus.PENDING_REVIEW
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true
        }
      },
      documents: {
        orderBy: { createdAt: 'desc' }
      },
      vehicle: true
    },
    orderBy: { createdAt: 'asc' }
  })
}

/**
 * Aprueba un onboarding (para admin)
 */
export async function approveOnboarding(onboardingId: string, adminId: string) {
  const onboarding = await prisma.driverOnboarding.findUnique({
    where: { id: onboardingId },
    include: { user: true }
  })

  if (!onboarding) {
    throw new Error('Onboarding no encontrado')
  }

  // Actualizar onboarding
  const updated = await prisma.driverOnboarding.update({
    where: { id: onboardingId },
    data: {
      status: DriverOnboardingStatus.APPROVED,
      reviewedBy: adminId,
      reviewedAt: new Date()
    },
    include: {
      documents: true,
      vehicle: true,
      user: true
    }
  })

  // Crear notificación para el conductor
  try {
    const { createNotification } = await import('./notificationService')
    const { NotificationType, NotificationChannel, NotificationPriority } = await import('@prisma/client')
    await createNotification({
      userId: updated.user.id,
      type: NotificationType.DRIVER_ONBOARDING_APPROVED,
      title: '¡Onboarding aprobado!',
      message: 'Tu solicitud de conductor ha sido aprobada. Ya puedes comenzar a recibir viajes.',
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP],
      data: {
        onboardingId: updated.id,
        reviewedBy: adminId
      },
      actionUrl: '/driver/dashboard',
      actionLabel: 'Ver dashboard'
    })
  } catch (error) {
    console.error('Error creando notificación de aprobación:', error)
  }

  // Actualizar documentos como verificados
  await prisma.driverDocument.updateMany({
    where: {
      onboardingId,
      status: DocumentStatus.PENDING
    },
    data: {
      status: DocumentStatus.VERIFIED,
      verifiedBy: adminId,
      verifiedAt: new Date()
    }
  })

  // Aprobar el vehículo asociado
  if (updated.vehicleId) {
    await prisma.vehicle.update({
      where: { id: updated.vehicleId },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
        isVerified: true
      }
    })
  }

  // Marcar el usuario como verificado y activar rol de conductor si no lo tiene
  const user = await prisma.user.findUnique({
    where: { id: onboarding.userId },
    include: { userRoles: true }
  })

  if (user) {
    const hasDriverRole = user.role === 'DRIVER' || user.userRoles.some(ur => ur.role === 'DRIVER')
    
    if (!hasDriverRole) {
      // Agregar rol de conductor
      await prisma.userRoleAssignment.create({
        data: {
          userId: user.id,
          role: 'DRIVER'
        }
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        isActive: true
      }
    })
  }

  // Marcar onboarding como completado
  await prisma.driverOnboarding.update({
    where: { id: onboardingId },
    data: {
      status: DriverOnboardingStatus.COMPLETED
    }
  })

  return updated
}

/**
 * Rechaza un onboarding (para admin)
 */
export async function rejectOnboarding(onboardingId: string, adminId: string, reason: string) {
  const onboarding = await prisma.driverOnboarding.findUnique({
    where: { id: onboardingId }
  })

  if (!onboarding) {
    throw new Error('Onboarding no encontrado')
  }

  const updated = await prisma.driverOnboarding.update({
    where: { id: onboardingId },
    data: {
      status: DriverOnboardingStatus.REJECTED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectionReason: reason
    },
    include: {
      documents: true,
      vehicle: true,
      user: true
    }
  })

  // Crear notificación para el conductor
  try {
    const { createNotification } = await import('./notificationService')
    const { NotificationType, NotificationChannel, NotificationPriority } = await import('@prisma/client')
    await createNotification({
      userId: updated.user.id,
      type: NotificationType.DRIVER_ONBOARDING_REJECTED,
      title: 'Onboarding rechazado',
      message: `Tu solicitud de conductor ha sido rechazada. Razón: ${reason}`,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP],
      data: {
        onboardingId: updated.id,
        reviewedBy: adminId,
        reason
      },
      actionUrl: '/driver/onboarding',
      actionLabel: 'Ver detalles'
    })
  } catch (error) {
    console.error('Error creando notificación de rechazo:', error)
  }

  return updated
}

