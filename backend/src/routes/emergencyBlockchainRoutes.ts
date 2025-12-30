/**
 * Rutas para leer y decodificar eventos de emergencia desde la blockchain
 * Solo accesibles para autoridades y admins
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { UserRole } from '@prisma/client'
import {
  decodeEmergencyFromTxHash,
  decodeEmergenciesFromBlock,
  searchEmergenciesInBlockRange,
  getRecentEmergencies,
} from '../services/emergencyBlockchainDecoder'
import type { ChainName } from '../services/polkadotService'

const router = Router()

// Todas las rutas requieren autenticación y rol AUTHORITY o ADMIN
router.use(authenticate)
router.use(requireRole(UserRole.AUTHORITY, UserRole.ADMIN))

/**
 * GET /api/emergency-blockchain/decode/:txHash
 * Decodifica una emergencia desde la blockchain por TX Hash
 */
router.get('/decode/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params
    const chain = (req.query.chain as ChainName) || 'PASET_HUB'

    if (!txHash) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'TX Hash es requerido',
      })
    }

    const decoded = await decodeEmergencyFromTxHash(txHash, chain)

    if (!decoded) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No se encontró una emergencia válida en esta transacción',
      })
    }

    res.json({ emergency: decoded })
  } catch (error: any) {
    console.error('Error decodificando emergencia desde TX Hash:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al decodificar emergencia',
    })
  }
})

/**
 * GET /api/emergency-blockchain/block/:blockNumber
 * Decodifica todas las emergencias de un bloque específico
 */
router.get('/block/:blockNumber', async (req, res) => {
  try {
    const { blockNumber } = req.params
    const chain = (req.query.chain as ChainName) || 'PASET_HUB'

    if (!blockNumber) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Número de bloque es requerido',
      })
    }

    const emergencies = await decodeEmergenciesFromBlock(parseInt(blockNumber), chain)

    res.json({
      blockNumber: parseInt(blockNumber),
      chain,
      emergencies,
      count: emergencies.length,
    })
  } catch (error: any) {
    console.error('Error decodificando emergencias desde bloque:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al decodificar emergencias',
    })
  }
})

/**
 * GET /api/emergency-blockchain/range
 * Busca emergencias en un rango de bloques
 * Query params: fromBlock, toBlock, chain
 */
router.get('/range', async (req, res) => {
  try {
    const fromBlock = parseInt(req.query.fromBlock as string)
    const toBlock = parseInt(req.query.toBlock as string)
    const chain = (req.query.chain as ChainName) || 'PASET_HUB'

    if (!fromBlock || !toBlock) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'fromBlock y toBlock son requeridos',
      })
    }

    if (fromBlock > toBlock) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'fromBlock debe ser menor o igual a toBlock',
      })
    }

    if (toBlock - fromBlock > 1000) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'El rango no puede ser mayor a 1000 bloques',
      })
    }

    const emergencies = await searchEmergenciesInBlockRange(fromBlock, toBlock, chain)

    res.json({
      fromBlock,
      toBlock,
      chain,
      emergencies,
      count: emergencies.length,
    })
  } catch (error: any) {
    console.error('Error buscando emergencias en rango:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al buscar emergencias',
    })
  }
})

/**
 * GET /api/emergency-blockchain/recent
 * Obtiene emergencias recientes de los últimos N bloques
 * Query params: lastNBlocks (default: 100), chain
 */
router.get('/recent', async (req, res) => {
  try {
    const lastNBlocks = parseInt(req.query.lastNBlocks as string) || 100
    const chain = (req.query.chain as ChainName) || 'PASET_HUB'

    if (lastNBlocks > 1000) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'lastNBlocks no puede ser mayor a 1000',
      })
    }

    const emergencies = await getRecentEmergencies(lastNBlocks, chain)

    res.json({
      lastNBlocks,
      chain,
      emergencies,
      count: emergencies.length,
    })
  } catch (error: any) {
    console.error('Error obteniendo emergencias recientes:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener emergencias recientes',
    })
  }
})

export default router

