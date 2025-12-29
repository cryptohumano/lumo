/**
 * Utilidades para manejar referentes fiscales según el país
 */

import { TaxIdType } from '@/types'
import { detectUserLocation } from '@/services/locationService'

/**
 * Mapea el código de país al tipo de referente fiscal correspondiente
 */
export function getTaxIdTypeForCountry(countryCode: string): TaxIdType {
  const countryTaxIdMap: Record<string, TaxIdType> = {
    'CL': TaxIdType.RUT,      // Chile
    'AR': TaxIdType.CUIT,    // Argentina
    'MX': TaxIdType.RFC,     // México
    'BR': TaxIdType.CPF,     // Brasil (persona física por defecto)
    'CO': TaxIdType.NIT,     // Colombia
    'PE': TaxIdType.RUC,     // Perú
    'BO': TaxIdType.NIT_BOL, // Bolivia
    'CA': TaxIdType.SIN,     // Canadá
    'US': TaxIdType.EIN,     // Estados Unidos
  }

  return countryTaxIdMap[countryCode.toUpperCase()] || TaxIdType.OTHER
}

/**
 * Obtiene el label del referente fiscal según el país
 */
export function getTaxIdLabel(countryCode: string, isCompany: boolean = false): string {
  const labels: Record<string, { individual: string; company: string }> = {
    'CL': { individual: 'RUT', company: 'RUT Empresa' },
    'AR': { individual: 'CUIT', company: 'CUIT Empresa' },
    'MX': { individual: 'RFC', company: 'RFC Empresa' },
    'BR': { individual: 'CPF', company: 'CNPJ' },
    'CO': { individual: 'NIT', company: 'NIT Empresa' },
    'PE': { individual: 'RUC', company: 'RUC Empresa' },
    'BO': { individual: 'NIT', company: 'NIT Empresa' },
    'CA': { individual: 'SIN', company: 'Business Number' },
    'US': { individual: 'SSN', company: 'EIN' },
  }

  const countryLabels = labels[countryCode.toUpperCase()]
  if (!countryLabels) {
    return isCompany ? 'Tax ID (Empresa)' : 'Tax ID (Individual)'
  }

  return isCompany ? countryLabels.company : countryLabels.individual
}

/**
 * Obtiene el placeholder del referente fiscal según el país
 */
export function getTaxIdPlaceholder(countryCode: string, isCompany: boolean = false): string {
  const placeholders: Record<string, { individual: string; company: string }> = {
    'CL': { individual: '12.345.678-9', company: '76.123.456-7' },
    'AR': { individual: '20-12345678-9', company: '30-12345678-9' },
    'MX': { individual: 'ABCD123456EF7', company: 'ABC123456DEF' },
    'BR': { individual: '123.456.789-00', company: '12.345.678/0001-90' },
    'CO': { individual: '1234567890', company: '900123456-7' },
    'PE': { individual: '12345678', company: '20123456789' },
    'BO': { individual: '1234567890', company: '1234567890123' },
    'CA': { individual: '123-456-789', company: '123456789' },
    'US': { individual: '123-45-6789', company: '12-3456789' },
  }

  const countryPlaceholders = placeholders[countryCode.toUpperCase()]
  if (!countryPlaceholders) {
    return isCompany ? 'Ingrese el ID fiscal de la empresa' : 'Ingrese su ID fiscal'
  }

  return isCompany ? countryPlaceholders.company : countryPlaceholders.individual
}

/**
 * Detecta el país del usuario y retorna información del referente fiscal
 */
export async function getTaxIdInfoForUser(): Promise<{
  countryCode: string
  countryName: string
  taxIdType: TaxIdType
  taxIdLabel: string
  taxIdPlaceholder: string
}> {
  const location = await detectUserLocation()
  const isCompany = false // Por defecto, se puede cambiar después
  const taxIdType = getTaxIdTypeForCountry(location.countryCode)

  return {
    countryCode: location.countryCode,
    countryName: location.country,
    taxIdType,
    taxIdLabel: getTaxIdLabel(location.countryCode, isCompany),
    taxIdPlaceholder: getTaxIdPlaceholder(location.countryCode, isCompany),
  }
}

