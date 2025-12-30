/**
 * Servicio mejorado para obtener ubicación con mayor precisión
 * Combina múltiples fuentes: GPS, Network, WiFi
 */

export interface ImprovedLocation {
  latitude: number
  longitude: number
  accuracy: number  // metros
  source: 'gps' | 'network' | 'wifi' | 'hybrid'
  timestamp: number
  altitude?: number
  heading?: number
  speed?: number
}

/**
 * Obtiene ubicación GPS de alta precisión
 */
async function getGPSLocation(): Promise<ImprovedLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,  // Usar GPS de alta precisión
      timeout: 20000,  // 20 segundos timeout (más tiempo para GPS)
      maximumAge: 0,  // No usar caché
    }

    // Usar watchPosition para mejor precisión (obtiene múltiples lecturas)
    let watchId: number | null = null
    let bestPosition: GeolocationPosition | null = null
    let attempts = 0
    const maxAttempts = 3 // Obtener hasta 3 lecturas y usar la mejor

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        attempts++
        
        // Guardar la mejor posición (menor precisión = mejor)
        if (!bestPosition || (position.coords.accuracy || Infinity) < (bestPosition.coords.accuracy || Infinity)) {
          bestPosition = position
        }

        // Si tenemos una buena precisión (< 20m) o hemos intentado suficientes veces, usar esta
        if ((position.coords.accuracy || Infinity) < 20 || attempts >= maxAttempts) {
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId)
          }
          
          resolve({
            latitude: bestPosition.coords.latitude,
            longitude: bestPosition.coords.longitude,
            accuracy: bestPosition.coords.accuracy || 50,
            source: 'gps',
            timestamp: bestPosition.timestamp,
            altitude: bestPosition.coords.altitude || undefined,
            heading: bestPosition.coords.heading || undefined,
            speed: bestPosition.coords.speed || undefined,
          })
        }
      },
      (error) => {
        // Si tenemos una posición guardada, usarla aunque haya error
        if (bestPosition && watchId !== null) {
          navigator.geolocation.clearWatch(watchId)
          resolve({
            latitude: bestPosition.coords.latitude,
            longitude: bestPosition.coords.longitude,
            accuracy: bestPosition.coords.accuracy || 100,
            source: 'gps',
            timestamp: bestPosition.timestamp,
            altitude: bestPosition.coords.altitude || undefined,
            heading: bestPosition.coords.heading || undefined,
            speed: bestPosition.coords.speed || undefined,
          })
        } else {
          console.warn('Error obteniendo GPS:', error.message)
          resolve(null)
        }
      },
      options
    )

    // Timeout de seguridad: si después de 20 segundos no tenemos buena precisión, usar la mejor disponible
    setTimeout(() => {
      if (watchId !== null && bestPosition) {
        navigator.geolocation.clearWatch(watchId)
        resolve({
          latitude: bestPosition.coords.latitude,
          longitude: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy || 100,
          source: 'gps',
          timestamp: bestPosition.timestamp,
          altitude: bestPosition.coords.altitude || undefined,
          heading: bestPosition.coords.heading || undefined,
          speed: bestPosition.coords.speed || undefined,
        })
      }
    }, options.timeout)
  })
}

/**
 * Obtiene ubicación basada en red (menos preciso pero más rápido)
 * NOTA: Esta función puede devolver geolocalización por IP que es muy imprecisa
 * Solo se usa como último recurso si GPS falla
 */
async function getNetworkLocation(): Promise<ImprovedLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: false,  // Usar red, no GPS
      timeout: 5000,
      maximumAge: 60000,  // Aceptar caché de hasta 1 minuto
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy || 1000
        
        // Si la precisión es muy mala (> 5000m), probablemente es IP geolocation
        // Rechazar estas ubicaciones
        if (accuracy > 5000) {
          console.warn(`⚠️ Geolocalización por IP detectada (precisión: ${accuracy.toFixed(0)}m). Rechazando.`)
          resolve(null)
          return
        }
        
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy,
          source: 'network',
          timestamp: position.timestamp,
        })
      },
      (error) => {
        console.warn('Error obteniendo ubicación de red:', error.message)
        resolve(null)
      },
      options
    )
  })
}

/**
 * Intenta obtener ubicación WiFi (si está disponible)
 * Nota: La mayoría de navegadores no exponen esto directamente,
 * pero algunos servicios pueden proporcionarlo
 */
async function getWiFiLocation(): Promise<ImprovedLocation | null> {
  // En la mayoría de casos, esto no está disponible directamente
  // Se puede integrar con servicios como Google Geolocation API
  // Por ahora, retornamos null
  return null
}

/**
 * Combina múltiples fuentes de ubicación usando weighted average
 * Da más peso a las fuentes más precisas
 */
function combineLocations(locations: ImprovedLocation[]): ImprovedLocation {
  // Filtrar ubicaciones válidas
  // Rechazar ubicaciones con precisión > 1000m (muy imprecisas, probablemente IP)
  const validLocations = locations.filter(
    (loc) => loc && 
    loc.accuracy < 1000 && // Rechazar precisiones muy malas (típicas de IP geolocation)
    loc.latitude >= -90 && loc.latitude <= 90 &&
    loc.longitude >= -180 && loc.longitude <= 180
  )

  if (validLocations.length === 0) {
    // Si ninguna es válida, verificar si hay alguna disponible (aunque sea imprecisa)
    const sorted = locations
      .filter(loc => loc !== null)
      .sort((a, b) => a.accuracy - b.accuracy)
    
    if (sorted.length > 0) {
      const best = sorted[0]
      // Si la mejor ubicación tiene precisión > 1000m, es probablemente IP geolocation
      if (best.accuracy > 1000) {
        throw new Error(
          `Precisión GPS muy baja (${best.accuracy.toFixed(0)}m). ` +
          `Probablemente estás usando geolocalización por IP. ` +
          `Por favor, selecciona tu ubicación manualmente o permite acceso al GPS.`
        )
      }
      return {
        ...best,
        source: 'hybrid',
      }
    }
    
    throw new Error('No se pudo obtener ubicación válida')
  }

  // Weighted average basado en precisión
  // Más peso = más preciso (inverso de la precisión)
  let totalWeight = 0
  let weightedLat = 0
  let weightedLng = 0
  let minAccuracy = Infinity
  let maxTimestamp = 0

  validLocations.forEach((loc) => {
    // Peso inversamente proporcional a la precisión
    // Precisión de 10m = peso 10, precisión de 50m = peso 2
    const weight = 1 / Math.max(loc.accuracy, 1)
    totalWeight += weight
    weightedLat += loc.latitude * weight
    weightedLng += loc.longitude * weight
    minAccuracy = Math.min(minAccuracy, loc.accuracy)
    maxTimestamp = Math.max(maxTimestamp, loc.timestamp)
  })

  return {
    latitude: weightedLat / totalWeight,
    longitude: weightedLng / totalWeight,
    accuracy: minAccuracy,
    source: 'hybrid',
    timestamp: maxTimestamp,
  }
}

/**
 * Obtiene ubicación mejorada combinando múltiples fuentes
 * 
 * @param options - Opciones para obtener ubicación
 * @returns Ubicación mejorada con mayor precisión
 */
export async function getImprovedLocation(options: {
  useGPS?: boolean
  useNetwork?: boolean
  useWiFi?: boolean
  timeout?: number
  requireGPS?: boolean // Si true, solo acepta GPS real, rechaza IP geolocation
} = {}): Promise<ImprovedLocation> {
  const {
    useGPS = true,
    useNetwork = false, // Por defecto NO usar network (evita IP geolocation)
    useWiFi = false,
    timeout = 20000, // Más tiempo para GPS
    requireGPS = true, // Por defecto requerir GPS real
  } = options

  const locations: ImprovedLocation[] = []

  // Obtener ubicaciones en paralelo
  const promises: Promise<ImprovedLocation | null>[] = []

  // Siempre intentar GPS primero (más importante)
  if (useGPS) {
    promises.push(getGPSLocation())
  }

  // Solo usar network si no se requiere GPS estricto
  if (useNetwork && !requireGPS) {
    promises.push(getNetworkLocation())
  }

  if (useWiFi) {
    promises.push(getWiFiLocation())
  }

  // Esperar todas las promesas con timeout
  const timeoutPromise = new Promise<ImprovedLocation[]>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout obteniendo ubicación')), timeout)
  })

  try {
    const results = await Promise.race([
      Promise.all(promises),
      timeoutPromise,
    ]) as (ImprovedLocation | null)[]

    // Filtrar resultados nulos y rechazar ubicaciones muy imprecisas (IP geolocation)
    results.forEach((loc) => {
      if (loc) {
        // Rechazar ubicaciones con precisión > 5000m (típicas de IP geolocation)
        if (loc.accuracy > 5000) {
          console.warn(`❌ Ubicación rechazada (muy imprecisa):`, {
            source: loc.source,
            accuracy: `${loc.accuracy.toFixed(0)}m`,
            reason: 'Probablemente geolocalización por IP, no GPS real',
          })
          return // No agregar esta ubicación
        }
        
        console.log(`📍 Ubicación obtenida:`, {
          source: loc.source,
          accuracy: `${loc.accuracy.toFixed(0)}m`,
          lat: loc.latitude.toFixed(6),
          lng: loc.longitude.toFixed(6),
        })
        locations.push(loc)
      }
    })
  } catch (error) {
    console.warn('Error obteniendo ubicaciones:', error)
    // Si falla, intentar solo GPS como último recurso
    const gpsLocation = await getGPSLocation()
    if (gpsLocation) {
      console.log(`📍 GPS de respaldo obtenido:`, {
        accuracy: `${gpsLocation.accuracy.toFixed(0)}m`,
        lat: gpsLocation.latitude.toFixed(6),
        lng: gpsLocation.longitude.toFixed(6),
      })
      locations.push(gpsLocation)
    }
  }

  if (locations.length === 0) {
    if (requireGPS) {
      throw new Error(
        'No se pudo obtener ubicación GPS precisa. ' +
        'El GPS puede no estar disponible o los permisos fueron denegados. ' +
        'Por favor, permite el acceso a la ubicación en tu navegador o selecciona una ubicación manualmente usando la búsqueda.'
      )
    }
    throw new Error('No se pudo obtener ubicación válida')
  }

  // Si requerimos GPS, verificar que al menos una ubicación sea de GPS real
  if (requireGPS) {
    const hasGPS = locations.some(loc => loc.source === 'gps')
    if (!hasGPS) {
      throw new Error(
        'GPS no disponible. La ubicación obtenida es muy imprecisa (probablemente geolocalización por IP con error de 20km+). ' +
        'Por favor, permite el acceso al GPS en tu navegador (🔒 icono de candado → Ubicación → Permitir) o selecciona una ubicación manualmente usando la búsqueda.'
      )
    }
  }

  // Combinar ubicaciones
  return combineLocations(locations)
}

/**
 * Valida que una ubicación sea aceptable para reportar emergencias
 */
export function validateLocationForEmergency(
  location: ImprovedLocation
): { valid: boolean; reason?: string } {
  // Validar precisión (debe ser < 100m para emergencias)
  if (location.accuracy > 100) {
    return {
      valid: false,
      reason: `Precisión muy baja: ${location.accuracy.toFixed(0)}m. Se requiere < 100m`,
    }
  }

  // Validar coordenadas
  if (location.latitude < -90 || location.latitude > 90) {
    return {
      valid: false,
      reason: 'Latitud inválida',
    }
  }

  if (location.longitude < -180 || location.longitude > 180) {
    return {
      valid: false,
      reason: 'Longitud inválida',
    }
  }

  // Validar que no sea muy antigua (máximo 5 minutos)
  const age = Date.now() - location.timestamp
  if (age > 5 * 60 * 1000) {
    return {
      valid: false,
      reason: 'Ubicación muy antigua',
    }
  }

  return { valid: true }
}

