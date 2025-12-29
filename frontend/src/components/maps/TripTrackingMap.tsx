/**
 * Componente de mapa para seguimiento de viaje en tiempo real
 * Muestra la ruta, origen, destino y opcionalmente la ubicación actual
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { initializeGoogleMaps } from '@/services/googleMaps'
import type { Trip } from '@/types'

interface TripTrackingMapProps {
  trip: Trip
  showCurrentLocation?: boolean
  currentLatitude?: number
  currentLongitude?: number
  height?: string
}

export function TripTrackingMap({
  trip,
  showCurrentLocation = false,
  currentLatitude,
  currentLongitude,
  height = '400px',
}: TripTrackingMapProps) {
  const { t } = useTranslation()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let googleMap: any = null
    let polyline: any = null
    let originMarker: any = null
    let destinationMarker: any = null
    let currentLocationMarker: any = null

    const initMap = async () => {
      if (!mapRef.current) return

      try {
        // Inicializar Google Maps (obtiene API key de env si no se proporciona)
        await initializeGoogleMaps()

        if (!window.google?.maps) {
          throw new Error('Google Maps no se cargó correctamente')
        }

        // Crear mapa
        googleMap = new window.google.maps.Map(mapRef.current, {
          center: {
            lat: trip.originLatitude,
            lng: trip.originLongitude,
          },
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: true,
          streetViewControl: false,
        })

        mapInstanceRef.current = googleMap
        setMapLoaded(true)

        // Crear marcador de origen
        originMarker = new window.google.maps.Marker({
          position: {
            lat: trip.originLatitude,
            lng: trip.originLongitude,
          },
          map: googleMap,
          label: {
            text: 'A',
            color: '#ffffff',
            fontWeight: 'bold',
          },
          icon: {
            path: (window.google?.maps as any)?.SymbolPath?.CIRCLE || '',
            scale: 8,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: trip.originAddress,
        })

        // Crear marcador de destino
        destinationMarker = new window.google.maps.Marker({
          position: {
            lat: trip.destinationLatitude,
            lng: trip.destinationLongitude,
          },
          map: googleMap,
          label: {
            text: 'B',
            color: '#ffffff',
            fontWeight: 'bold',
          },
          icon: {
            path: (window.google?.maps as any)?.SymbolPath?.CIRCLE || '',
            scale: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: trip.destinationAddress,
        })

        // Dibujar ruta si hay polyline
        if (trip.routePolyline) {
          try {
            const decodedPath = window.google.maps.geometry.encoding.decodePath(trip.routePolyline)
            polyline = new window.google.maps.Polyline({
              path: decodedPath,
              geodesic: true,
              strokeColor: '#3b82f6',
              strokeOpacity: 1.0,
              strokeWeight: 4,
              map: googleMap,
            })

            // Ajustar vista para mostrar toda la ruta
            const bounds = new window.google.maps.LatLngBounds()
            decodedPath.forEach((point: any) => {
              bounds.extend(point)
            })
            googleMap.fitBounds(bounds)
          } catch (err) {
            console.error('Error decoding polyline:', err)
            // Fallback: dibujar línea recta
            polyline = new window.google.maps.Polyline({
              path: [
                { lat: trip.originLatitude, lng: trip.originLongitude },
                { lat: trip.destinationLatitude, lng: trip.destinationLongitude },
              ],
              geodesic: true,
              strokeColor: '#3b82f6',
              strokeOpacity: 0.5,
              strokeWeight: 2,
              map: googleMap,
            })
          }
        } else {
          // Sin polyline, dibujar línea recta
          polyline = new window.google.maps.Polyline({
            path: [
              { lat: trip.originLatitude, lng: trip.originLongitude },
              { lat: trip.destinationLatitude, lng: trip.destinationLongitude },
            ],
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.5,
            strokeWeight: 2,
            map: googleMap,
          })
        }

        // Mostrar ubicación actual si está disponible
        if (showCurrentLocation && currentLatitude && currentLongitude) {
          currentLocationMarker = new window.google.maps.Marker({
            position: {
              lat: currentLatitude,
              lng: currentLongitude,
            },
            map: googleMap,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#f59e0b',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
            title: t('trip.currentLocation') || 'Tu ubicación actual',
            animation: window.google.maps.Animation.DROP,
          })
        }
      } catch (err: any) {
        console.error('Error initializing map:', err)
        const errorMessage = err.message || t('trip.mapError') || 'Error al cargar el mapa'
        if (errorMessage.includes('API key')) {
          setError('Google Maps API key no configurada. Contacta al administrador.')
        } else {
          setError(errorMessage)
        }
      }
    }

    initMap()

    // Cleanup
    return () => {
      if (polyline) polyline.setMap(null)
      if (originMarker) originMarker.setMap(null)
      if (destinationMarker) destinationMarker.setMap(null)
      if (currentLocationMarker) currentLocationMarker.setMap(null)
    }
  }, [trip, showCurrentLocation, currentLatitude, currentLongitude, t])

  // Actualizar marcador de ubicación actual si cambia
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !showCurrentLocation) return

    // El marcador se actualiza en el efecto principal
    // Aquí solo ajustamos la vista si es necesario
    if (currentLatitude && currentLongitude && mapInstanceRef.current && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend({ lat: trip.originLatitude, lng: trip.originLongitude })
      bounds.extend({ lat: trip.destinationLatitude, lng: trip.destinationLongitude })
      bounds.extend({ lat: currentLatitude, lng: currentLongitude })
      mapInstanceRef.current.fitBounds(bounds)
    }
  }, [currentLatitude, currentLongitude, mapLoaded, trip, showCurrentLocation])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border">
      <div ref={mapRef} style={{ height, width: '100%' }} />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <p className="text-sm text-muted-foreground">{t('common.loading') || 'Cargando mapa...'}</p>
        </div>
      )}
    </div>
  )
}

