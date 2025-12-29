/**
 * Servicio de gestión de vehículos
 */

import { PrismaClient, VehicleApprovalStatus, VehicleType } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateVehicleData {
  make: string
  model: string
  year: number
  color?: string
  licensePlate: string
  type: VehicleType
  capacity: number
  photos?: string[]
  metadata?: any
}

export interface UpdateVehicleData {
  make?: string
  model?: string
  year?: number
  color?: string
  licensePlate?: string
  type?: VehicleType
  capacity?: number
  isAvailable?: boolean
  photos?: string[]
  metadata?: any
}

/**
 * Lista vehículos disponibles de un conductor (solo aprobados)
 */
export async function getAvailableVehiclesByDriver(driverId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId: driverId,
      isAvailable: true,
      approvalStatus: 'APPROVED',
    },
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      licensePlate: true,
      color: true,
      type: true,
      capacity: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return vehicles
}

/**
 * Lista todos los vehículos de un conductor
 */
export async function getDriverVehicles(driverId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId: driverId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return vehicles
}

/**
 * Obtiene un vehículo por ID
 */
export async function getVehicleById(vehicleId: string, driverId?: string) {
  const where: any = { id: vehicleId }
  if (driverId) {
    where.userId = driverId
  }

  const vehicle = await prisma.vehicle.findFirst({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  if (!vehicle) {
    throw new Error('Vehículo no encontrado')
  }

  return vehicle
}

/**
 * Crea un nuevo vehículo (pendiente de aprobación)
 */
export async function createVehicle(driverId: string, data: CreateVehicleData) {
  // Verificar que la placa no esté en uso
  const existing = await prisma.vehicle.findUnique({
    where: { licensePlate: data.licensePlate },
  })

  if (existing) {
    throw new Error('La placa ya está registrada')
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      ...data,
      userId: driverId,
      approvalStatus: 'PENDING',
      isAvailable: false, // No disponible hasta ser aprobado
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return vehicle
}

/**
 * Actualiza un vehículo (solo el conductor propietario)
 */
export async function updateVehicle(vehicleId: string, driverId: string, data: UpdateVehicleData) {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: driverId,
    },
  })

  if (!vehicle) {
    throw new Error('Vehículo no encontrado')
  }

  // Si se actualiza la placa, verificar que no esté en uso
  if (data.licensePlate && data.licensePlate !== vehicle.licensePlate) {
    const existing = await prisma.vehicle.findUnique({
      where: { licensePlate: data.licensePlate },
    })

    if (existing) {
      throw new Error('La placa ya está registrada')
    }
  }

  // Si el vehículo estaba aprobado y se actualiza, volver a estado pendiente
  const updateData: any = { ...data }
  if (vehicle.approvalStatus === 'APPROVED' && Object.keys(data).length > 0) {
    updateData.approvalStatus = 'PENDING'
    updateData.isAvailable = false
    updateData.approvedAt = null
    updateData.approvedBy = null
    updateData.rejectionReason = null
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return updated
}

/**
 * Elimina un vehículo (solo el conductor propietario)
 */
export async function deleteVehicle(vehicleId: string, driverId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: driverId,
    },
  })

  if (!vehicle) {
    throw new Error('Vehículo no encontrado')
  }

  // Verificar que no esté en uso en viajes activos
  const activeTrips = await prisma.trip.count({
    where: {
      vehicleId: vehicleId,
      status: {
        in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'],
      },
    },
  })

  if (activeTrips > 0) {
    throw new Error('No se puede eliminar un vehículo con viajes activos')
  }

  await prisma.vehicle.delete({
    where: { id: vehicleId },
  })
}

/**
 * Aprobar un vehículo (solo administradores)
 */
export async function approveVehicle(vehicleId: string, adminId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  })

  if (!vehicle) {
    throw new Error('Vehículo no encontrado')
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: adminId,
      isAvailable: true,
      isVerified: true,
      rejectionReason: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return updated
}

/**
 * Rechazar un vehículo (solo administradores)
 */
export async function rejectVehicle(vehicleId: string, adminId: string, reason?: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  })

  if (!vehicle) {
    throw new Error('Vehículo no encontrado')
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      approvalStatus: 'REJECTED',
      approvedBy: adminId,
      isAvailable: false,
      rejectionReason: reason || null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return updated
}

/**
 * Lista vehículos pendientes de aprobación (admin)
 */
export async function getPendingVehicles(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        approvalStatus: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.vehicle.count({
      where: {
        approvalStatus: 'PENDING',
      },
    }),
  ])

  return {
    vehicles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Lista todos los vehículos con filtros (admin)
 */
export async function getAllVehicles(
  page: number = 1,
  limit: number = 20,
  filters?: {
    approvalStatus?: VehicleApprovalStatus
    driverId?: string
    type?: VehicleType
  }
) {
  const skip = (page - 1) * limit

  const where: any = {}
  if (filters?.approvalStatus) {
    where.approvalStatus = filters.approvalStatus
  }
  if (filters?.driverId) {
    where.userId = filters.driverId
  }
  if (filters?.type) {
    where.type = filters.type
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ])

  return {
    vehicles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Lista todos los conductores disponibles (solo con vehículos aprobados)
 */
export async function getAvailableDrivers(tripCountry?: string) {
  const where: any = {
    role: 'DRIVER',
    isActive: true,
    vehicles: {
      some: {
        isAvailable: true,
        approvalStatus: 'APPROVED',
      },
    },
  }

  // Filtrar por país si se proporciona
  if (tripCountry) {
    where.country = tripCountry
  }

  const drivers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      country: true,
      vehicles: {
        where: {
          isAvailable: true,
          approvalStatus: 'APPROVED',
        },
        select: {
          id: true,
          make: true,
          model: true,
          licensePlate: true,
          type: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return drivers
}


