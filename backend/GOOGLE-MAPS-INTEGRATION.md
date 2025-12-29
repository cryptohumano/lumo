# Integración de Google Maps con Prisma

## 📋 Resumen

El schema de Prisma ahora incluye modelos para almacenar y cachear datos de Google Maps, reduciendo llamadas a la API y mejorando el rendimiento.

## 🗺️ Modelos de Google Maps

### 1. **Place** (Lugares de Google Maps)

Modelo para cachear lugares obtenidos de Google Places API.

**Campos clave**:
- `placeId`: String único (Google Place ID)
- `formattedAddress`: String (dirección formateada)
- `name`: String? (nombre del lugar)
- `latitude`, `longitude`: Float (coordenadas)
- `types`: String[] (tipos del lugar: establishment, point_of_interest, etc.)
- `city`, `country`, `region`, `postalCode`: String? (información geográfica)
- `lastFetched`: DateTime (última actualización desde Google)

**Relaciones**:
- `originTrips`: Trip[] (viajes que usan este lugar como origen)
- `destinationTrips`: Trip[] (viajes que usan este lugar como destino)
- `locations`: Location[] (ubicaciones que referencian este lugar)
- `originRoutes`: Route[] (rutas que usan este lugar como origen)
- `destinationRoutes`: Route[] (rutas que usan este lugar como destino)
- `experienceStartPlaces`: Experience[] (experiencias que inician aquí)
- `experienceEndPlaces`: Experience[] (experiencias que terminan aquí)

**Uso**:
```typescript
// Al obtener detalles de un lugar de Google Maps
const placeDetails = await getPlaceDetails(placeId)

// Guardar en cache
await prisma.place.upsert({
  where: { placeId: placeDetails.placeId },
  update: {
    formattedAddress: placeDetails.formattedAddress,
    latitude: placeDetails.location.lat,
    longitude: placeDetails.location.lng,
    name: placeDetails.name,
    types: placeDetails.types || [],
    lastFetched: new Date()
  },
  create: {
    placeId: placeDetails.placeId,
    formattedAddress: placeDetails.formattedAddress,
    latitude: placeDetails.location.lat,
    longitude: placeDetails.location.lng,
    name: placeDetails.name,
    types: placeDetails.types || []
  }
})
```

---

### 2. **Route** (Rutas Calculadas)

Modelo para cachear rutas calculadas de Google Directions API.

**Campos clave**:
- `originPlaceId`: String (FK → Place)
- `destinationPlaceId`: String (FK → Place)
- `travelMode`: String (DRIVING, WALKING, BICYCLING, TRANSIT)
- `distance`: Float (kilómetros)
- `duration`: Int (minutos)
- `polyline`: String? (polyline codificado para dibujar ruta)
- `bounds`: Json? (bounds de la ruta)
- `waypoints`: Json? (waypoints si los hay)
- `lastCalculated`: DateTime (última vez calculada)

**Unique constraint**: `[originPlaceId, destinationPlaceId, travelMode]`

**Uso**:
```typescript
// Al calcular una ruta
const routeInfo = await calculateRoute({
  origin: originPlace,
  destination: destinationPlace,
  travelMode: 'DRIVING'
})

// Buscar ruta en cache
let route = await prisma.route.findUnique({
  where: {
    originPlaceId_destinationPlaceId_travelMode: {
      originPlaceId: originPlace.id,
      destinationPlaceId: destinationPlace.id,
      travelMode: 'DRIVING'
    }
  }
})

// Si no existe o es antigua (>24h), calcular y guardar
if (!route || route.lastCalculated < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  route = await prisma.route.upsert({
    where: {
      originPlaceId_destinationPlaceId_travelMode: {
        originPlaceId: originPlace.id,
        destinationPlaceId: destinationPlace.id,
        travelMode: 'DRIVING'
      }
    },
    update: {
      distance: routeInfo.distance,
      duration: routeInfo.duration,
      distanceText: routeInfo.distanceText,
      durationText: routeInfo.durationText,
      polyline: routeInfo.polyline,
      bounds: routeInfo.bounds,
      lastCalculated: new Date()
    },
    create: {
      originPlaceId: originPlace.id,
      destinationPlaceId: destinationPlace.id,
      travelMode: 'DRIVING',
      distance: routeInfo.distance,
      duration: routeInfo.duration,
      distanceText: routeInfo.distanceText,
      durationText: routeInfo.durationText,
      polyline: routeInfo.polyline,
      bounds: routeInfo.bounds
    }
  })
}
```

---

### 3. **Location** (Mejorado)

Modelo `Location` ahora puede referenciar un `Place` de Google Maps.

**Campos nuevos**:
- `placeId`: String? (FK → Place)

**Uso**:
```typescript
// Crear ubicación desde Google Place
const place = await prisma.place.findUnique({
  where: { placeId: googlePlaceId }
})

await prisma.location.create({
  data: {
    userId: user.id,
    placeId: place.id,
    name: place.name || place.formattedAddress,
    address: place.formattedAddress,
    latitude: place.latitude,
    longitude: place.longitude,
    city: place.city,
    country: place.country
  }
})
```

---

### 4. **Trip** (Mejorado)

Modelo `Trip` ahora puede referenciar `Place` y `Route` de Google Maps.

**Campos nuevos**:
- `originPlaceId`: String? (FK → Place)
- `destinationPlaceId`: String? (FK → Place)
- `routeId`: String? (FK → Route)
- `routePolyline`: String? (polyline de la ruta)
- `routeBounds`: Json? (bounds de la ruta)

**Uso**:
```typescript
// Crear viaje con Places y Route
const trip = await prisma.trip.create({
  data: {
    tripNumber: 'TRIP-2024-001',
    passengerId: passenger.id,
    // Campos legacy (mantener para compatibilidad)
    originAddress: originPlace.formattedAddress,
    originLatitude: originPlace.latitude,
    originLongitude: originPlace.longitude,
    destinationAddress: destinationPlace.formattedAddress,
    destinationLatitude: destinationPlace.latitude,
    destinationLongitude: destinationPlace.longitude,
    // Referencias a Google Maps
    originPlaceId: originPlace.id,
    destinationPlaceId: destinationPlace.id,
    routeId: route.id,
    routePolyline: route.polyline,
    routeBounds: route.bounds,
    // Datos del viaje
    distance: route.distance,
    duration: route.duration,
    distanceText: route.distanceText,
    durationText: route.durationText,
    totalPrice: calculatePrice(route.distance)
  }
})
```

---

### 5. **Experience** (Mejorado)

Modelo `Experience` ahora puede referenciar `Place` para inicio y fin.

**Campos nuevos**:
- `startPlaceId`: String? (FK → Place)
- `endPlaceId`: String? (FK → Place)
- `waypointPlaceIds`: String[] (Array de Place IDs)

**Uso**:
```typescript
// Crear experiencia con Places
const experience = await prisma.experience.create({
  data: {
    hostId: host.id,
    title: 'Tour por el desierto de Atacama',
    description: '...',
    startPlaceId: startPlace.id,
    endPlaceId: endPlace.id,
    waypointPlaceIds: waypoints.map(w => w.id),
    // Campos legacy
    startLocation: {
      address: startPlace.formattedAddress,
      lat: startPlace.latitude,
      lng: startPlace.longitude
    },
    endLocation: {
      address: endPlace.formattedAddress,
      lat: endPlace.latitude,
      lng: endPlace.longitude
    }
  }
})
```

---

## 🔄 Flujo de Integración

### 1. Usuario busca un lugar
```
Usuario escribe "Aeropuerto de Santiago"
  ↓
searchPlaces() → Google Places API
  ↓
Retorna PlacePrediction[] con placeIds
  ↓
Usuario selecciona un lugar
  ↓
getPlaceDetails(placeId) → Google Places API
  ↓
Guardar en Place (cache)
  ↓
Usar Place.id en Trip/Experience
```

### 2. Usuario calcula una ruta
```
Usuario selecciona origen y destino
  ↓
Buscar Places en cache o crear nuevos
  ↓
Buscar Route en cache
  ↓
Si no existe o es antigua:
  calculateRoute() → Google Directions API
  ↓
Guardar Route en cache
  ↓
Usar Route.id en Trip
```

### 3. Crear viaje con datos de Google Maps
```
Usuario crea viaje
  ↓
Obtener Places (origen y destino)
  ↓
Obtener Route (ruta calculada)
  ↓
Crear Trip con referencias a Place y Route
  ↓
Guardar polyline y bounds para mostrar en mapa
```

---

## 💡 Beneficios

1. **Reducción de llamadas a API**: Cache de Places y Routes
2. **Mejor rendimiento**: Datos geográficos pre-calculados
3. **Consistencia**: Mismos lugares usan mismos Place IDs
4. **Visualización**: Polyline y bounds guardados para mostrar rutas
5. **Búsquedas eficientes**: Índices en coordenadas y placeIds

---

## 🔧 Servicio Recomendado

```typescript
// backend/src/services/googleMapsService.ts
import { getPlaceDetails, calculateRoute } from '@operations/google-maps-service'
import { prisma } from '../index'

export async function getOrCreatePlace(placeId: string) {
  // Buscar en cache
  let place = await prisma.place.findUnique({
    where: { placeId }
  })

  // Si no existe o es antiguo (>30 días), actualizar desde Google
  if (!place || place.lastFetched < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
    const details = await getPlaceDetails(placeId)
    
    if (details) {
      place = await prisma.place.upsert({
        where: { placeId },
        update: {
          formattedAddress: details.formattedAddress,
          latitude: details.location.lat,
          longitude: details.location.lng,
          name: details.name,
          types: details.types || [],
          lastFetched: new Date()
        },
        create: {
          placeId: details.placeId,
          formattedAddress: details.formattedAddress,
          latitude: details.location.lat,
          longitude: details.location.lng,
          name: details.name,
          types: details.types || []
        }
      })
    }
  }

  return place
}

export async function getOrCreateRoute(
  originPlaceId: string,
  destinationPlaceId: string,
  travelMode: string = 'DRIVING'
) {
  // Buscar en cache
  let route = await prisma.route.findUnique({
    where: {
      originPlaceId_destinationPlaceId_travelMode: {
        originPlaceId,
        destinationPlaceId,
        travelMode
      }
    },
    include: {
      originPlace: true,
      destinationPlace: true
    }
  })

  // Si no existe o es antigua (>24h), calcular desde Google
  if (!route || route.lastCalculated < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    const originPlace = await prisma.place.findUnique({ where: { id: originPlaceId } })
    const destinationPlace = await prisma.place.findUnique({ where: { id: destinationPlaceId } })

    if (!originPlace || !destinationPlace) {
      throw new Error('Places no encontrados')
    }

    const routeInfo = await calculateRoute({
      origin: { lat: originPlace.latitude, lng: originPlace.longitude },
      destination: { lat: destinationPlace.latitude, lng: destinationPlace.longitude },
      travelMode: travelMode as any
    })

    if (routeInfo) {
      route = await prisma.route.upsert({
        where: {
          originPlaceId_destinationPlaceId_travelMode: {
            originPlaceId,
            destinationPlaceId,
            travelMode
          }
        },
        update: {
          distance: routeInfo.distance,
          duration: routeInfo.duration,
          distanceText: routeInfo.distanceText,
          durationText: routeInfo.durationText,
          polyline: routeInfo.polyline,
          bounds: routeInfo.bounds,
          lastCalculated: new Date()
        },
        create: {
          originPlaceId,
          destinationPlaceId,
          travelMode,
          distance: routeInfo.distance,
          duration: routeInfo.duration,
          distanceText: routeInfo.distanceText,
          durationText: routeInfo.durationText,
          polyline: routeInfo.polyline,
          bounds: routeInfo.bounds
        },
        include: {
          originPlace: true,
          destinationPlace: true
        }
      })
    }
  }

  return route
}
```

---

## 📊 Índices y Optimizaciones

### Place
- `placeId` (único) - Búsqueda rápida por Google Place ID
- `[latitude, longitude]` (compuesto) - Búsquedas geográficas
- `formattedAddress` - Búsqueda por dirección
- `lastFetched` - Limpieza de datos antiguos

### Route
- `[originPlaceId, destinationPlaceId, travelMode]` (único) - Evita duplicados
- `originPlaceId`, `destinationPlaceId` - Joins eficientes
- `travelMode` - Filtrado por modo de transporte
- `lastCalculated` - Limpieza de rutas antiguas

### Trip
- `originPlaceId`, `destinationPlaceId`, `routeId` - Joins con Places y Routes

### Experience
- `startPlaceId`, `endPlaceId` - Joins con Places

---

## 🚀 Próximos Pasos

1. Crear servicio `googleMapsService.ts` con funciones de cache
2. Actualizar lógica de creación de viajes para usar Places
3. Implementar limpieza automática de datos antiguos
4. Agregar endpoints para búsqueda de lugares
5. Integrar visualización de rutas en frontend usando polyline

---

## ⚠️ Notas Importantes

1. **Cache**: Los datos se cachean para reducir llamadas a la API
2. **Actualización**: Places se actualizan cada 30 días, Routes cada 24 horas
3. **Compatibilidad**: Se mantienen campos legacy para compatibilidad
4. **Polyline**: Se guarda para mostrar rutas en mapas sin recalcular
5. **Bounds**: Se guardan para centrar mapas correctamente

