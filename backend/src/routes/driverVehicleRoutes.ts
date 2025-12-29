/**
 * Rutas para gestión de vehículos de conductores
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { UserRole } from '@prisma/client'
import * as vehicleService from '../services/vehicleService'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticate)

/**
 * POST /api/driver/vehicles
 * Crea un nuevo vehículo (pendiente de aprobación)
 * Permite a usuarios en onboarding crear vehículos sin tener rol DRIVER aún
 */
router.post('/', async (req, res) => {
  try {
    const data = req.body
    const vehicle = await vehicleService.createVehicle(req.user!.id, data)
    res.status(201).json(vehicle)
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    if (error.message === 'La placa ya está registrada') {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json({ error: error.message || 'Error al crear vehículo' })
    }
  }
})

// Las siguientes rutas requieren rol DRIVER (para conductores ya establecidos)
router.use(requireRole(UserRole.DRIVER))

/**
 * GET /api/driver/vehicles
 * Lista todos los vehículos del conductor autenticado
 */
router.get('/', async (req, res) => {
  try {
    const vehicles = await vehicleService.getDriverVehicles(req.user!.id)
    res.json(vehicles)
  } catch (error: any) {
    console.error('Error listing driver vehicles:', error)
    res.status(500).json({ error: error.message || 'Error al listar vehículos' })
  }
})

/**
 * GET /api/driver/vehicles/:id
 * Obtiene un vehículo específico del conductor
 */
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id, req.user!.id)
    res.json(vehicle)
  } catch (error: any) {
    console.error('Error getting vehicle:', error)
    if (error.message === 'Vehículo no encontrado') {
      res.status(404).json({ error: error.message })
    } else {
      res.status(500).json({ error: error.message || 'Error al obtener vehículo' })
    }
  }
})

/**
 * PUT /api/driver/vehicles/:id
 * Actualiza un vehículo del conductor
 */
router.put('/:id', async (req, res) => {
  try {
    const data = req.body
    const vehicle = await vehicleService.updateVehicle(req.params.id, req.user!.id, data)
    res.json(vehicle)
  } catch (error: any) {
    console.error('Error updating vehicle:', error)
    if (error.message === 'Vehículo no encontrado' || error.message === 'La placa ya está registrada') {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json({ error: error.message || 'Error al actualizar vehículo' })
    }
  }
})

/**
 * DELETE /api/driver/vehicles/:id
 * Elimina un vehículo del conductor
 */
router.delete('/:id', async (req, res) => {
  try {
    await vehicleService.deleteVehicle(req.params.id, req.user!.id)
    res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting vehicle:', error)
    if (error.message === 'Vehículo no encontrado' || error.message.includes('viajes activos')) {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json({ error: error.message || 'Error al eliminar vehículo' })
    }
  }
})

export default router

