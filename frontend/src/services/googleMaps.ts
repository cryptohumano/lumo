/**
 * Servicio de Google Maps para el frontend
 * Wrapper del microservicio @operations/google-maps-service
 */

// Tipos del microservicio
export interface RouteInfo {
  distance: number // en kilómetros
  duration: number // en minutos
  distanceText: string
  durationText: string
  price: number // precio calculado basado en la distancia
  polyline?: string
  bounds?: {
    northeast: { lat: number; lng: number }
    southwest: { lat: number; lng: number }
  }
}

export interface PlacePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export interface PlaceDetails {
  placeId: string
  formattedAddress: string
  country?: string // Código de país (ej: 'MX', 'CL', 'US')
  location: {
    lat: number
    lng: number
  }
  name?: string
  types?: string[]
}

export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'

// Variable global para la API key
let googleMapsApiKey: string | null = null
let googleMapsLoaded = false

/**
 * Inicializa Google Maps con la API key
 * Si no se proporciona apiKey, intenta obtenerla de las variables de entorno
 */
export async function initializeGoogleMaps(apiKey?: string): Promise<void> {
  // Si no se proporciona apiKey, intentar obtenerla de las variables de entorno
  if (!apiKey) {
    apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  }

  if (!apiKey) {
    throw new Error('Google Maps API key no está configurada. Configura VITE_GOOGLE_MAPS_API_KEY en tu archivo .env')
  }

  googleMapsApiKey = apiKey
  return loadGoogleMapsScript(apiKey)
}

/**
 * Carga el script de Google Maps
 */
function loadGoogleMapsScript(apiKey: string, language = 'es', region = 'CL'): Promise<void> {
  if (googleMapsLoaded && window.google?.maps) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    // Verificar si ya existe el script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval)
          googleMapsLoaded = true
          resolve()
        }
      }, 100)
      setTimeout(() => {
        clearInterval(checkInterval)
        if (window.google?.maps) {
          googleMapsLoaded = true
          resolve()
        } else {
          reject(new Error('Google Maps no se cargó'))
        }
      }, 10000)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=${language}&region=${region}`
    script.defer = true
    script.async = true
    script.id = 'google-maps-script'

    script.onload = () => {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval)
          googleMapsLoaded = true
          resolve()
        }
      }, 50)
      setTimeout(() => {
        clearInterval(checkInterval)
        if (window.google?.maps) {
          googleMapsLoaded = true
          resolve()
        } else {
          reject(new Error('Google Maps no se inicializó correctamente'))
        }
      }, 10000)
    }

    script.onerror = () => {
      reject(new Error('Error cargando Google Maps API'))
    }

    document.head.appendChild(script)
  })
}

/**
 * Calcula el precio basado en la distancia, país y tipo de vehículo
 * Usa el servicio de pricing del backend para obtener tarifas por país
 * @param distance Distancia en kilómetros
 * @param country Código de país (ej: 'MX', 'CL', 'US')
 * @param vehicleType Tipo de vehículo (opcional). Si es SEDAN, aplica descuento
 */
async function calculatePrice(distance: number, country?: string, vehicleType?: string): Promise<number> {
  if (distance <= 0) {
    // Obtener precio base del país
    try {
      const { api } = await import('./api')
      const pricing = await api.calculatePrice(0, country || 'CL', vehicleType)
      return pricing.totalPrice
    } catch (error) {
      console.error('Error calculando precio base:', error)
      return 0
    }
  }

  try {
    const { api } = await import('./api')
    const pricing = await api.calculatePrice(distance, country || 'CL', vehicleType)
    return pricing.totalPrice
  } catch (error) {
    console.error('Error calculando precio:', error)
    // Fallback a cálculo local en CLP si falla
    return calculatePriceFallback(distance, vehicleType)
  }
}

/**
 * Fallback: cálculo local en CLP (solo si falla el servicio)
 */
function calculatePriceFallback(distance: number, vehicleType?: string): number {
  let totalPrice = 0
  let remainingDistance = distance

  // 0-40 km: 1.500 por kilómetro
  if (remainingDistance > 0) {
    const kmInFirstTier = Math.min(remainingDistance, 40)
    totalPrice += kmInFirstTier * 1500
    remainingDistance -= kmInFirstTier
  }

  // 41-200 km: 1.200 por kilómetro
  if (remainingDistance > 0) {
    const kmInSecondTier = Math.min(remainingDistance, 160)
    totalPrice += kmInSecondTier * 1200
    remainingDistance -= kmInSecondTier
  }

  // 200+ km: 1.000 por kilómetro
  if (remainingDistance > 0) {
    totalPrice += remainingDistance * 1000
  }

  // Aplicar descuento del 35% si es SEDAN
  if (vehicleType === 'SEDAN') {
    const basePrice = 5000
    const distancePrice = totalPrice - basePrice
    const discountedDistancePrice = distancePrice * 0.65
    totalPrice = basePrice + discountedDistancePrice
  }

  return Math.round(totalPrice)
}

/**
 * Calcula una ruta entre dos puntos
 * @param country Código de país (ej: 'MX', 'CL') para calcular precio con tarifas locales
 */
export async function calculateRoute(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number },
  travelMode: TravelMode = 'DRIVING',
  vehicleType?: string,
  country?: string
): Promise<RouteInfo | null> {
  if (!window.google?.maps) {
    if (!googleMapsApiKey) {
      throw new Error('Google Maps no está inicializado. Llama a initializeGoogleMaps() primero.')
    }
    await loadGoogleMapsScript(googleMapsApiKey)
  }

  if (!window.google.maps.DirectionsService) {
    console.error('Directions Service no está disponible')
    return null
  }

  try {
    const directionsService = new window.google.maps.DirectionsService()

    const request: any = {
      origin: typeof origin === 'string'
        ? origin
        : new window.google.maps.LatLng(origin.lat, origin.lng),
      destination: typeof destination === 'string'
        ? destination
        : new window.google.maps.LatLng(destination.lat, destination.lng),
      travelMode: window.google.maps.TravelMode[travelMode],
    }

    return new Promise<RouteInfo | null>(async (resolve) => {
      directionsService.route(request, async (
        result: any | null,
        status: any
      ) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0]
          if (route.legs && route.legs.length > 0) {
            const leg = route.legs[0]

            if (leg.distance && leg.duration) {
              const distance = leg.distance.value / 1000 // convertir a km
              const duration = leg.duration.value / 60 // convertir a minutos
              const price = await calculatePrice(distance, country, vehicleType)

              resolve({
                distance,
                duration,
                distanceText: leg.distance.text,
                durationText: leg.duration.text,
                price,
                polyline: (route.overview_polyline as any)?.points || route.overview_polyline,
                bounds: result.routes[0].bounds ? {
                  northeast: {
                    lat: result.routes[0].bounds!.getNorthEast().lat(),
                    lng: result.routes[0].bounds!.getNorthEast().lng(),
                  },
                  southwest: {
                    lat: result.routes[0].bounds!.getSouthWest().lat(),
                    lng: result.routes[0].bounds!.getSouthWest().lng(),
                  },
                } : undefined,
              })
              return
            }
          }
        }

        console.error('Error calculando ruta:', status)
        resolve(null)
      })
    })
  } catch (error) {
    console.error('Error al calcular ruta:', error)
    return null
  }
}

/**
 * Busca lugares usando autocompletado
 * @param query Texto de búsqueda
 * @param countryCode Código de país ISO (ej: 'cl', 'ar', 'pe'). Si no se proporciona, usa 'cl' por defecto
 */
export async function searchPlaces(query: string, countryCode?: string): Promise<PlacePrediction[]> {
  if (!window.google?.maps?.places) {
    if (!googleMapsApiKey) {
      throw new Error('Google Maps no está inicializado')
    }
    await loadGoogleMapsScript(googleMapsApiKey)
  }

  if (!window.google.maps.places) {
    return []
  }

  // Usar el país proporcionado o 'cl' por defecto
  const country = countryCode?.toLowerCase() || 'cl'
  const region = countryCode?.toLowerCase() || 'cl'

  return new Promise((resolve) => {
    const service = new window.google.maps.places.AutocompleteService()
    service.getPlacePredictions(
      {
        input: query,
        language: 'es',
        region: region,
        componentRestrictions: { country: country },
      },
      (
        predictions: any[] | null,
        status: any
      ) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          resolve(
            predictions.map((p) => ({
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting.main_text,
              secondaryText: p.structured_formatting.secondary_text || '',
            }))
          )
        } else {
          resolve([])
        }
      }
    )
  })
}

/**
 * Obtiene detalles de un lugar por su placeId
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!window.google?.maps?.places) {
    if (!googleMapsApiKey) {
      throw new Error('Google Maps no está inicializado')
    }
    await loadGoogleMapsScript(googleMapsApiKey)
  }

  if (!window.google.maps.places) {
    return null
  }

  return new Promise((resolve) => {
    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    )
    service.getDetails(
      { placeId, fields: ['place_id', 'formatted_address', 'geometry', 'name', 'types', 'address_components'] },
      (
        place: any | null,
        status: any
      ) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          // Extraer código de país desde address_components
          let country: string | undefined
          if (place.address_components) {
            const countryComponent = place.address_components.find(
              (component) => component.types.includes('country')
            )
            country = countryComponent?.short_name
          }

          resolve({
            placeId: place.place_id || placeId,
            formattedAddress: place.formatted_address || '',
            country,
            location: {
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0,
            },
            name: place.name,
            types: place.types,
          })
        } else {
          resolve(null)
        }
      }
    )
  })
}

// Declaración global para TypeScript
declare global {
  interface Window {
    google?: any
  }
}

