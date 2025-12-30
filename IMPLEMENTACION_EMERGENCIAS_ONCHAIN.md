# Implementación de Emergencias On-Chain

## ✅ Servicios Creados

### 1. `emergencyOnChainService.ts`
Servicio para reportar emergencias directamente a la blockchain de Polkadot usando `System::remarkWithEvent`.

**Características:**
- ✅ Envía datos críticos a la blockchain
- ✅ Usa coordenadas con precisión de 6 decimales (i32 * 1e6)
- ✅ Comprime datos para reducir costos
- ✅ Genera ID único para cada emergencia
- ✅ Función para escuchar eventos (para servicios de emergencia)

**Datos que se envían:**
- Tipo de emergencia (código numérico)
- Severidad (código numérico)
- Coordenadas (lat/lng * 1e6 para precisión)
- Timestamp
- Metadata (título, descripción, número de personas, dirección, etc.)

### 2. `improvedLocationService.ts`
Servicio mejorado para obtener ubicación con mayor precisión.

**Características:**
- ✅ Combina múltiples fuentes: GPS + Network + WiFi
- ✅ Weighted average basado en precisión
- ✅ Validación de precisión (< 100m para emergencias)
- ✅ Muestra precisión al usuario

## 🔧 Integración en ReportEmergency

### Cambios Implementados:

1. **Mejora de Precisión GPS**
   - Usa `getImprovedLocation()` en lugar de geolocalización básica
   - Muestra precisión al usuario
   - Valida que la precisión sea aceptable

2. **Envío a Blockchain (Primario)**
   - Intenta enviar a Polkadot primero si:
     - Wallet está conectada
     - Opción "usar blockchain" está habilitada
   - Usa People Chain (para aprovechar identidad)
   - Sincroniza con backend después (opcional)

3. **Fallback a Backend**
   - Si falla blockchain o no hay wallet, usa backend
   - Transparente para el usuario

## 📡 Cómo Funciona

### Flujo de Reporte:

```
1. Usuario completa formulario
   ↓
2. Obtiene ubicación mejorada (GPS + Network)
   ↓
3. ¿Wallet conectada y on-chain habilitado?
   ├─ SÍ → Enviar a Polkadot (System::remarkWithEvent)
   │        ↓
   │        ¿Éxito?
   │        ├─ SÍ → Sincronizar con backend (opcional)
   │        └─ NO → Fallback a backend
   │
   └─ NO → Enviar directamente a backend
```

### Datos en la Blockchain:

```typescript
{
  id: "hash-único",
  type: 1-8,           // Tipo de emergencia
  severity: 1-4,       // Severidad
  lat: -33234567,      // Latitud * 1e6 (i32)
  lng: -70345678,      // Longitud * 1e6 (i32)
  ts: 1704067200,      // Timestamp Unix (u64)
  meta: {
    t: "Título...",    // Título truncado
    d: "Descripción...", // Descripción truncada
    n: 2,              // Número de personas
    a: "Dirección...", // Dirección
    c: "Santiago",     // Ciudad
    co: "CL"           // País
  }
}
```

## 💰 Costos

- **Fee base**: ~0.001 DOT
- **Por byte**: ~0.000001 DOT
- **Total estimado**: ~0.002 DOT (~$0.02) por emergencia

## 🎯 Próximos Pasos

### Para Servicios de Emergencia:

Los servicios pueden escuchar eventos directamente:

```typescript
import { subscribeToEmergencyEvents } from '@/services/emergencyOnChainService'

// Escuchar emergencias en tiempo real
const unsubscribe = await subscribeToEmergencyEvents('PEOPLE_CHAIN', (emergency) => {
  // Filtrar por área geográfica
  if (isInServiceArea(emergency.latitude, emergency.longitude)) {
    // Notificar al servicio
    notifyEmergencyService(emergency)
  }
})
```

### Mejoras Futuras:

1. **Crear Pallet Personalizada**
   - Más estructura
   - Validaciones en-chain
   - Mejor para escalar

2. **Backend Sincronización**
   - Escuchar eventos de Polkadot
   - Sincronizar automáticamente con base de datos
   - Procesar alertas adicionales

3. **Dashboard para Servicios**
   - Visualizar emergencias en tiempo real
   - Filtrar por área
   - Historial de emergencias

## 🔐 Seguridad

- ✅ Solo datos críticos en-chain (coordenadas, tipo, severidad)
- ✅ Información personal (teléfono, nombre completo) en backend
- ✅ Usa identidad de People Chain para autenticación
- ✅ Validación de precisión GPS antes de enviar

## 📝 Notas

- La wallet debe estar conectada para usar blockchain
- Si no hay wallet, funciona normalmente con backend
- El usuario puede elegir usar blockchain o no
- La sincronización con backend es opcional (no crítica)

