/**
 * Servicio de cálculo de precios por país/región
 * Cada país tiene sus propias tarifas en su moneda local
 */

export interface PricingTier {
  maxKm: number
  pricePerKm: number
}

export interface CountryPricing {
  currency: string
  basePrice: number
  tiers: PricingTier[]
  sedanDiscount?: number // Descuento porcentual para SEDAN (ej: 0.35 = 35%)
}

/**
 * Tarifas por país/región
 * Los precios están en la moneda local de cada país
 */
const COUNTRY_PRICING: Record<string, CountryPricing> = {
  // Chile
  CL: {
    currency: 'CLP',
    basePrice: 5000,
    tiers: [
      { maxKm: 40, pricePerKm: 1500 },
      { maxKm: 200, pricePerKm: 1200 },
      { maxKm: Infinity, pricePerKm: 1000 },
    ],
    sedanDiscount: 0.35,
  },
  // México
  MX: {
    currency: 'MXN',
    basePrice: 80, // ~80 MXN equivalente a ~5,000 CLP
    tiers: [
      { maxKm: 40, pricePerKm: 25 }, // ~25 MXN/km equivalente a ~1,500 CLP/km
      { maxKm: 200, pricePerKm: 20 }, // ~20 MXN/km equivalente a ~1,200 CLP/km
      { maxKm: Infinity, pricePerKm: 17 }, // ~17 MXN/km equivalente a ~1,000 CLP/km
    ],
    sedanDiscount: 0.35,
  },
  // Estados Unidos
  US: {
    currency: 'USD',
    basePrice: 5,
    tiers: [
      { maxKm: 40, pricePerKm: 1.5 },
      { maxKm: 200, pricePerKm: 1.2 },
      { maxKm: Infinity, pricePerKm: 1.0 },
    ],
    sedanDiscount: 0.35,
  },
  // Argentina
  AR: {
    currency: 'ARS',
    basePrice: 4500, // ~4,500 ARS equivalente a ~5,000 CLP
    tiers: [
      { maxKm: 40, pricePerKm: 1350 }, // ~1,350 ARS/km
      { maxKm: 200, pricePerKm: 1080 }, // ~1,080 ARS/km
      { maxKm: Infinity, pricePerKm: 900 }, // ~900 ARS/km
    ],
    sedanDiscount: 0.35,
  },
  // Colombia
  CO: {
    currency: 'COP',
    basePrice: 19500, // ~19,500 COP equivalente a ~5,000 CLP
    tiers: [
      { maxKm: 40, pricePerKm: 5850 }, // ~5,850 COP/km
      { maxKm: 200, pricePerKm: 4680 }, // ~4,680 COP/km
      { maxKm: Infinity, pricePerKm: 3900 }, // ~3,900 COP/km
    ],
    sedanDiscount: 0.35,
  },
  // Brasil
  BR: {
    currency: 'BRL',
    basePrice: 25, // ~25 BRL equivalente a ~5,000 CLP
    tiers: [
      { maxKm: 40, pricePerKm: 7.5 }, // ~7.5 BRL/km
      { maxKm: 200, pricePerKm: 6 }, // ~6 BRL/km
      { maxKm: Infinity, pricePerKm: 5 }, // ~5 BRL/km
    ],
    sedanDiscount: 0.35,
  },
  // Bolivia
  BO: {
    currency: 'BOB',
    basePrice: 35, // ~35 BOB equivalente a ~5,000 CLP
    tiers: [
      { maxKm: 40, pricePerKm: 10.5 }, // ~10.5 BOB/km
      { maxKm: 200, pricePerKm: 8.4 }, // ~8.4 BOB/km
      { maxKm: Infinity, pricePerKm: 7 }, // ~7 BOB/km
    ],
    sedanDiscount: 0.35,
  },
  // Perú
  PE: {
    currency: 'PEN',
    basePrice: 19, // ~19 PEN equivalente a ~5,000 CLP
    tiers: [
      { maxKm: 40, pricePerKm: 5.7 }, // ~5.7 PEN/km
      { maxKm: 200, pricePerKm: 4.6 }, // ~4.6 PEN/km
      { maxKm: Infinity, pricePerKm: 3.8 }, // ~3.8 PEN/km
    ],
    sedanDiscount: 0.35,
  },
  // Canadá
  CA: {
    currency: 'CAD',
    basePrice: 7, // ~7 CAD equivalente a ~5,000 CLP
    tiers: [
      { maxKm: 40, pricePerKm: 2 }, // ~2 CAD/km
      { maxKm: 200, pricePerKm: 1.6 }, // ~1.6 CAD/km
      { maxKm: Infinity, pricePerKm: 1.3 }, // ~1.3 CAD/km
    ],
    sedanDiscount: 0.35,
  },
}

/**
 * Obtiene el código de país desde un código ISO o nombre de país
 */
function normalizeCountryCode(country: string | null | undefined): string {
  if (!country) return 'CL' // Default a Chile

  const upperCountry = country.toUpperCase().trim()

  // Si ya es un código de 2 letras, retornarlo
  if (upperCountry.length === 2) {
    return upperCountry
  }

  // Mapeo de nombres comunes a códigos
  const countryMap: Record<string, string> = {
    'CHILE': 'CL',
    'MEXICO': 'MX',
    'MÉXICO': 'MX',
    'UNITED STATES': 'US',
    'USA': 'US',
    'ARGENTINA': 'AR',
    'COLOMBIA': 'CO',
    'BRASIL': 'BR',
    'BRAZIL': 'BR',
    'BOLIVIA': 'BO',
    'PERU': 'PE',
    'PERÚ': 'PE',
    'CANADA': 'CA',
  }

  return countryMap[upperCountry] || 'CL'
}

/**
 * Obtiene las tarifas para un país específico
 */
export function getCountryPricing(country: string | null | undefined): CountryPricing {
  const countryCode = normalizeCountryCode(country)
  return COUNTRY_PRICING[countryCode] || COUNTRY_PRICING['CL'] // Fallback a Chile
}

/**
 * Calcula el precio de un viaje basado en distancia y país
 * @param distance Distancia en kilómetros
 * @param country Código de país (CL, MX, US, etc.) o nombre del país
 * @param vehicleType Tipo de vehículo (opcional). Si es SEDAN, aplica descuento
 * @returns Objeto con basePrice, distancePrice, timePrice, totalPrice y currency
 */
export function calculateTripPrice(
  distance: number,
  country: string | null | undefined,
  vehicleType?: string
): {
  basePrice: number
  distancePrice: number
  timePrice: number
  totalPrice: number
  currency: string
} {
  if (distance <= 0) {
    const pricing = getCountryPricing(country)
    return {
      basePrice: pricing.basePrice,
      distancePrice: 0,
      timePrice: 0,
      totalPrice: pricing.basePrice,
      currency: pricing.currency,
    }
  }

  const pricing = getCountryPricing(country)
  let distancePrice = 0
  let remainingDistance = distance

  // Calcular precio por distancia usando los tiers
  for (const tier of pricing.tiers) {
    if (remainingDistance <= 0) break

    const kmInTier = Math.min(remainingDistance, tier.maxKm === Infinity ? remainingDistance : tier.maxKm)
    distancePrice += kmInTier * tier.pricePerKm
    remainingDistance -= kmInTier
  }

  // Precio base
  const basePrice = pricing.basePrice

  // Precio por tiempo (por ahora 0, pero se puede agregar después)
  const timePrice = 0

  // Precio total antes de descuentos
  let totalPrice = basePrice + distancePrice + timePrice

  // Aplicar descuento para SEDAN si existe
  if (vehicleType === 'SEDAN' && pricing.sedanDiscount) {
    // El descuento se aplica solo al precio por distancia
    const discountedDistancePrice = distancePrice * (1 - pricing.sedanDiscount)
    totalPrice = basePrice + discountedDistancePrice + timePrice
    distancePrice = discountedDistancePrice
  }

  return {
    basePrice,
    distancePrice,
    timePrice,
    totalPrice: Math.round(totalPrice),
    currency: pricing.currency,
  }
}

/**
 * Obtiene la moneda para un país específico
 */
export function getCountryCurrency(country: string | null | undefined): string {
  const pricing = getCountryPricing(country)
  return pricing.currency
}

