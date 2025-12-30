/**
 * Servicio para gestionar emergencias
 */

import { prisma } from '../index'
import {
  EmergencyType,
  EmergencySeverity,
  EmergencyStatus,
  EmergencyService as EmergencyServiceType,
} from '@prisma/client'

export interface CreateEmergencyData {
  reportedBy: string
  tripId?: string
  experienceId?: string
  emergencyType: EmergencyType
  severity?: EmergencySeverity
  latitude: number
  longitude: number
  address?: string
  city?: string
  country?: string
  placeId?: string
  title: string
  description: string
  numberOfPeople?: number
  metadata?: any
}

export interface UpdateEmergencyStatusData {
  status: EmergencyStatus
  servicesResponded?: any
  resolution?: string
  metadata?: any
}

export interface ListEmergenciesOptions {
  page?: number
  limit?: number
  status?: EmergencyStatus | EmergencyStatus[]
  emergencyType?: EmergencyType | EmergencyType[]
  severity?: EmergencySeverity | EmergencySeverity[]
  reportedBy?: string
  latitude?: number
  longitude?: number
  radiusKm?: number // Radio en kilómetros para búsqueda por proximidad
  search?: string
}

export interface ListEmergenciesResult {
  emergencies: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Genera un número único de emergencia
 */
function generateEmergencyNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `EMG-${timestamp}-${random}`
}

/**
 * Calcula la distancia en kilómetros entre dos puntos usando la fórmula de Haversine
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radio de la Tierra en kilómetros
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Crea una nueva emergencia
 */
export async function createEmergency(data: CreateEmergencyData) {
  const emergencyNumber = generateEmergencyNumber()

  // Validar que los campos requeridos estén presentes
  if (!data.emergencyType || !data.latitude || !data.longitude || !data.title || !data.description) {
    throw new Error('Faltan campos requeridos: emergencyType, latitude, longitude, title, description')
  }

  // Buscar o crear Place si se proporciona placeId de Google Maps
  let placeDbId: string | null = null
  if (data.placeId) {
    const place = await prisma.place.upsert({
      where: { placeId: data.placeId },
      update: {
        lastFetched: new Date(),
        // Actualizar datos si han cambiado
        formattedAddress: data.address || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city || undefined,
        country: data.country || undefined,
      },
      create: {
        placeId: data.placeId,
        formattedAddress: data.address || 'Ubicación desconocida',
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city || undefined,
        country: data.country || undefined,
        types: [],
      },
    })
    placeDbId = place.id
  }

  const emergency = await prisma.emergency.create({
    data: {
      emergencyNumber,
      reportedBy: data.reportedBy,
      tripId: data.tripId || null,
      experienceId: data.experienceId || null,
      emergencyType: data.emergencyType,
      severity: data.severity || EmergencySeverity.HIGH,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address || null,
      city: data.city || null,
      country: data.country || null,
      placeId: placeDbId,
      title: data.title,
      description: data.description,
      numberOfPeople: data.numberOfPeople || 1,
      status: EmergencyStatus.REPORTED,
      servicesAlerted: [],
      metadata: data.metadata || null,
    },
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      trip: {
        select: {
          id: true,
          tripNumber: true,
          originAddress: true,
          destinationAddress: true,
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          passenger: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      experience: {
        select: {
          id: true,
          title: true,
          host: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      place: {
        select: {
          id: true,
          name: true,
          formattedAddress: true,
        },
      },
    },
  })

  return emergency
}

/**
 * Lista emergencias con paginación y filtros
 */
export async function listEmergencies(options: ListEmergenciesOptions = {}): Promise<ListEmergenciesResult> {
  const {
    page = 1,
    limit = 20,
    status,
    emergencyType,
    severity,
    reportedBy,
    latitude,
    longitude,
    radiusKm,
    search,
  } = options

  const skip = (page - 1) * limit

  // Construir filtros
  const where: any = {}

  if (status) {
    if (Array.isArray(status)) {
      where.status = { in: status }
    } else {
      where.status = status
    }
  }

  if (emergencyType) {
    if (Array.isArray(emergencyType)) {
      where.emergencyType = { in: emergencyType }
    } else {
      where.emergencyType = emergencyType
    }
  }

  if (severity) {
    if (Array.isArray(severity)) {
      where.severity = { in: severity }
    } else {
      where.severity = severity
    }
  }

  if (reportedBy) {
    where.reportedBy = reportedBy
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { emergencyNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Obtener emergencias
  let emergencies = await prisma.emergency.findMany({
    where,
    skip,
    take: limit,
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
        },
      },
      resolver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      trip: {
        select: {
          id: true,
          tripNumber: true,
          originAddress: true,
          destinationAddress: true,
        },
      },
      experience: {
        select: {
          id: true,
          title: true,
        },
      },
      place: {
        select: {
          id: true,
          name: true,
          formattedAddress: true,
        },
      },
      alerts: {
        select: {
          id: true,
          service: true,
          method: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Filtrar por proximidad si se proporcionan coordenadas y radio
  if (latitude !== undefined && longitude !== undefined && radiusKm !== undefined) {
    emergencies = emergencies.filter((emergency) => {
      const distance = calculateDistance(latitude, longitude, emergency.latitude, emergency.longitude)
      return distance <= radiusKm
    })
  }

  // Contar total (sin filtro de proximidad para el conteo)
  const total = await prisma.emergency.count({ where })

  return {
    emergencies,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Obtiene una emergencia por ID
 */
export async function getEmergencyById(emergencyId: string) {
  const emergency = await prisma.emergency.findUnique({
    where: { id: emergencyId },
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          polkadotAddress: true,
          polkadotChain: true,
          peopleChainIdentity: true,
        },
      },
      resolver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      trip: {
        select: {
          id: true,
          tripNumber: true,
          originAddress: true,
          destinationAddress: true,
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          passenger: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      experience: {
        select: {
          id: true,
          title: true,
          host: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      place: {
        select: {
          id: true,
          name: true,
          formattedAddress: true,
        },
      },
      alerts: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!emergency) {
    throw new Error('Emergencia no encontrada')
  }

  return emergency
}

/**
 * Actualiza el estado de una emergencia
 */
export async function updateEmergencyStatus(
  emergencyId: string,
  data: UpdateEmergencyStatusData,
  resolverId?: string
) {
  const updateData: any = {
    status: data.status,
    updatedAt: new Date(),
  }

  if (data.servicesResponded) {
    updateData.servicesResponded = data.servicesResponded
  }

  if (data.status === EmergencyStatus.RESOLVED || data.status === EmergencyStatus.CANCELLED) {
    updateData.resolvedAt = new Date()
    if (resolverId) {
      updateData.resolvedBy = resolverId
    }
    if (data.resolution) {
      updateData.resolution = data.resolution
    }
  }

  if (data.metadata) {
    updateData.metadata = data.metadata
  }

  return await prisma.emergency.update({
    where: { id: emergencyId },
    data: updateData,
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      resolver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

/**
 * Resuelve una emergencia
 */
export async function resolveEmergency(
  emergencyId: string,
  resolverId: string,
  resolution: string,
  servicesResponded?: any
) {
  return await updateEmergencyStatus(
    emergencyId,
    {
      status: EmergencyStatus.RESOLVED,
      resolution,
      servicesResponded,
    },
    resolverId
  )
}

/**
 * Cancela una emergencia
 */
export async function cancelEmergency(
  emergencyId: string,
  resolverId: string,
  resolution?: string
) {
  return await updateEmergencyStatus(
    emergencyId,
    {
      status: EmergencyStatus.CANCELLED,
      resolution: resolution || 'Cancelada',
    },
    resolverId
  )
}

/**
 * Crea una alerta de emergencia
 */
export async function createEmergencyAlert(
  emergencyId: string,
  service: EmergencyServiceType,
  method: string,
  target: string
) {
  return await prisma.emergencyAlert.create({
    data: {
      emergencyId,
      service,
      method,
      target,
      status: 'PENDING',
    },
  })
}

/**
 * Actualiza el estado de una alerta
 */
export async function updateEmergencyAlertStatus(
  alertId: string,
  status: string,
  responseDetails?: any
) {
  return await prisma.emergencyAlert.update({
    where: { id: alertId },
    data: {
      status,
      responseDetails,
      updatedAt: new Date(),
    },
  })
}

/**
 * Obtiene emergencias cercanas a una ubicación
 */
export async function getNearbyEmergencies(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  options: Omit<ListEmergenciesOptions, 'latitude' | 'longitude' | 'radiusKm'> = {}
) {
  return await listEmergencies({
    ...options,
    latitude,
    longitude,
    radiusKm,
  })
}

