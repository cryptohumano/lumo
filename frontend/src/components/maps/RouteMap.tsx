import { useEffect, useRef } from 'react'

interface RouteMapProps {
  origin: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  polyline?: string
  bounds?: {
    northeast: { lat: number; lng: number }
    southwest: { lat: number; lng: number }
  }
  height?: string
}

export default function RouteMap({
  origin,
  destination,
  polyline,
  bounds,
  height = '400px',
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const originMarkerRef = useRef<any>(null)
  const destinationMarkerRef = useRef<any>(null)
  const directionsRendererRef = useRef<any>(null)

  // Función auxiliar para dibujar ruta con DirectionsService
  const drawRouteWithDirectionsService = (
    map: any,
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    bounds?: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } }
  ) => {
    // Limpiar renderer anterior
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null)
    }

    const directionsService = new window.google.maps.DirectionsService()
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true, // Usamos nuestros propios marcadores
      polylineOptions: {
        strokeColor: '#3b82f6',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    })

    directionsRendererRef.current = directionsRenderer

    directionsService.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result)
          if (result.routes[0]?.bounds) {
            map.fitBounds(result.routes[0].bounds)
          } else if (bounds) {
            const boundsObj = new window.google.maps.LatLngBounds()
            boundsObj.extend({
              lat: bounds.southwest.lat,
              lng: bounds.southwest.lng,
            })
            boundsObj.extend({
              lat: bounds.northeast.lat,
              lng: bounds.northeast.lng,
            })
            map.fitBounds(boundsObj)
          }
        } else {
          // Si falla, al menos mostrar los puntos
          const boundsObj = new window.google.maps.LatLngBounds()
          boundsObj.extend({ lat: origin.lat, lng: origin.lng })
          boundsObj.extend({ lat: destination.lat, lng: destination.lng })
          map.fitBounds(boundsObj)
        }
      }
    )
  }

  useEffect(() => {
    if (!window.google?.maps || !mapRef.current) return

    // Crear o actualizar mapa
    if (!mapInstanceRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: origin.lat, lng: origin.lng },
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })
      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current

    // Limpiar marcadores y polyline anteriores
    if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null)
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null)
    }
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
    }

    // Crear marcador de origen
    originMarkerRef.current = new window.google.maps.Marker({
      position: { lat: origin.lat, lng: origin.lng },
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: origin.address,
      label: {
        text: 'A',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold',
      },
    })

    // Crear marcador de destino
    destinationMarkerRef.current = new window.google.maps.Marker({
      position: { lat: destination.lat, lng: destination.lng },
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: destination.address,
      label: {
        text: 'B',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold',
      },
    })

    // Dibujar ruta usando polyline si está disponible
    if (polyline && window.google.maps.geometry?.encoding) {
      try {
        const decodedPath = window.google.maps.geometry.encoding.decodePath(polyline)
        if (decodedPath && decodedPath.length > 0) {
          polylineRef.current = new window.google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.8,
            strokeWeight: 5,
            map: map,
          })

          // Ajustar el mapa para mostrar toda la ruta
          const routeBounds = new window.google.maps.LatLngBounds()
          decodedPath.forEach((point: any) => {
            routeBounds.extend(point)
          })
          routeBounds.extend({ lat: origin.lat, lng: origin.lng })
          routeBounds.extend({ lat: destination.lat, lng: destination.lng })
          map.fitBounds(routeBounds)
        } else {
          // Si no se puede decodificar, usar DirectionsService
          drawRouteWithDirectionsService(map, origin, destination, bounds)
        }
      } catch (error) {
        console.error('Error decodificando polyline:', error)
        // Fallback a DirectionsService
        drawRouteWithDirectionsService(map, origin, destination, bounds)
      }
    } else if (polyline) {
      // Si hay polyline pero no está la librería de geometría, usar DirectionsService
      drawRouteWithDirectionsService(map, origin, destination, bounds)
    } else {
      // Si no hay polyline, usar DirectionsService como fallback
      drawRouteWithDirectionsService(map, origin, destination, bounds)
    }

    return () => {
      // Cleanup
      if (originMarkerRef.current) {
        originMarkerRef.current.setMap(null)
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null)
      }
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null)
      }
    }
  }, [origin, destination, polyline, bounds])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      className="rounded-lg border overflow-hidden"
    />
  )
}

