/**
 * Servicio para estadísticas del dashboard de administración
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalTrips: number
  activeTrips: number
  completedTrips: number
  pendingTrips: number
  cancelledTrips: number
  inProgressTrips: number
  totalRevenue: number
  currency: string
  pendingOnboardings: number
  usersByRole: {
    role: string
    count: number
  }[]
  tripsByStatus: {
    status: string
    count: number
  }[]
  recentUsers: number // Usuarios registrados en los últimos 30 días
  recentTrips: number // Viajes creados en los últimos 30 días
}

/**
 * Obtiene todas las estadísticas del dashboard de administración
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Estadísticas de usuarios
  const [totalUsers, activeUsers, usersByRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    })
  ])

  // Fecha de hace 30 días
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Estadísticas de viajes
  const [
    totalTrips,
    activeTrips,
    completedTrips,
    pendingTrips,
    cancelledTrips,
    inProgressTrips,
    tripsByStatus,
    recentTrips
  ] = await Promise.all([
    prisma.trip.count(),
    prisma.trip.count({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
        }
      }
    }),
    prisma.trip.count({
      where: { status: 'COMPLETED' }
    }),
    prisma.trip.count({
      where: { status: 'PENDING' }
    }),
    prisma.trip.count({
      where: { status: 'CANCELLED' }
    }),
    prisma.trip.count({
      where: { status: 'IN_PROGRESS' }
    }),
    prisma.trip.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    }),
    prisma.trip.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })
  ])

  // Estadísticas de ingresos (pagos completados)
  const completedPayments = await prisma.payment.findMany({
    where: {
      status: 'COMPLETED'
    },
    select: {
      amount: true,
      currency: true
    }
  })

  // Calcular ingresos totales (agrupar por moneda)
  const revenueByCurrency = completedPayments.reduce((acc, payment) => {
    if (!acc[payment.currency]) {
      acc[payment.currency] = 0
    }
    acc[payment.currency] += payment.amount
    return acc
  }, {} as Record<string, number>)

  // Usar la moneda más común o CLP por defecto
  const mainCurrency = Object.keys(revenueByCurrency).length > 0
    ? Object.entries(revenueByCurrency).sort((a, b) => b[1] - a[1])[0][0]
    : 'CLP'

  const totalRevenue = revenueByCurrency[mainCurrency] || 0

  // Usuarios recientes
  const recentUsers = await prisma.user.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo
      }
    }
  })

  // Onboardings pendientes de revisión
  const pendingOnboardings = await prisma.driverOnboarding.count({
    where: {
      status: 'PENDING_REVIEW'
    }
  })

  return {
    totalUsers,
    activeUsers,
    totalTrips,
    activeTrips,
    completedTrips,
    pendingTrips,
    cancelledTrips,
    inProgressTrips,
    totalRevenue,
    currency: mainCurrency,
    pendingOnboardings,
    usersByRole: usersByRole.map(item => ({
      role: item.role,
      count: item._count.role
    })),
    tripsByStatus: tripsByStatus.map(item => ({
      status: item.status,
      count: item._count.status
    })),
    recentUsers,
    recentTrips
  }
}


