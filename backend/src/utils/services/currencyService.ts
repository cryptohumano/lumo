/**
 * Servicio de conversión de monedas
 * Usa tasas de cambio fijas para desarrollo
 * En producción, se puede integrar con una API externa como exchangerate-api.com
 */

export enum Currency {
  CLP = 'CLP',
  MXN = 'MXN',
  USD = 'USD',
  ARS = 'ARS',
  COP = 'COP',
  BRL = 'BRL',
  BOB = 'BOB',
  PEN = 'PEN',
  CAD = 'CAD',
}

// Tasas de cambio base (1 USD = X moneda)
// Estas son tasas aproximadas, en producción deberían venir de una API actualizada
const EXCHANGE_RATES: Record<string, number> = {
  CLP: 950, // 1 USD = 950 CLP
  MXN: 17, // 1 USD = 17 MXN
  USD: 1, // 1 USD = 1 USD
  ARS: 900, // 1 USD = 900 ARS
  COP: 3900, // 1 USD = 3900 COP
  BRL: 5, // 1 USD = 5 BRL
  BOB: 6.9, // 1 USD = 6.9 BOB
  PEN: 3.7, // 1 USD = 3.7 PEN
  CAD: 1.35, // 1 USD = 1.35 CAD
}

/**
 * Obtiene la tasa de cambio entre dos monedas
 */
export function getExchangeRate(from: string, to: string): number {
  if (from === to) return 1

  // Convertir a USD primero
  const fromRate = EXCHANGE_RATES[from] || 1
  const toRate = EXCHANGE_RATES[to] || 1

  // Tasa de cambio: (1 unidad de 'from' en USD) / (1 unidad de 'to' en USD)
  // Ejemplo: CLP a MXN = (1/950) / (1/17) = 17/950
  return fromRate / toRate
}

/**
 * Convierte un monto de una moneda a otra
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string
): number {
  if (from === to) return amount

  const rate = getExchangeRate(from, to)
  return amount * rate
}

/**
 * Obtiene el locale correcto para cada moneda
 */
function getCurrencyLocale(currency: string): string {
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
export function formatCurrency(amount: number, currency: string): string {
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
export function formatCurrencyAmount(amount: number, currency: string): string {
  const locale = getCurrencyLocale(currency)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${formatted} ${currency}`
}

/**
 * Obtiene todas las tasas de cambio disponibles
 */
export function getAllExchangeRates(): Record<string, Record<string, number>> {
  const currencies = Object.keys(EXCHANGE_RATES)
  const rates: Record<string, Record<string, number>> = {}

  for (const from of currencies) {
    rates[from] = {}
    for (const to of currencies) {
      rates[from][to] = getExchangeRate(from, to)
    }
  }

  return rates
}

/**
 * Obtiene las tasas de cambio desde una moneda base
 */
export function getExchangeRatesFromBase(baseCurrency: string): Record<string, number> {
  const currencies = Object.keys(EXCHANGE_RATES)
  const rates: Record<string, number> = {}

  for (const currency of currencies) {
    rates[currency] = getExchangeRate(baseCurrency, currency)
  }

  return rates
}

