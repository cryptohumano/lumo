/**
 * Rutas de alertas para conductores
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { UserRole } from '@prisma/client'
import {
  getDriverAlerts,
  acceptTripFromAlert,
  rejectTripFromAlert,
  markAlertAsViewed,
} from '../services/driverAlertService'

const router = Router()

// Todas las rutas requieren autenticación y rol de conductor
router.use(authenticate)
router.use(requireRole(UserRole.DRIVER))

/**
 * GET /api/driver/alerts
 * Obtiene las alertas activas del conductor
 */
router.get('/', async (req, res) => {
  try {
    const driverId = req.user!.id
    const status = req.query.status as string | undefined
    const includeExpired = req.query.includeExpired === 'true'

    const alerts = await getDriverAlerts(driverId, {
      status: status as any,
      includeExpired,
    })

    res.json({ alerts })
  } catch (error: any) {
    console.error('Error getting driver alerts:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * POST /api/driver/alerts/:alertId/accept
 * Acepta un viaje desde una alerta
 */
router.post('/:alertId/accept', async (req, res) => {
  try {
    const driverId = req.user!.id
    const alertId = req.params.alertId
    const { vehicleId } = req.body

    const trip = await acceptTripFromAlert(alertId, driverId, vehicleId)

    res.json({
      success: true,
      trip,
    })
  } catch (error: any) {
    console.error('Error accepting trip from alert:', error)
    res.status(400).json({
      error: 'Bad Request',
      message: error.message,
    })
  }
})

/**
 * POST /api/driver/alerts/:alertId/reject
 * Rechaza un viaje desde una alerta
 */
router.post('/:alertId/reject', async (req, res) => {
  try {
    const driverId = req.user!.id
    const alertId = req.params.alertId
    const { reason } = req.body

    const result = await rejectTripFromAlert(alertId, driverId, reason)

    res.json(result)
  } catch (error: any) {
    console.error('Error rejecting trip from alert:', error)
    res.status(400).json({
      error: 'Bad Request',
      message: error.message,
    })
  }
})

/**
 * PATCH /api/driver/alerts/:alertId/view
 * Marca una alerta como vista
 */
router.patch('/:alertId/view', async (req, res) => {
  try {
    const driverId = req.user!.id
    const alertId = req.params.alertId

    const alert = await markAlertAsViewed(alertId, driverId)

    res.json(alert)
  } catch (error: any) {
    console.error('Error marking alert as viewed:', error)
    res.status(400).json({
      error: 'Bad Request',
      message: error.message,
    })
  }
})

export default router

