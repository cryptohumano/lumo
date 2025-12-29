// Declaración de tipos para Google Maps API
// Los tipos completos se cargan dinámicamente desde el script de Google Maps

declare global {
  interface Window {
    google?: {
      maps: typeof google.maps
    }
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: MapOptions)
      setCenter(latlng: LatLng | LatLngLiteral): void
      setZoom(zoom: number): void
      setOptions(options: MapOptions): void
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral
      zoom?: number
      mapTypeId?: MapTypeId
      disableDefaultUI?: boolean
      zoomControl?: boolean
      streetViewControl?: boolean
      fullscreenControl?: boolean
    }

    enum MapTypeId {
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      HYBRID = 'hybrid',
      TERRAIN = 'terrain',
    }

    class Marker {
      constructor(options?: MarkerOptions)
      setPosition(position: LatLng | LatLngLiteral): void
      setMap(map: Map | null): void
      setVisible(visible: boolean): void
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral
      map?: Map | null
      title?: string
      icon?: string | Icon | Symbol
      visible?: boolean
      animation?: Animation
    }

    enum Animation {
      BOUNCE = 1,
      DROP = 2,
    }

    class Polyline {
      constructor(options?: PolylineOptions)
      setPath(path: LatLng[] | LatLngLiteral[]): void
      setMap(map: Map | null): void
      setVisible(visible: boolean): void
    }

    interface PolylineOptions {
      path?: LatLng[] | LatLngLiteral[]
      map?: Map | null
      strokeColor?: string
      strokeOpacity?: number
      strokeWeight?: number
      visible?: boolean
    }

    class LatLng {
      constructor(lat: number, lng: number, noWrap?: boolean)
      lat(): number
      lng(): number
    }

    interface LatLngLiteral {
      lat: number
      lng: number
    }

    interface Icon {
      url: string
      scaledSize?: Size
      anchor?: Point
    }

    interface Symbol {
      path?: string
      scale?: number
      fillColor?: string
      strokeColor?: string
    }

    interface Size {
      width: number
      height: number
    }

    interface Point {
      x: number
      y: number
    }

    class DirectionsService {
      route(request: DirectionsRequest, callback: (result: DirectionsResult, status: DirectionsStatus) => void): void
    }

    interface DirectionsRequest {
      origin: LatLng | LatLngLiteral | string
      destination: LatLng | LatLngLiteral | string
      travelMode?: TravelMode
      waypoints?: DirectionsWaypoint[]
      optimizeWaypoints?: boolean
    }

    enum TravelMode {
      DRIVING = 'DRIVING',
      WALKING = 'WALKING',
      BICYCLING = 'BICYCLING',
      TRANSIT = 'TRANSIT',
    }

    interface DirectionsWaypoint {
      location: LatLng | LatLngLiteral | string
      stopover?: boolean
    }

    interface DirectionsResult {
      routes: DirectionsRoute[]
    }

    interface DirectionsRoute {
      legs: DirectionsLeg[]
      overview_polyline: {
        points: string
      }
      bounds: LatLngBounds
    }

    interface DirectionsLeg {
      distance: {
        text: string
        value: number
      }
      duration: {
        text: string
        value: number
      }
      start_address: string
      end_address: string
      start_location: LatLng
      end_location: LatLng
      steps: DirectionsStep[]
    }

    interface DirectionsStep {
      distance: {
        text: string
        value: number
      }
      duration: {
        text: string
        value: number
      }
      start_location: LatLng
      end_location: LatLng
      html_instructions: string
      polyline: {
        points: string
      }
    }

    enum DirectionsStatus {
      OK = 'OK',
      NOT_FOUND = 'NOT_FOUND',
      ZERO_RESULTS = 'ZERO_RESULTS',
      MAX_WAYPOINTS_EXCEEDED = 'MAX_WAYPOINTS_EXCEEDED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    }

    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral)
      extend(latlng: LatLng | LatLngLiteral): void
      getCenter(): LatLng
      getNorthEast(): LatLng
      getSouthWest(): LatLng
      contains(latlng: LatLng | LatLngLiteral): boolean
    }

    class Geocoder {
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void
    }

    interface GeocoderRequest {
      address?: string
      location?: LatLng | LatLngLiteral
      placeId?: string
    }

    interface GeocoderResult {
      address_components: AddressComponent[]
      formatted_address: string
      geometry: GeocoderGeometry
      place_id: string
      types: string[]
    }

    interface AddressComponent {
      long_name: string
      short_name: string
      types: string[]
    }

    interface GeocoderGeometry {
      location: LatLng
      location_type: GeocoderLocationType
      viewport: LatLngBounds
      bounds?: LatLngBounds
    }

    enum GeocoderLocationType {
      ROOFTOP = 'ROOFTOP',
      RANGE_INTERPOLATED = 'RANGE_INTERPOLATED',
      GEOMETRIC_CENTER = 'GEOMETRIC_CENTER',
      APPROXIMATE = 'APPROXIMATE',
    }

    enum GeocoderStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    }

    namespace SymbolPath {
      const CIRCLE: string
      const FORWARD_CLOSED_ARROW: string
      const FORWARD_OPEN_ARROW: string
      const BACKWARD_CLOSED_ARROW: string
      const BACKWARD_OPEN_ARROW: string
    }

    namespace geometry {
      namespace encoding {
        function decodePath(encoded: string): LatLng[]
        function encodePath(path: LatLng[] | LatLngLiteral[]): string
      }
    }
  }
}

export {}

