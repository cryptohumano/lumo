# Arquitectura de Emergencias con Polkadot

## 🎯 Problemas Identificados

### 1. Precisión GPS
- El GPS del dispositivo puede tener errores de 5-50 metros
- En interiores o áreas urbanas densas, la precisión empeora
- No hay validación ni mejora de precisión

### 2. Dependencia del Backend
- Si el backend está caído, no se pueden reportar emergencias
- Punto único de fallo
- Los servicios de emergencia dependen del backend para recibir alertas

---

## 🚀 Solución Propuesta: Arquitectura Híbrida

### **Opción 1: Sistema Actual (Backend)**
- ✅ Rápido y familiar
- ✅ Fácil de implementar
- ❌ Depende del backend
- ❌ Punto único de fallo

### **Opción 2: Polkadot On-Chain (Recomendada)**
- ✅ **Resiliente**: Funciona aunque el backend esté caído
- ✅ **Descentralizado**: No hay punto único de fallo
- ✅ **Transparente**: Todo en la blockchain, inmutable
- ✅ **Escalable**: Los servicios pueden escuchar directamente
- ✅ **Barato**: Solo fees de transacción (muy bajos)
- ✅ **Con identidad**: Usa People Chain Identity para autenticación
- ❌ Requiere wallet conectada
- ❌ Pequeña latencia de confirmación de bloque

---

## 📋 Implementación Recomendada

### **Arquitectura Híbrida: Ambos Sistemas**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (App Móvil)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Usuario reporta emergencia                                │
│     ↓                                                         │
│  2. Mejorar precisión GPS (múltiples fuentes)                │
│     ↓                                                         │
│  3. Intentar enviar a Polkadot (PRIMARIO)                    │
│     ├─ ✅ Éxito → Confirmar en backend (sincronización)      │
│     └─ ❌ Fallo → Enviar a backend (FALLBACK)                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              POLKADOT (People Chain / Asset Hub)             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Pallet: EmergencyReport                                     │
│  ├─ report_emergency(                                        │
│  │    reporter: AccountId,      // Identidad People Chain   │
│  │    emergency_type: u8,        // Tipo de emergencia       │
│  │    severity: u8,              // Severidad                │
│  │    latitude: i32,            // Latitud * 1e6 (precisión)│
│  │    longitude: i32,            // Longitud * 1e6           │
│  │    timestamp: u64,            // Unix timestamp            │
│  │    metadata: Vec<u8>,         // JSON comprimido           │
│  │  )                                                         │
│  │                                                            │
│  └─ Event: EmergencyReported {                               │
│       emergency_id: [u8; 32],   // Hash único                │
│       reporter: AccountId,                                   │
│       emergency_type: u8,                                    │
│       severity: u8,                                          │
│       latitude: i32,                                         │
│       longitude: i32,                                        │
│       timestamp: u64,                                         │
│     }                                                         │
│                                                               │
│  Ventajas:                                                    │
│  • Muy barato (solo fees de transacción ~$0.001)             │
│  • Inmutable y transparente                                   │
│  • Los servicios pueden escuchar eventos directamente        │
│  • No requiere backend                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              SERVICIOS DE EMERGENCIA                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  • Escuchan eventos directamente desde la blockchain          │
│  • No dependen del backend                                   │
│  • Pueden filtrar por área geográfica                        │
│  • Respuesta inmediata al evento                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Sincronización)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  • Escucha eventos de Polkadot                              │
│  • Sincroniza con base de datos                              │
│  • Procesa alertas adicionales                              │
│  • Proporciona API REST para consultas                      │
│  • Fallback si Polkadot no está disponible                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Mejoras de Precisión GPS

### **Estrategia Multi-Fuente**

```typescript
interface LocationData {
  latitude: number
  longitude: number
  accuracy: number  // metros
  source: 'gps' | 'network' | 'wifi' | 'hybrid'
  timestamp: number
}

async function getImprovedLocation(): Promise<LocationData> {
  // 1. GPS (más preciso, pero puede fallar)
  const gpsLocation = await getGPSLocation()
  
  // 2. Network Location (menos preciso, pero más rápido)
  const networkLocation = await getNetworkLocation()
  
  // 3. WiFi Positioning (si está disponible)
  const wifiLocation = await getWiFiLocation()
  
  // 4. Combinar usando weighted average
  return combineLocations([gpsLocation, networkLocation, wifiLocation])
}

function combineLocations(locations: LocationData[]): LocationData {
  // Filtrar por precisión (solo < 50m)
  const validLocations = locations.filter(loc => loc.accuracy < 50)
  
  if (validLocations.length === 0) {
    // Si ninguna es válida, usar la más precisa disponible
    return locations.sort((a, b) => a.accuracy - b.accuracy)[0]
  }
  
  // Weighted average basado en precisión
  let totalWeight = 0
  let weightedLat = 0
  let weightedLng = 0
  
  validLocations.forEach(loc => {
    const weight = 1 / loc.accuracy  // Más peso = más preciso
    totalWeight += weight
    weightedLat += loc.latitude * weight
    weightedLng += loc.longitude * weight
  })
  
  return {
    latitude: weightedLat / totalWeight,
    longitude: weightedLng / totalWeight,
    accuracy: Math.min(...validLocations.map(l => l.accuracy)),
    source: 'hybrid',
    timestamp: Date.now()
  }
}
```

### **Validación de Precisión**

```typescript
function validateLocation(location: LocationData): boolean {
  // Validar que la precisión sea aceptable
  if (location.accuracy > 100) {
    console.warn('Precisión GPS muy baja:', location.accuracy)
    return false
  }
  
  // Validar que las coordenadas sean válidas
  if (location.latitude < -90 || location.latitude > 90) return false
  if (location.longitude < -180 || location.longitude > 180) return false
  
  return true
}
```

---

## 🏗️ Implementación Polkadot

### **Opción A: Usar System::remarkWithEvent (Más Simple)**

```rust
// En el cliente (TypeScript)
const emergencyData = {
  type: emergencyType,
  severity: severity,
  lat: Math.round(latitude * 1e6),  // Precisión de 6 decimales
  lng: Math.round(longitude * 1e6),
  timestamp: Date.now(),
  title: title,
  description: description,
}

// Comprimir JSON
const compressed = compress(JSON.stringify(emergencyData))

// Crear extrinsic
const extrinsic = api.tx.system.remarkWithEvent(compressed)

// Firmar y enviar
await extrinsic.signAndSend(account, ({ status }) => {
  if (status.isInBlock) {
    console.log('Emergencia reportada en bloque:', status.asInBlock.toString())
  }
})
```

**Ventajas:**
- ✅ No requiere crear pallet
- ✅ Muy barato
- ✅ Funciona inmediatamente
- ✅ Los servicios pueden escuchar eventos

**Desventajas:**
- ❌ Datos en formato raw (necesita parsing)
- ❌ Menos estructura

### **Opción B: Crear Pallet Personalizada (Recomendada)**

```rust
// pallets/emergency/src/lib.rs

#[pallet::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    #[pallet::storage]
    pub type EmergencyReports<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        [u8; 32],  // emergency_id
        EmergencyReport<T::AccountId>,
        OptionQuery,
    >;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        EmergencyReported {
            emergency_id: [u8; 32],
            reporter: T::AccountId,
            emergency_type: u8,
            severity: u8,
            latitude: i32,
            longitude: i32,
            timestamp: u64,
        },
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(10_000)]
        pub fn report_emergency(
            origin: OriginFor<T>,
            emergency_type: u8,
            severity: u8,
            latitude: i32,
            longitude: i32,
            metadata: Vec<u8>,
        ) -> DispatchResult {
            let reporter = ensure_signed(origin)?;
            
            // Validar coordenadas
            ensure!(latitude >= -90_000_000 && latitude <= 90_000_000, Error::<T>::InvalidLatitude);
            ensure!(longitude >= -180_000_000 && longitude <= 180_000_000, Error::<T>::InvalidLongitude);
            
            // Generar ID único
            let emergency_id = Self::generate_emergency_id(&reporter, &metadata);
            
            // Guardar reporte
            let report = EmergencyReport {
                reporter: reporter.clone(),
                emergency_type,
                severity,
                latitude,
                longitude,
                timestamp: <frame_system::Pallet<T>>::block_number(),
                metadata,
            };
            
            <EmergencyReports<T>>::insert(emergency_id, report);
            
            // Emitir evento
            Self::deposit_event(Event::EmergencyReported {
                emergency_id,
                reporter,
                emergency_type,
                severity,
                latitude,
                longitude,
                timestamp: <frame_system::Pallet<T>>::block_number(),
            });
            
            Ok(())
        }
    }
}
```

**Ventajas:**
- ✅ Estructura clara y tipada
- ✅ Validaciones en-chain
- ✅ Fácil de consultar
- ✅ Escalable

**Desventajas:**
- ❌ Requiere desarrollo de pallet
- ❌ Necesita deployment en runtime

---

## 📡 Escucha de Eventos (Servicios de Emergencia)

```typescript
// Servicio de emergencia escuchando eventos
import { ApiPromise, WsProvider } from '@polkadot/api'

const provider = new WsProvider('wss://polkadot-people-rpc.polkadot.io')
const api = await ApiPromise.create({ provider })

// Escuchar eventos de emergencia
api.query.system.events((events) => {
  events.forEach((record) => {
    const { event } = record
    
    if (api.events.emergency.EmergencyReported.is(event)) {
      const [emergencyId, reporter, type, severity, lat, lng, timestamp] = event.data
      
      // Convertir coordenadas
      const latitude = lat.toNumber() / 1e6
      const longitude = lng.toNumber() / 1e6
      
      // Filtrar por área geográfica (ej: Chile)
      if (isInServiceArea(latitude, longitude)) {
        // Notificar al servicio
        notifyEmergencyService({
          emergencyId: emergencyId.toHex(),
          reporter: reporter.toString(),
          type: type.toNumber(),
          severity: severity.toNumber(),
          latitude,
          longitude,
          timestamp: timestamp.toNumber(),
        })
      }
    }
  })
})
```

---

## 💰 Costos Estimados

### **System::remarkWithEvent**
- **Fee base**: ~0.001 DOT (~$0.01)
- **Por byte**: ~0.000001 DOT
- **Total estimado**: ~0.002 DOT (~$0.02) por emergencia

### **Pallet Personalizada**
- **Fee base**: ~0.001 DOT
- **Storage**: Mínimo (solo metadata)
- **Total estimado**: ~0.001-0.002 DOT (~$0.01-0.02) por emergencia

**Comparación:**
- Llamada API backend: Gratis (pero requiere servidor)
- Polkadot: ~$0.02 (pero descentralizado y resiliente)

---

## 🎯 Plan de Implementación

### **Fase 1: Mejora de Precisión GPS** (1-2 días)
- [ ] Implementar combinación multi-fuente
- [ ] Validación de precisión
- [ ] UI para mostrar precisión al usuario

### **Fase 2: Integración Polkadot (System::remark)** (3-5 días)
- [ ] Crear servicio de reporte on-chain
- [ ] Implementar fallback a backend
- [ ] Testing

### **Fase 3: Pallet Personalizada** (1-2 semanas)
- [ ] Desarrollar pallet
- [ ] Testing en testnet
- [ ] Deployment en mainnet
- [ ] Migración de System::remark a pallet

### **Fase 4: Servicios de Emergencia** (1 semana)
- [ ] SDK para escuchar eventos
- [ ] Documentación para servicios
- [ ] Ejemplos de integración

---

## 🔐 Seguridad y Privacidad

### **Consideraciones:**
1. **Datos sensibles**: No almacenar información personal en-chain
2. **Cifrado**: Cifrar metadata sensible antes de enviar
3. **Identidad**: Usar People Chain Identity para autenticación
4. **Rate limiting**: Implementar en pallet para prevenir spam

### **Recomendaciones:**
- Solo coordenadas y tipo de emergencia en-chain
- Información personal (teléfono, nombre completo) en backend
- Usar hash para referenciar datos off-chain si es necesario

---

## 📊 Comparación Final

| Característica | Backend Actual | Polkadot On-Chain |
|---------------|----------------|-------------------|
| **Resiliencia** | ❌ Depende del servidor | ✅ Descentralizado |
| **Costo** | Gratis (infraestructura) | ~$0.02 por reporte |
| **Velocidad** | Instantáneo | ~6-12 segundos |
| **Transparencia** | ❌ Privado | ✅ Público e inmutable |
| **Escalabilidad** | Limitada | ✅ Ilimitada |
| **Identidad** | Base de datos | ✅ People Chain |
| **Auditoría** | Difícil | ✅ Fácil (blockchain) |

---

## ✅ Conclusión

**Recomendación: Implementar arquitectura híbrida**

1. **Mejorar precisión GPS** (prioridad alta)
2. **Implementar Polkadot como primario** (prioridad alta)
3. **Backend como fallback y sincronización** (prioridad media)
4. **Crear pallet personalizada** (futuro)

Esta arquitectura ofrece:
- ✅ Resiliencia total
- ✅ Precisión mejorada
- ✅ Transparencia
- ✅ Escalabilidad
- ✅ Uso de identidad en cadena

¿Procedemos con la implementación?

