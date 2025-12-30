/**
 * Rutas para gestión de configuraciones del sistema
 * Solo accesibles para usuarios con rol ADMIN
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { UserRole } from '@prisma/client'
import { getSystemConfigService, CONFIG_KEYS } from '../services/systemConfigService'

const router = Router()

// Todas las rutas requieren autenticación y rol ADMIN
router.use(authenticate)
router.use(requireRole(UserRole.ADMIN))

/**
 * GET /api/system-config
 * Obtiene todas las configuraciones del sistema
 */
router.get('/', async (req, res) => {
  try {
    const systemConfig = getSystemConfigService()
    
    // Obtener todas las configuraciones
    const allConfigs = await systemConfig.getValidationConfigs()
    
    // Obtener configuraciones de Polkadot
    const polkadotConfigs = await systemConfig.getPolkadotConfigs()
    
    res.json({
      validations: allConfigs,
      polkadot: polkadotConfigs,
    })
  } catch (error: any) {
    console.error('Error obteniendo configuraciones:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener configuraciones',
    })
  }
})

/**
 * GET /api/system-config/validations
 * Obtiene las configuraciones de validaciones
 */
router.get('/validations', async (req, res) => {
  try {
    const systemConfig = getSystemConfigService()
    const validations = await systemConfig.getValidationConfigs()
    
    res.json(validations)
  } catch (error: any) {
    console.error('Error obteniendo configuraciones de validaciones:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener configuraciones',
    })
  }
})

/**
 * PUT /api/system-config/validations
 * Actualiza las configuraciones de validaciones
 */
router.put('/validations', async (req, res) => {
  try {
    const { distanceStartTrip, distanceEndTrip } = req.body
    const userId = req.user!.id
    
    const systemConfig = getSystemConfigService()
    
    const updates: Promise<void>[] = []
    
    if (typeof distanceStartTrip === 'boolean') {
      updates.push(
        systemConfig.setConfig(
          CONFIG_KEYS.VALIDATION_DISTANCE_START_TRIP,
          distanceStartTrip ? 'true' : 'false',
          'Desactivar validación de distancia para iniciar viaje (true = desactivada, false = activada)',
          userId
        )
      )
    }
    
    if (typeof distanceEndTrip === 'boolean') {
      updates.push(
        systemConfig.setConfig(
          CONFIG_KEYS.VALIDATION_DISTANCE_END_TRIP,
          distanceEndTrip ? 'true' : 'false',
          'Desactivar validación de distancia para completar viaje (true = desactivada, false = activada)',
          userId
        )
      )
    }
    
    await Promise.all(updates)
    
    const updatedValidations = await systemConfig.getValidationConfigs()
    
    res.json({
      message: 'Configuraciones actualizadas correctamente',
      validations: updatedValidations,
    })
  } catch (error: any) {
    console.error('Error actualizando configuraciones de validaciones:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al actualizar configuraciones',
    })
  }
})

/**
 * GET /api/system-config/:key
 * Obtiene una configuración específica por su clave
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params
    const systemConfig = getSystemConfigService()
    const value = await systemConfig.getConfig(key as any)
    
    res.json({
      key,
      value,
    })
  } catch (error: any) {
    console.error('Error obteniendo configuración:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener configuración',
    })
  }
})

/**
 * PUT /api/system-config/:key
 * Actualiza una configuración específica
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params
    const { value, description } = req.body
    const userId = req.user!.id
    
    if (value === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'El valor es requerido',
      })
    }
    
    const systemConfig = getSystemConfigService()
    await systemConfig.setConfig(
      key as any,
      value === null ? null : String(value),
      description,
      userId
    )
    
    const updatedValue = await systemConfig.getConfig(key as any)
    
    res.json({
      message: 'Configuración actualizada correctamente',
      key,
      value: updatedValue,
    })
  } catch (error: any) {
    console.error('Error actualizando configuración:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al actualizar configuración',
    })
  }
})

/**
 * GET /api/system-config/polkadot
 * Obtiene las configuraciones de Polkadot (alias para /admin/config/polkadot)
 */
router.get('/polkadot', async (req, res) => {
  try {
    const systemConfig = getSystemConfigService()
    const configs = await systemConfig.getPolkadotConfigs()
    
    res.json({
      network: configs.network,
      paymentChain: configs.paymentChain,
      paymentPreset: configs.paymentPreset,
      paymentCustom: configs.paymentCustom,
      assetUsdtId: configs.usdtAssetId,
      assetUsdcId: configs.usdcAssetId,
      platformAddress: configs.platformAddress,
      platformFeePercentage: configs.platformFeePercentage ? parseFloat(configs.platformFeePercentage) : null,
    })
  } catch (error: any) {
    console.error('Error obteniendo configuraciones de Polkadot:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener configuraciones',
    })
  }
})

/**
 * PUT /api/system-config/polkadot
 * Actualiza las configuraciones de Polkadot (alias para /admin/config/polkadot)
 */
router.put('/polkadot', async (req, res) => {
  try {
    const {
      network,
      paymentChain,
      paymentPreset,
      paymentCustom,
      assetUsdtId,
      assetUsdcId,
      platformAddress,
      platformFeePercentage,
    } = req.body
    
    const userId = req.user!.id
    const systemConfig = getSystemConfigService()
    
    await systemConfig.setPolkadotConfigs(
      {
        network,
        paymentChain,
        paymentPreset,
        paymentCustom,
        usdtAssetId: assetUsdtId,
        usdcAssetId: assetUsdcId,
        platformAddress,
        platformFeePercentage,
      },
      userId
    )
    
    const updatedConfigs = await systemConfig.getPolkadotConfigs()
    
    res.json({
      message: 'Configuraciones de Polkadot actualizadas correctamente',
      network: updatedConfigs.network,
      paymentChain: updatedConfigs.paymentChain,
      paymentPreset: updatedConfigs.paymentPreset,
      paymentCustom: updatedConfigs.paymentCustom,
      assetUsdtId: updatedConfigs.usdtAssetId,
      assetUsdcId: updatedConfigs.usdcAssetId,
      platformAddress: updatedConfigs.platformAddress,
      platformFeePercentage: updatedConfigs.platformFeePercentage ? parseFloat(updatedConfigs.platformFeePercentage) : null,
    })
  } catch (error: any) {
    console.error('Error actualizando configuraciones de Polkadot:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al actualizar configuraciones',
    })
  }
})

export default router

