import express from 'express'
import { calculateTripPrice, getCountryCurrency } from '../services/pricingService'

const router = express.Router()

/**
 * POST /api/pricing/calculate
 * Calcula el precio de un viaje basado en distancia y país
 * Body: { distance: number, country: string, vehicleType?: string }
 */
router.post('/calculate', (req, res) => {
  try {
    const { distance, country, vehicleType } = req.body

    if (typeof distance !== 'number' || distance < 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'La distancia debe ser un número positivo',
      })
    }

    const pricing = calculateTripPrice(distance, country, vehicleType)
    res.json(pricing)
  } catch (error: any) {
    console.error('Error calculating price:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/pricing/currency
 * Obtiene la moneda para un país específico
 * Query: ?country=MX
 */
router.get('/currency', (req, res) => {
  try {
    const { country } = req.query
    const currency = getCountryCurrency(country as string)
    res.json({ currency, country: country || 'CL' })
  } catch (error: any) {
    console.error('Error getting currency:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

export default router

