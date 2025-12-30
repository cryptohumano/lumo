import { Currency } from '@/types'

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  timestamp: string
}

export interface CurrencyConversion {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  formatted: {
    original: string
    converted: string
  }
}

export interface ExchangeRatesResponse {
  rates: Record<string, Record<string, number>> | Record<string, number>
  base: string
  timestamp: string
}

/**
 * Convierte un monto de una moneda a otra
 */
// Helper para obtener la URL base de la API (misma lógica que api.ts)
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL
  const hostname = window.location.hostname
  
  // En desarrollo, siempre usar localhost:3000 si estamos en localhost
  if (import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return 'http://localhost:3000/api'
  }
  
  // Si la URL contiene lumo.peranto.app pero estamos en desarrollo local, usar localhost
  if (import.meta.env.DEV && envUrl && envUrl.includes('lumo.peranto.app') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return 'http://localhost:3000/api'
  }
  
  if (envUrl && envUrl !== 'undefined') {
    // Si la URL del env usa localhost pero estamos accediendo desde la red, usar la IP del servidor
    if (envUrl.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const serverIP = hostname
      return envUrl.replace('localhost', serverIP)
    }
    return envUrl
  }
  
  // Fallback: detectar automáticamente
  if (import.meta.env.DEV) {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api'
    } else {
      // Estamos en la red, usar la IP del servidor
      return `http://${hostname}:3000/api`
    }
  }
  
  // Fallback para producción
  return '/api'
}

export async function convertCurrency(
  amount: number,
  from: Currency | string,
  to: Currency | string
): Promise<CurrencyConversion> {
  try {
    let baseUrl = getApiBaseUrl()
    // Forzar HTTP si la URL es HTTPS (para evitar errores de certificado)
    if (baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.replace('https://', 'http://')
    }
    const response = await fetch(
      `${baseUrl}/currency/convert?amount=${amount}&from=${from}&to=${to}`
    )
    if (!response.ok) {
      throw new Error('Failed to convert currency')
    }
    return await response.json()
  } catch (error) {
    console.error('Error converting currency:', error)
    // Fallback: retornar el monto original si falla la conversión
    return {
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount: amount,
      targetCurrency: to,
      exchangeRate: 1,
      formatted: {
        original: formatCurrency(amount, from),
        converted: formatCurrency(amount, to),
      },
    }
  }
}

/**
 * Obtiene la tasa de cambio entre dos monedas
 */
export async function getExchangeRate(
  from: Currency | string,
  to: Currency | string
): Promise<number> {
  try {
    let baseUrl = getApiBaseUrl()
    // Forzar HTTP si la URL es HTTPS (para evitar errores de certificado)
    if (baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.replace('https://', 'http://')
    }
    const response = await fetch(
      `${baseUrl}/currency/rate?from=${from}&to=${to}`
    )
    if (!response.ok) {
      throw new Error('Failed to get exchange rate')
    }
    const data = await response.json()
    return data.rate
  } catch (error) {
    console.error('Error getting exchange rate:', error)
    return 1 // Fallback: tasa 1:1
  }
}

/**
 * Obtiene todas las tasas de cambio
 */
export async function getAllExchangeRates(
  base?: Currency | string
): Promise<ExchangeRatesResponse> {
  try {
    const baseUrl = getApiBaseUrl()
    const url = base
      ? `${baseUrl}/currency/rates?base=${base}`
      : `${baseUrl}/currency/rates`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to get exchange rates')
    }
    return await response.json()
  } catch (error) {
    console.error('Error getting exchange rates:', error)
    throw error
  }
}

/**
 * Obtiene el locale correcto para cada moneda
 */
function getCurrencyLocale(currency: Currency | string): string {
  const localeMap: Record<string, string> = {
    CLP: 'es-CL', // Chile
    MXN: 'es-MX', // México
    USD: 'en-US', // Estados Unidos
    ARS: 'es-AR', // Argentina
    COP: 'es-CO', // Colombia
    BRL: 'pt-BR', // Brasil
    BOB: 'es-BO', // Bolivia
    PEN: 'es-PE', // Perú
    CAD: 'en-CA', // Canadá
  }
  return localeMap[currency] || 'es-CL'
}

/**
 * Formatea un monto con el símbolo de moneda (para uso general)
 */
export function formatCurrency(
  amount: number,
  currency: Currency | string
): string {
  const locale = getCurrencyLocale(currency)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  const symbols: Record<string, string> = {
    CLP: '$',
    MXN: '$',
    USD: '$',
    ARS: '$',
    COP: '$',
    BRL: 'R$',
    BOB: 'Bs.',
    PEN: 'S/',
    CAD: 'C$',
  }

  const symbol = symbols[currency] || currency
  return `${symbol} ${formatted}`
}

/**
 * Formatea un monto SIN símbolo, con el ticker de la moneda al final
 * Útil para tablas/cards que ya tienen un ícono de moneda
 * Ejemplo: "500 MXN" en lugar de "$ 500"
 */
export function formatCurrencyAmount(
  amount: number,
  currency: Currency | string
): string {
  const locale = getCurrencyLocale(currency)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${formatted} ${currency}`
}

/**
 * Convierte un monto de forma síncrona usando una tasa de cambio conocida
 * Útil para conversiones rápidas sin hacer llamadas a la API
 */
export function convertCurrencySync(
  amount: number,
  from: Currency | string,
  to: Currency | string,
  rate?: number
): number {
  if (from === to) return amount
  if (rate) return amount * rate
  return amount // Fallback: retornar original si no hay tasa
}

