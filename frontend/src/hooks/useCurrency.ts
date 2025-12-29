import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Currency } from '@/types'
import {
  convertCurrency,
  getExchangeRate,
  formatCurrency as formatCurrencyUtil,
  formatCurrencyAmount as formatCurrencyAmountUtil,
  convertCurrencySync,
} from '@/services/currencyService'

interface UseCurrencyReturn {
  convert: (amount: number, from: Currency | string, to?: Currency | string) => Promise<number>
  convertSync: (amount: number, from: Currency | string, to?: Currency | string, rate?: number) => number
  format: (amount: number, currency: Currency | string) => string
  formatAmount: (amount: number, currency: Currency | string) => string
  formatConverted: (amount: number, from: Currency | string, to?: Currency | string) => Promise<string>
  formatConvertedAmount: (amount: number, from: Currency | string, to?: Currency | string) => Promise<string>
  getRate: (from: Currency | string, to: Currency | string) => Promise<number>
  preferredCurrency: Currency
}

/**
 * Hook para manejar conversión de monedas
 * Usa la moneda preferida del usuario autenticado
 */
export function useCurrency(): UseCurrencyReturn {
  const { user } = useAuth()
  const [ratesCache, setRatesCache] = useState<Record<string, number>>({})

  const preferredCurrency = (user?.preferredCurrency || Currency.CLP) as Currency

  // Cargar tasas de cambio comunes al montar
  useEffect(() => {
    const loadCommonRates = async () => {
      if (!user?.preferredCurrency) return

      const commonCurrencies = [Currency.CLP, Currency.USD, Currency.MXN, Currency.ARS, Currency.COP, Currency.BRL]
      const rates: Record<string, number> = {}

      for (const currency of commonCurrencies) {
        if (currency !== preferredCurrency) {
          try {
            const rate = await getExchangeRate(currency, preferredCurrency)
            rates[`${currency}_${preferredCurrency}`] = rate
          } catch (error) {
            console.error(`Error loading rate for ${currency}:`, error)
          }
        }
      }

      setRatesCache(rates)
    }

    loadCommonRates()
  }, [user?.preferredCurrency, preferredCurrency])

  /**
   * Convierte un monto de una moneda a la moneda preferida del usuario
   */
  const convert = useCallback(
    async (amount: number, from: Currency | string, to?: Currency | string): Promise<number> => {
      const targetCurrency = to || preferredCurrency

      if (from === targetCurrency) return amount

      try {
        const conversion = await convertCurrency(amount, from, targetCurrency)
        return conversion.convertedAmount
      } catch (error) {
        console.error('Error converting currency:', error)
        return amount // Fallback: retornar original
      }
    },
    [preferredCurrency]
  )

  /**
   * Convierte un monto de forma síncrona usando cache
   */
  const convertSync = useCallback(
    (amount: number, from: Currency | string, to?: Currency | string, rate?: number): number => {
      const targetCurrency = to || preferredCurrency

      if (from === targetCurrency) return amount

      // Si hay una tasa proporcionada, usarla
      if (rate) {
        return convertCurrencySync(amount, from, targetCurrency, rate)
      }

      // Intentar usar cache
      const cacheKey = `${from}_${targetCurrency}`
      const cachedRate = ratesCache[cacheKey]

      if (cachedRate) {
        return convertCurrencySync(amount, from, targetCurrency, cachedRate)
      }

      // Fallback: retornar original
      return amount
    },
    [preferredCurrency, ratesCache]
  )

  /**
   * Formatea un monto con el símbolo de moneda
   */
  const format = useCallback(
    (amount: number, currency: Currency | string): string => {
      return formatCurrencyUtil(amount, currency)
    },
    []
  )

  /**
   * Formatea un monto SIN símbolo, con ticker al final (para tablas/cards)
   * Ejemplo: "500 MXN" en lugar de "$ 500"
   */
  const formatAmount = useCallback(
    (amount: number, currency: Currency | string): string => {
      return formatCurrencyAmountUtil(amount, currency)
    },
    []
  )

  /**
   * Convierte y formatea un monto con símbolo
   */
  const formatConverted = useCallback(
    async (amount: number, from: Currency | string, to?: Currency | string): Promise<string> => {
      const targetCurrency = to || preferredCurrency

      if (from === targetCurrency) {
        return formatCurrencyUtil(amount, targetCurrency)
      }

      try {
        const converted = await convert(amount, from, targetCurrency)
        return formatCurrencyUtil(converted, targetCurrency)
      } catch (error) {
        console.error('Error formatting converted currency:', error)
        return formatCurrencyUtil(amount, from)
      }
    },
    [preferredCurrency, convert]
  )

  /**
   * Convierte y formatea un monto SIN símbolo, con ticker al final (para tablas/cards)
   * Ejemplo: "2,500 CLP" en lugar de "$ 2,500"
   */
  const formatConvertedAmount = useCallback(
    async (amount: number, from: Currency | string, to?: Currency | string): Promise<string> => {
      const targetCurrency = to || preferredCurrency

      if (from === targetCurrency) {
        return formatCurrencyAmountUtil(amount, targetCurrency)
      }

      try {
        const converted = await convert(amount, from, targetCurrency)
        return formatCurrencyAmountUtil(converted, targetCurrency)
      } catch (error) {
        console.error('Error formatting converted currency amount:', error)
        return formatCurrencyAmountUtil(amount, from)
      }
    },
    [preferredCurrency, convert]
  )

  /**
   * Obtiene la tasa de cambio entre dos monedas
   */
  const getRate = useCallback(
    async (from: Currency | string, to: Currency | string): Promise<number> => {
      if (from === to) return 1

      // Intentar usar cache
      const cacheKey = `${from}_${to}`
      const cachedRate = ratesCache[cacheKey]

      if (cachedRate) {
        return cachedRate
      }

      try {
        const rate = await getExchangeRate(from, to)
        // Guardar en cache
        setRatesCache((prev) => ({ ...prev, [cacheKey]: rate }))
        return rate
      } catch (error) {
        console.error('Error getting exchange rate:', error)
        return 1 // Fallback: tasa 1:1
      }
    },
    [ratesCache]
  )

  return {
    convert,
    convertSync,
    format,
    formatAmount,
    formatConverted,
    formatConvertedAmount,
    getRate,
    preferredCurrency,
  }
}

