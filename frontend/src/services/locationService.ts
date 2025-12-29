/**
 * Servicio para detectar la ubicación del usuario
 * Usa geolocalización del navegador o API de geolocalización por IP como fallback
 */

export interface UserLocation {
  country: string
  countryCode: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
}

/**
 * Mapeo de códigos de país a códigos ISO para Google Maps
 */
const COUNTRY_CODE_MAP: Record<string, string> = {
  'CL': 'cl', // Chile
  'AR': 'ar', // Argentina
  'PE': 'pe', // Perú
  'BO': 'bo', // Bolivia
  'CO': 'co', // Colombia
  'BR': 'br', // Brasil
  'MX': 'mx', // México
  'US': 'us', // Estados Unidos
  'CA': 'ca', // Canadá
}

/**
 * Detecta la ubicación del usuario usando geolocalización del navegador
 */
export async function detectUserLocation(): Promise<UserLocation> {
  // Primero intentar geolocalización del navegador
  if (navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { timeout: 5000, enableHighAccuracy: false }
        )
      })

      // Usar reverse geocoding para obtener el país
      // Por ahora, usar API de geolocalización por IP como fallback
      return await detectLocationByIP()
    } catch (error) {
      console.log('Geolocalización no disponible, usando IP:', error)
      return await detectLocationByIP()
    }
  }

  // Fallback a geolocalización por IP
  return await detectLocationByIP()
}

/**
 * Detecta la ubicación del usuario usando su IP
 * Usa una API gratuita de geolocalización por IP
 */
async function detectLocationByIP(): Promise<UserLocation> {
  try {
    // Usar ipapi.co (gratuita, sin API key)
    console.log('🌍 Detectando ubicación por IP...')
    const response = await fetch('https://ipapi.co/json/')
    if (!response.ok) {
      throw new Error('Error en geolocalización por IP')
    }

    const data = await response.json()
    
    const location: UserLocation = {
      country: data.country_name || 'Chile',
      countryCode: data.country_code || 'CL',
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    }
    
    console.log('✅ Ubicación detectada:', {
      país: location.country,
      código: location.countryCode,
      región: location.region,
      ciudad: location.city,
    })
    
    return location
  } catch (error) {
    console.error('❌ Error detectando ubicación por IP:', error)
    // Fallback a Chile por defecto
    const fallback: UserLocation = {
      country: 'Chile',
      countryCode: 'CL',
    }
    console.log('⚠️ Usando ubicación por defecto:', fallback)
    return fallback
  }
}

/**
 * Obtiene el código de país para Google Maps
 */
export function getCountryCodeForMaps(countryCode: string): string {
  return COUNTRY_CODE_MAP[countryCode.toUpperCase()] || countryCode.toLowerCase()
}

/**
 * Obtiene el nombre del país en español
 */
export function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    'CL': 'Chile',
    'AR': 'Argentina',
    'PE': 'Perú',
    'BO': 'Bolivia',
    'CO': 'Colombia',
    'BR': 'Brasil',
    'MX': 'México',
    'US': 'Estados Unidos',
    'CA': 'Canadá',
  }
  return countryNames[countryCode.toUpperCase()] || countryCode
}

