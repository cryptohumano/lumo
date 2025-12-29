import express from 'express'
import {
  convertCurrency,
  getExchangeRate,
  getAllExchangeRates,
  getExchangeRatesFromBase,
  formatCurrency,
} from '../services/currencyService'

const router = express.Router()

/**
 * GET /api/currency/rates
 * Obtiene todas las tasas de cambio
 */
router.get('/rates', (req, res) => {
  try {
    const base = req.query.base as string
    let rates

    if (base) {
      rates = getExchangeRatesFromBase(base)
    } else {
      rates = getAllExchangeRates()
    }

    res.json({
      rates,
      base: base || 'all',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error getting exchange rates:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/currency/convert
 * Convierte un monto de una moneda a otra
 * Query params: amount, from, to
 */
router.get('/convert', (req, res) => {
  try {
    const amount = parseFloat(req.query.amount as string)
    const from = req.query.from as string
    const to = req.query.to as string

    if (!amount || !from || !to) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'amount, from, and to are required',
      })
    }

    if (isNaN(amount)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'amount must be a valid number',
      })
    }

    const converted = convertCurrency(amount, from, to)
    const rate = getExchangeRate(from, to)

    res.json({
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount: converted,
      targetCurrency: to,
      exchangeRate: rate,
      formatted: {
        original: formatCurrency(amount, from),
        converted: formatCurrency(converted, to),
      },
    })
  } catch (error: any) {
    console.error('Error converting currency:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/currency/rate
 * Obtiene la tasa de cambio entre dos monedas
 * Query params: from, to
 */
router.get('/rate', (req, res) => {
  try {
    const from = req.query.from as string
    const to = req.query.to as string

    if (!from || !to) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'from and to are required',
      })
    }

    const rate = getExchangeRate(from, to)

    res.json({
      from,
      to,
      rate,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error getting exchange rate:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

export default router


