/**
 * Servicio de alertas para conductores
 * Maneja alertas con timeout de 1 minuto para aceptar/rechazar viajes
 */

import { PrismaClient, DriverAlertStatus, TripStatus, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

// Tiempo límite para alertas de conductores (1 minuto)
const ALERT_TIMEOUT_MINUTES = 1

/**
 * Crea una alerta para un conductor sobre un viaje disponible
 * Timeout de 1 minuto para aceptar/rechazar
 */
export async function createDriverAlert(driverId: string, tripId: string) {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + ALERT_TIMEOUT_MINUTES)

  // Verificar que no existe una alerta pendiente para este conductor y viaje
  const existingAlert = await prisma.driverAlert.findFirst({
    where: {
      driverId,
      tripId,
      status: DriverAlertStatus.PENDING,
      expiresAt: {
        gt: new Date(),
      },
    },
  })

  if (existingAlert) {
    return existingAlert
  }

  const alert = await prisma.driverAlert.create({
    data: {
      driverId,
      tripId,
      status: DriverAlertStatus.PENDING,
      expiresAt,
    },
    include: {
      trip: {
        include: {
          passenger: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  })

  return alert
}

/**
 * Crea alertas para múltiples conductores sobre un viaje
 * Se usa cuando un viaje está disponible y necesita ser asignado
 */
export async function broadcastTripToDrivers(
  tripId: string,
  driverIds: string[]
) {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + ALERT_TIMEOUT_MINUTES)

  // Crear alertas para todos los conductores disponibles
  const alerts = await Promise.all(
    driverIds.map(driverId =>
      prisma.driverAlert.create({
        data: {
          driverId,
          tripId,
          status: DriverAlertStatus.PENDING,
          expiresAt,
        },
      }).catch(() => null) // Ignorar errores de duplicados
    )
  )

  return alerts.filter(a => a !== null)
}

/**
 * Obtiene las alertas activas de un conductor
 */
export async function getDriverAlerts(
  driverId: string,
  options?: {
    status?: DriverAlertStatus
    includeExpired?: boolean
  }
) {
  const now = new Date()

  const where: any = {
    driverId,
  }

  if (options?.status) {
    where.status = options.status
  } else {
    where.status = DriverAlertStatus.PENDING
  }

  if (!options?.includeExpired && options?.status === DriverAlertStatus.PENDING) {
    where.expiresAt = {
      gt: now,
    }
  }

  const alerts = await prisma.driverAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      trip: {
        include: {
          passenger: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          originPlace: {
            select: {
              formattedAddress: true,
              latitude: true,
              longitude: true,
            },
          },
          destinationPlace: {
            select: {
              formattedAddress: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      },
    },
  })

  return alerts
}

/**
 * Acepta un viaje desde una alerta
 * Usa transacción para evitar race conditions
 */
export async function acceptTripFromAlert(alertId: string, driverId: string, vehicleId?: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verificar que la alerta existe y está pendiente
    const alert = await tx.driverAlert.findFirst({
      where: {
        id: alertId,
        driverId,
        status: DriverAlertStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        trip: {
          include: {
            originPlace: {
              select: {
                country: true,
              },
            },
            destinationPlace: {
              select: {
                country: true,
              },
            },
          },
        },
      },
    })

    if (!alert) {
      throw new Error('Alerta no encontrada o expirada')
    }

    // 2. Verificar que el viaje sigue disponible (usando SELECT FOR UPDATE para lock)
    const trip = await tx.trip.findUnique({
      where: { id: alert.tripId },
      include: {
        originPlace: {
          select: {
            country: true,
          },
        },
        destinationPlace: {
          select: {
            country: true,
          },
        },
      },
    })

    if (!trip) {
      throw new Error('Viaje no encontrado')
    }

    if (trip.status !== TripStatus.PENDING) {
      // Marcar alerta como cancelada
      await tx.driverAlert.update({
        where: { id: alertId },
        data: { status: DriverAlertStatus.CANCELLED },
      })
      throw new Error('El viaje ya no está disponible')
    }

    // 3. Verificar que el viaje no fue aceptado por otro conductor
    if (trip.driverId && trip.driverId !== driverId) {
      await tx.driverAlert.update({
        where: { id: alertId },
        data: { status: DriverAlertStatus.CANCELLED },
      })
      throw new Error('El viaje ya fue aceptado por otro conductor')
    }

    // 3.5. Verificar que el conductor existe, es activo, tiene rol DRIVER y está en el mismo país
    const driver = await tx.user.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        role: true,
        isActive: true,
        country: true,
      },
    })

    if (!driver || !driver.isActive) {
      await tx.driverAlert.update({
        where: { id: alertId },
        data: { status: DriverAlertStatus.CANCELLED },
      })
      throw new Error('Conductor no válido o inactivo')
    }

    // Verificar que el usuario tiene rol DRIVER (puede estar en role o en userRoles)
    let hasDriverRole = driver.role === 'DRIVER'
    
    if (!hasDriverRole) {
      const userRoles = await (tx as any).userRoleAssignment.findMany({
        where: { userId: driverId, role: 'DRIVER' },
      })
      hasDriverRole = userRoles.length > 0
    }
    
    if (!hasDriverRole) {
      await tx.driverAlert.update({
        where: { id: alertId },
        data: { status: DriverAlertStatus.CANCELLED },
      })
      throw new Error('El usuario no tiene rol de conductor')
    }

    // Verificar país
    const tripCountry = trip.originPlace?.country || trip.destinationPlace?.country
    if (tripCountry && driver.country && tripCountry !== driver.country) {
      await tx.driverAlert.update({
        where: { id: alertId },
        data: { status: DriverAlertStatus.CANCELLED },
      })
      throw new Error(`No puedes aceptar este viaje. Estás en ${driver.country} pero el viaje está en ${tripCountry}. Solo puedes aceptar viajes en tu mismo país.`)
    }

    // 4. Verificar que el conductor no tiene otro viaje activo
    const activeTrip = await tx.trip.findFirst({
      where: {
        driverId,
        status: {
          in: [TripStatus.CONFIRMED, TripStatus.IN_PROGRESS],
        },
      },
    })

    if (activeTrip) {
      throw new Error('Ya tienes un viaje activo')
    }

    // 5. Actualizar el viaje (usando update con condiciones para atomicidad)
    const updatedTrip = await tx.trip.updateMany({
      where: {
        id: alert.tripId,
        status: TripStatus.PENDING,
        OR: [
          { driverId: null },
          { driverId },
        ],
      },
      data: {
        driverId,
        vehicleId: vehicleId || undefined,
        status: TripStatus.CONFIRMED,
        driverAcceptedAt: new Date(),
        driverRequestedAt: trip.driverRequestedAt || new Date(),
      },
    })

    if (updatedTrip.count === 0) {
      // El viaje fue aceptado por otro conductor en el mismo momento
      await tx.driverAlert.update({
        where: { id: alertId },
        data: { status: DriverAlertStatus.CANCELLED },
      })
      throw new Error('El viaje ya fue aceptado por otro conductor')
    }

    // 6. Marcar la alerta como aceptada
    await tx.driverAlert.update({
      where: { id: alertId },
      data: {
        status: DriverAlertStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    })

    // 7. Cancelar todas las demás alertas pendientes para este viaje
    await tx.driverAlert.updateMany({
      where: {
        tripId: alert.tripId,
        status: DriverAlertStatus.PENDING,
        driverId: {
          not: driverId,
        },
      },
      data: {
        status: DriverAlertStatus.CANCELLED,
      },
    })

    // 8. Si se asignó un vehículo, marcarlo como no disponible
    if (vehicleId) {
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { isAvailable: false },
      })
    }

    // 9. Obtener el viaje actualizado
    const finalTrip = await tx.trip.findUnique({
      where: { id: alert.tripId },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true,
            type: true,
          },
        },
      },
    })

    return finalTrip!
  })
}

/**
 * Rechaza un viaje desde una alerta
 */
export async function rejectTripFromAlert(alertId: string, driverId: string, reason?: string) {
  const alert = await prisma.driverAlert.findFirst({
    where: {
      id: alertId,
      driverId,
      status: DriverAlertStatus.PENDING,
    },
  })

  if (!alert) {
    throw new Error('Alerta no encontrada')
  }

  await prisma.driverAlert.update({
    where: { id: alertId },
    data: {
      status: DriverAlertStatus.REJECTED,
      rejectedAt: new Date(),
      ...(reason ? { metadata: { reason } } : {}),
    },
  })

  return { success: true }
}

/**
 * Marca una alerta como vista
 */
export async function markAlertAsViewed(alertId: string, driverId: string) {
  const alert = await prisma.driverAlert.findFirst({
    where: {
      id: alertId,
      driverId,
    },
  })

  if (!alert) {
    throw new Error('Alerta no encontrada')
  }

  return prisma.driverAlert.update({
    where: { id: alertId },
    data: {
      viewedAt: new Date(),
    },
  })
}

/**
 * Expira alertas que han pasado su tiempo límite
 * Se debe ejecutar periódicamente (cron job)
 */
export async function expireAlerts() {
  const now = new Date()

  const result = await prisma.driverAlert.updateMany({
    where: {
      status: DriverAlertStatus.PENDING,
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: DriverAlertStatus.EXPIRED,
    },
  })

  // Liberar viajes que tenían alertas expiradas y no fueron aceptados
  // Esto permite que vuelvan a la cola para otros conductores
  const expiredAlerts = await prisma.driverAlert.findMany({
    where: {
      status: DriverAlertStatus.EXPIRED,
      expiresAt: {
        lt: now,
      },
    },
    include: {
      trip: {
        select: {
          id: true,
          status: true,
          driverId: true,
        },
      },
    },
  })

  for (const alert of expiredAlerts) {
    // Si el viaje sigue pendiente y no tiene conductor, liberarlo
    if (
      alert.trip.status === TripStatus.PENDING &&
      (!alert.trip.driverId || alert.trip.driverId === alert.driverId)
    ) {
      await prisma.trip.update({
        where: { id: alert.tripId },
        data: {
          driverId: null,
          driverRequestedAt: null,
          acceptanceDeadline: null,
        },
      })
    }
  }

  return result
}

/**
 * Obtiene conductores disponibles para recibir alertas sobre un viaje
 */
export async function getAvailableDriversForTrip(tripId: string, options?: {
  preferredVehicleType?: string
  maxDistance?: number
}) {
  // Obtener el viaje para conocer el tipo de vehículo preferido y el país
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      originPlace: {
        select: {
          country: true,
        },
      },
      destinationPlace: {
        select: {
          country: true,
        },
      },
    },
  })

  if (!trip) {
    return []
  }

  // Obtener el país del viaje (prioridad: originPlace > destinationPlace)
  const tripCountry = trip.originPlace?.country || trip.destinationPlace?.country

  // Buscar conductores activos con vehículos disponibles
  const where: any = {
    role: UserRole.DRIVER,
    isActive: true,
    vehicles: {
      some: {
        isAvailable: true,
      },
    },
  }

  // Filtrar por país si está disponible
  if (tripCountry) {
    where.country = tripCountry
  }

  // Si hay tipo de vehículo preferido, filtrar por ese tipo
  if (options?.preferredVehicleType && trip.preferredVehicleType) {
    where.vehicles = {
      some: {
        isAvailable: true,
        type: trip.preferredVehicleType,
      },
    }
  }

  // Verificar que no tengan viajes activos
  const driversWithActiveTrips = await prisma.trip.findMany({
    where: {
      status: {
        in: [TripStatus.CONFIRMED, TripStatus.IN_PROGRESS],
      },
    },
    select: {
      driverId: true,
    },
  })

  const busyDriverIds = driversWithActiveTrips
    .map(t => t.driverId)
    .filter(id => id !== null) as string[]

  if (busyDriverIds.length > 0) {
    where.id = {
      notIn: busyDriverIds,
    }
  }

  const drivers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      vehicles: {
        where: {
          isAvailable: true,
        },
        select: {
          id: true,
          type: true,
        },
      },
    },
  })

  return drivers
}

