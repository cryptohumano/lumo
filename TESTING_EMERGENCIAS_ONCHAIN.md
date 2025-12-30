# Testing de Emergencias On-Chain

## 🎯 Pallets Disponibles

### **System::remarkWithEvent** (Estándar de Polkadot)
- ✅ **Disponible en todas las chains** (Polkadot, Kusama, Westend, Asset Hub, People Chain, etc.)
- ✅ **No requiere desarrollo de pallet personalizada**
- ✅ **Muy barato** (~0.002 DOT por transacción)
- ✅ **Emite evento `System::Remarked`**

### **Cómo Funciona:**

```typescript
// Enviar datos
const extrinsic = client.tx.system.remarkWithEvent(dataBytes)

// Escuchar eventos
// El evento System::Remarked se emite con: [AccountId, Vec<u8>]
```

## 🧪 Dónde Testear

### **1. PASET_HUB (Asset Hub de Paseo - Recomendado)**
- **Endpoint**: `wss://sys.ibp.network/asset-hub-paseo` (Oficial)
- **Endpoints alternativos**:
  - `wss://rpc.ibp.network/paseo-asset-hub`
  - `wss://paseo-asset-hub-rpc.dotters.network`
- **Tipo**: Testnet oficial de Asset Hub (Paseo)
- **Tokens**: PAS (gratis desde [Paseo Faucet](https://paseo.site/developers#rpc-endpoints))
- **Ventajas**:
  - ✅ Endpoint oficial de Paseo
  - ✅ Similar a Asset Hub mainnet
  - ✅ Tokens gratuitos desde faucet oficial
  - ✅ Activo y mantenido (Westend está deprecado)
  - ✅ Ideal para desarrollo
  - ✅ Misma tecnología que Polkadot mainnet

### **2. WESTEND (Deprecado - No usar)**
- ⚠️ **Westend está deprecado** - usar PASET_HUB en su lugar

### **2. PEOPLE_CHAIN (Solo Producción)**
- **Endpoint**: `wss://polkadot-people-rpc.polkadot.io`
- **Tipo**: Mainnet
- **Tokens**: DOT (reales)
- **⚠️ NO usar para testing** - usa tokens reales

## 📦 Datos que Podemos Enviar

### **Estructura de Datos:**

```typescript
interface EmergencyData {
  // Identificador único
  id: string  // Hash generado
  
  // Datos críticos (siempre presentes)
  type: number      // 1-8 (tipo de emergencia)
  severity: number  // 1-4 (severidad)
  lat: number       // Latitud * 1e6 (i32)
  lng: number       // Longitud * 1e6 (i32)
  ts: number        // Timestamp Unix (u64 segundos)
  
  // Metadata (opcional, comprimida)
  meta: {
    t?: string  // Título (truncado a 100 chars)
    d?: string  // Descripción (truncado a 500 chars)
    n?: number  // Número de personas
    a?: string  // Dirección (truncado a 200 chars)
    c?: string  // Ciudad
    co?: string // País (código ISO)
  }
}
```

### **Límites:**

- **Tamaño máximo**: ~32KB por transacción (límite de Polkadot)
- **Costo**: ~0.002 DOT por transacción
- **Precisión coordenadas**: 6 decimales (~0.1 metros)

## 🔧 Implementación Correcta

### **1. Enviar Emergencia:**

```typescript
import { reportEmergencyOnChain } from '@/services/emergencyOnChainService'
import { usePolkadotWallet } from '@/hooks/usePolkadotWallet'

const { selectedAccount } = usePolkadotWallet()

// Usar PASET_HUB (Asset Hub de Paseo) para testing
const chain = 'PASET_HUB'

const result = await reportEmergencyOnChain(
  selectedAccount,
  {
    emergencyType: 'ACCIDENT',
    severity: 'HIGH',
    latitude: -33.4489,
    longitude: -70.6693,
    timestamp: Date.now(),
    title: 'Accidente de tránsito',
    description: 'Choque frontal en intersección',
    numberOfPeople: 2,
    address: 'Av. Providencia 123',
    city: 'Santiago',
    country: 'CL',
  },
  chain
)
```

### **2. Escuchar Eventos:**

```typescript
import { subscribeToEmergencyEvents } from '@/services/emergencyOnChainService'

// Escuchar en PASET_HUB (Asset Hub de Paseo - testnet)
const unsubscribe = await subscribeToEmergencyEvents(
  'PASET_HUB',
  (emergency) => {
    console.log('🚨 Nueva emergencia detectada:', {
      tipo: emergency.emergencyType,
      severidad: emergency.severity,
      ubicación: `${emergency.latitude}, ${emergency.longitude}`,
      reporter: emergency.reporter,
      bloque: emergency.blockNumber,
    })
    
    // Filtrar por área geográfica
    if (isInServiceArea(emergency.latitude, emergency.longitude)) {
      notifyEmergencyService(emergency)
    }
  }
)

// Para detener la suscripción
// unsubscribe()
```

## 🧪 Script de Testing

### **Test Completo:**

```typescript
// 1. Conectar wallet
const { connect, selectedAccount } = usePolkadotWallet()
await connect()

// 2. Obtener tokens de testnet (si es necesario)
// PASET_HUB: Obtener tokens PAS desde el faucet oficial de Paseo
// Faucet oficial: https://paseo.site/developers (Polkadot Faucet con Matrix authentication)

// 3. Enviar emergencia de prueba
const result = await reportEmergencyOnChain(
  selectedAccount,
  {
    emergencyType: 'MEDICAL',
    severity: 'CRITICAL',
    latitude: -33.4489,
    longitude: -70.6693,
    timestamp: Date.now(),
    title: 'TEST: Emergencia médica',
    description: 'Esta es una prueba del sistema',
    numberOfPeople: 1,
  },
  'PASET_HUB' // Usar testnet - Asset Hub de Paseo
)

console.log('✅ Emergencia enviada:', result.txHash)

// 4. Escuchar eventos (en otra instancia o servicio)
const unsubscribe = await subscribeToEmergencyEvents(
  'PASET_HUB',
  (emergency) => {
    if (emergency.title?.includes('TEST')) {
      console.log('✅ Evento de prueba recibido:', emergency)
    }
  }
)
```

## 📊 Comparación de Chains para Testing

| Chain | Tipo | Tokens | Costo | Estabilidad | Recomendado |
|-------|------|--------|-------|-------------|-------------|
| **PASET_HUB** | Testnet | PAS (gratis) | $0 | ⭐⭐⭐⭐⭐ | ✅ **SÍ (Recomendado)** |
| **WESTEND** | Testnet | ⚠️ Deprecado | - | - | ❌ No usar |
| **PEOPLE_CHAIN** | Mainnet | DOT real | ~$0.02 | ⭐⭐⭐⭐⭐ | ❌ Solo prod |

## 🎯 Recomendación

**Para Testing:**
1. **Usar PASET_HUB** - Asset Hub de Paseo (testnet activo)
2. **Obtener tokens PAS** desde el faucet de Paseo
3. **Testear envío y recepción** de emergencias
4. **Validar estructura de datos**

**Para Producción:**
1. **Usar PEOPLE_CHAIN** - Para aprovechar identidad
2. **O ASSET_HUB** - Si prefieres más estabilidad
3. **Implementar sincronización** con backend

## ⚠️ Notas Importantes

1. **System::Remarked es genérico**: Cualquier aplicación puede usar `remarkWithEvent`
   - Necesitamos filtrar por estructura de datos
   - Usar prefijo o formato específico para emergencias

2. **No hay pallet personalizada**: Por ahora usamos System estándar
   - En el futuro se puede crear una pallet específica
   - Más estructura y validaciones

3. **Eventos en tiempo real**: Se escuchan desde el último bloque finalizado
   - Puede haber latencia de 6-12 segundos
   - Para tiempo real, usar suscripción a bloques finalizados

## 🔍 Verificar Eventos

### **Usando Polkadot.js Apps:**

1. Ir a: https://polkadot.js.org/apps
2. Conectar a Asset Hub de Paseo: `wss://sys.ibp.network/asset-hub-paseo`
3. Ir a: **Network > Explorer**
4. Buscar tu transacción por hash
5. Ver evento `system.Remarked` en los eventos del bloque

### **Usando Subscan (si está disponible):**

1. Buscar explorer de Paseo Asset Hub
2. Buscar tu transacción por hash
3. Ver eventos emitidos

