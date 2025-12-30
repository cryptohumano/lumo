/**
 * Rutas para gestión de emergencias
 * - Usuarios regulares pueden reportar emergencias
 * - Autoridades pueden reportar, ver y gestionar emergencias en su área
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { UserRole, EmergencyStatus } from '@prisma/client'
import {
  createEmergency,
  listEmergencies,
  getEmergencyById,
  updateEmergencyStatus,
  resolveEmergency,
  cancelEmergency,
  getNearbyEmergencies,
  CreateEmergencyData,
} from '../services/emergencyService'
import { prisma } from '../index'

const router = Router()

/**
 * POST /api/emergencies
 * Crea una nueva emergencia (usuarios autenticados)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id

    const {
      tripId,
      experienceId,
      emergencyType,
      severity,
      latitude,
      longitude,
      address,
      city,
      country,
      placeId,
      title,
      description,
      numberOfPeople,
      metadata,
    } = req.body

    // Validaciones
    if (!emergencyType || !latitude || !longitude || !title || !description) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Tipo de emergencia, coordenadas, título y descripción son requeridos',
      })
    }

    const emergencyData: CreateEmergencyData = {
      reportedBy: userId,
      tripId,
      experienceId,
      emergencyType,
      severity,
      latitude,
      longitude,
      address,
      city,
      country,
      placeId,
      title,
      description,
      numberOfPeople,
      metadata,
    }

    const emergency = await createEmergency(emergencyData)

    res.status(201).json({ emergency })
  } catch (error: any) {
    console.error('Error creando emergencia:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/emergencies
 * Lista emergencias (con filtros)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    // Solo usuarios pueden ver sus propias emergencias, autoridades y admins pueden ver todas
    const options: any = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status,
      emergencyType: req.query.emergencyType,
      severity: req.query.severity,
      search: req.query.search as string,
    }

    // Si no es autoridad ni admin, solo puede ver sus propias emergencias
    if (user?.role !== UserRole.AUTHORITY && user?.role !== UserRole.ADMIN) {
      options.reportedBy = userId
    }

    // Si es autoridad, puede filtrar por proximidad
    if (user?.role === UserRole.AUTHORITY) {
      if (req.query.latitude && req.query.longitude) {
        options.latitude = parseFloat(req.query.latitude as string)
        options.longitude = parseFloat(req.query.longitude as string)
        options.radiusKm = parseFloat(req.query.radiusKm as string) || 10
      }
    }

    const result = await listEmergencies(options)

    res.json(result)
  } catch (error: any) {
    console.error('Error listando emergencias:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/emergencies/nearby
 * Obtiene emergencias cercanas (solo para autoridades)
 */
router.get('/nearby', authenticate, requireRole(UserRole.AUTHORITY), async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 10 } = req.query

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Latitud y longitud son requeridas',
      })
    }

    const result = await getNearbyEmergencies(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      parseFloat(radiusKm as string),
      {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as any,
        emergencyType: req.query.emergencyType as any,
        severity: req.query.severity as any,
      }
    )

    res.json(result)
  } catch (error: any) {
    console.error('Error obteniendo emergencias cercanas:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/emergencies/:id
 * Obtiene una emergencia por ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    const emergency = await getEmergencyById(id)

    // Verificar permisos: solo el reporter, autoridades o admins pueden ver
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (
      emergency.reportedBy !== userId &&
      user?.role !== UserRole.AUTHORITY &&
      user?.role !== UserRole.ADMIN
    ) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes permiso para ver esta emergencia',
      })
    }

    res.json({ emergency })
  } catch (error: any) {
    if (error.message === 'Emergencia no encontrada') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      })
    }
    console.error('Error obteniendo emergencia:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * PUT /api/emergencies/:id/status
 * Actualiza el estado de una emergencia (solo autoridades y admins)
 */
router.put('/:id/status', authenticate, requireRole(UserRole.AUTHORITY, UserRole.ADMIN), async (req, res) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const { status, servicesResponded, resolution, metadata } = req.body

    if (!status) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Estado es requerido',
      })
    }

    const emergency = await updateEmergencyStatus(
      id,
      {
        status,
        servicesResponded,
        resolution,
        metadata,
      },
      userId
    )

    res.json({ emergency })
  } catch (error: any) {
    if (error.message === 'Emergencia no encontrada') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      })
    }
    console.error('Error actualizando estado de emergencia:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * POST /api/emergencies/:id/resolve
 * Resuelve una emergencia (solo autoridades y admins)
 */
router.post('/:id/resolve', authenticate, requireRole(UserRole.AUTHORITY, UserRole.ADMIN), async (req, res) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const { resolution, servicesResponded } = req.body

    if (!resolution) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Resolución es requerida',
      })
    }

    const emergency = await resolveEmergency(id, userId, resolution, servicesResponded)

    res.json({ emergency })
  } catch (error: any) {
    if (error.message === 'Emergencia no encontrada') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      })
    }
    console.error('Error resolviendo emergencia:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * POST /api/emergencies/:id/cancel
 * Cancela una emergencia (solo autoridades y admins)
 */
router.post('/:id/cancel', authenticate, requireRole(UserRole.AUTHORITY, UserRole.ADMIN), async (req, res) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const { resolution } = req.body

    const emergency = await cancelEmergency(id, userId, resolution)

    res.json({ emergency })
  } catch (error: any) {
    if (error.message === 'Emergencia no encontrada') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      })
    }
    console.error('Error cancelando emergencia:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * POST /api/emergencies/authority
 * Crea una emergencia reportada por una autoridad (solo autoridades)
 */
router.post('/authority', authenticate, requireRole(UserRole.AUTHORITY), async (req, res) => {
  try {
    const userId = req.user!.id

    const {
      tripId,
      experienceId,
      emergencyType,
      severity,
      latitude,
      longitude,
      address,
      city,
      country,
      placeId,
      title,
      description,
      numberOfPeople,
      metadata,
    } = req.body

    // Validaciones
    if (!emergencyType || !latitude || !longitude || !title || !description) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Tipo de emergencia, coordenadas, título y descripción son requeridos',
      })
    }

    const emergencyData: CreateEmergencyData = {
      reportedBy: userId,
      tripId,
      experienceId,
      emergencyType,
      severity,
      latitude,
      longitude,
      address,
      city,
      country,
      placeId,
      title,
      description,
      numberOfPeople,
      metadata,
    }

    const emergency = await createEmergency(emergencyData)

    res.status(201).json({ emergency })
  } catch (error: any) {
    console.error('Error creando emergencia desde autoridad:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

export default router

