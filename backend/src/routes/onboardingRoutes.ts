/**
 * Rutas para el onboarding de conductores
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { UserRole } from '@prisma/client'
import {
  getOnboardingStatus,
  startOnboarding,
  updateOnboarding,
  uploadDocument,
  deleteDocument,
  linkVehicleToOnboarding,
  completeOnboarding,
  getPendingOnboardings,
  approveOnboarding,
  rejectOnboarding
} from '../services/onboardingService'

const router = Router()

/**
 * GET /api/onboarding
 * Obtiene el estado del onboarding del usuario autenticado
 * No requiere rol DRIVER porque el usuario puede estar en proceso de onboarding
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const onboarding = await getOnboardingStatus(userId)
    res.json(onboarding)
  } catch (error: any) {
    console.error('Error obteniendo estado de onboarding:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener estado de onboarding'
    })
  }
})

/**
 * POST /api/onboarding/start
 * Inicia el proceso de onboarding
 * No requiere rol DRIVER porque el usuario puede estar solicitando ser conductor
 */
router.post('/start', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const { 
      fullName, 
      dateOfBirth, 
      nationalId, 
      address, 
      city, 
      country,
      driverType,
      companyName,
      companyTaxId,
      companyAddress,
      companyCity,
      companyCountry,
      taxId,
      taxIdType
    } = req.body

    const onboarding = await startOnboarding(userId, {
      fullName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationalId,
      address,
      city,
      country,
      driverType,
      companyName,
      companyTaxId,
      companyAddress,
      companyCity,
      companyCountry,
      taxId,
      taxIdType
    })

    res.json(onboarding)
  } catch (error: any) {
    console.error('Error iniciando onboarding:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al iniciar onboarding'
    })
  }
})

/**
 * PUT /api/onboarding
 * Actualiza la información del onboarding
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const {
      fullName,
      dateOfBirth,
      nationalId,
      address,
      city,
      country,
      driverType,
      companyName,
      companyTaxId,
      companyAddress,
      companyCity,
      companyCountry,
      taxId,
      taxIdType,
      licenseNumber,
      licenseExpiryDate,
      licenseIssuedBy,
      bankName,
      accountNumber,
      accountType,
      routingNumber,
      bankCountry,
      currentStep
    } = req.body

    const onboarding = await updateOnboarding(userId, {
      fullName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationalId,
      address,
      city,
      country,
      driverType,
      companyName,
      companyTaxId,
      companyAddress,
      companyCity,
      companyCountry,
      taxId,
      taxIdType,
      licenseNumber,
      licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : undefined,
      licenseIssuedBy,
      bankName,
      accountNumber,
      accountType,
      routingNumber,
      bankCountry,
      currentStep
    })

    res.json(onboarding)
  } catch (error: any) {
    console.error('Error actualizando onboarding:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al actualizar onboarding'
    })
  }
})

/**
 * POST /api/onboarding/documents
 * Sube un documento para el onboarding
 */
router.post('/documents', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const { type, fileName, fileUrl, fileSize, mimeType } = req.body

    if (!type || !fileName || !fileUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Tipo, nombre de archivo y URL son requeridos'
      })
    }

    const document = await uploadDocument(userId, {
      type,
      fileName,
      fileUrl,
      fileSize,
      mimeType
    })

    res.status(201).json(document)
  } catch (error: any) {
    console.error('Error subiendo documento:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al subir documento'
    })
  }
})

/**
 * DELETE /api/onboarding/documents/:id
 * Elimina un documento
 */
router.delete('/documents/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    await deleteDocument(userId, id)

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error eliminando documento:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al eliminar documento'
    })
  }
})

/**
 * POST /api/onboarding/vehicle
 * Asocia un vehículo al onboarding
 */
router.post('/vehicle', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const { vehicleId } = req.body

    if (!vehicleId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ID de vehículo es requerido'
      })
    }

    const onboarding = await linkVehicleToOnboarding(userId, vehicleId)

    res.json(onboarding)
  } catch (error: any) {
    console.error('Error asociando vehículo:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al asociar vehículo'
    })
  }
})

/**
 * POST /api/onboarding/complete
 * Completa el onboarding (marca como listo para revisión)
 */
router.post('/complete', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id

    const onboarding = await completeOnboarding(userId)

    res.json(onboarding)
  } catch (error: any) {
    console.error('Error completando onboarding:', error)
    res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Error al completar onboarding'
    })
  }
})

// ========== RUTAS DE ADMINISTRADOR ==========

/**
 * GET /api/onboarding/pending
 * Obtiene todos los onboarding pendientes de revisión (admin)
 */
router.get('/pending', authenticate, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const onboardings = await getPendingOnboardings()
    res.json(onboardings)
  } catch (error: any) {
    console.error('Error obteniendo onboarding pendientes:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener onboarding pendientes'
    })
  }
})

/**
 * POST /api/onboarding/:id/approve
 * Aprueba un onboarding (admin)
 */
router.post('/:id/approve', authenticate, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const { id } = req.params
    const adminId = req.user!.id

    const onboarding = await approveOnboarding(id, adminId)

    res.json(onboarding)
  } catch (error: any) {
    console.error('Error aprobando onboarding:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al aprobar onboarding'
    })
  }
})

/**
 * POST /api/onboarding/:id/reject
 * Rechaza un onboarding (admin)
 */
router.post('/:id/reject', authenticate, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const { id } = req.params
    const adminId = req.user!.id
    const { reason } = req.body

    if (!reason) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Razón de rechazo es requerida'
      })
    }

    const onboarding = await rejectOnboarding(id, adminId, reason)

    res.json(onboarding)
  } catch (error: any) {
    console.error('Error rechazando onboarding:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al rechazar onboarding'
    })
  }
})

export default router

