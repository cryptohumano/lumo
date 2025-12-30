# Respuesta: Detección y Lectura de Eventos desde Blockchain

## ✅ Respuesta 1: ¿Cualquier wallet detectaría la emergencia?

**SÍ**, cualquier transacción construida con la misma estructura será detectada automáticamente por nuestro backend, **sin importar desde dónde se envíe**.

### ¿Por qué?

1. **El listener escucha TODOS los eventos `System::Remarked`** en la blockchain
2. **No importa el origen**: Puede ser desde nuestra app, otra wallet, otro servicio, etc.
3. **Solo valida la estructura**: Si los datos tienen `v: 1` y los campos requeridos, se detecta como emergencia

### Ejemplo:

```typescript
// Desde cualquier wallet o servicio
const emergencyData = {
  v: 1,
  id: "unique-id",
  t: 6,  // MOUNTAIN_RESCUE
  s: 4,  // CRITICAL
  lat: 19178339,
  lng: -98642728,
  ts: Math.floor(Date.now() / 1000),
  m: {
    t: "Perdido en la montaña",
    d: "Necesito ayuda urgente",
    a: "Iztaccíhuatl, México"
  }
}

// Enviar con System::remarkWithEvent
const extrinsic = client.tx.system.remarkWithEvent(
  new TextEncoder().encode(JSON.stringify(emergencyData))
)

await extrinsic.signAndSend(account, { signer })
```

**Resultado:** Nuestro backend lo detectará automáticamente y creará la emergencia en la BD.

---

## ✅ Respuesta 2: ¿Cómo leer los datos desde la cadena siendo autoridad?

He creado un **sistema completo** para que las autoridades puedan leer y decodificar eventos directamente desde la blockchain.

### 🛠️ Herramientas Creadas:

#### **1. Servicio de Decodificación** (`emergencyBlockchainDecoder.ts`)

Funciones para decodificar eventos:
- `decodeEmergencyFromTxHash()` - Por TX Hash
- `decodeEmergenciesFromBlock()` - Por número de bloque
- `searchEmergenciesInRange()` - En un rango de bloques
- `getRecentEmergencies()` - Últimos N bloques

#### **2. API Endpoints** (`/api/emergency-blockchain/*`)

Endpoints REST para autoridades:
- `GET /api/emergency-blockchain/decode/:txHash` - Decodificar por TX Hash
- `GET /api/emergency-blockchain/block/:blockNumber` - Emergencias en un bloque
- `GET /api/emergency-blockchain/range?fromBlock=X&toBlock=Y` - Buscar en rango
- `GET /api/emergency-blockchain/recent?lastNBlocks=100` - Emergencias recientes

#### **3. Interfaz Web** (`/authority/blockchain-events`)

Página completa para autoridades con:
- ✅ Búsqueda por TX Hash
- ✅ Búsqueda por bloque
- ✅ Búsqueda por rango de bloques
- ✅ Búsqueda de emergencias recientes
- ✅ Visualización completa de datos decodificados
- ✅ Links a exploradores de blockchain
- ✅ Datos raw (JSON) expandible

### 📖 Cómo Usar:

#### **Desde la Interfaz Web:**

1. Ir a `/authority/blockchain-events` (solo autoridades)
2. Seleccionar tipo de búsqueda:
   - **Por TX Hash**: Pegar el hash de la transacción
   - **Por Bloque**: Ingresar número de bloque
   - **Por Rango**: Desde-hasta bloques
   - **Recientes**: Últimos N bloques
3. Seleccionar cadena (PASET_HUB, PEOPLE_CHAIN, etc.)
4. Click en "Buscar"
5. Ver resultados con todos los datos decodificados

#### **Desde la API:**

```bash
# Decodificar por TX Hash
GET /api/emergency-blockchain/decode/0x1234...?chain=PASET_HUB

# Emergencias en un bloque
GET /api/emergency-blockchain/block/123456?chain=PASET_HUB

# Buscar en rango
GET /api/emergency-blockchain/range?fromBlock=123000&toBlock=123500&chain=PASET_HUB

# Emergencias recientes
GET /api/emergency-blockchain/recent?lastNBlocks=100&chain=PASET_HUB
```

### 🔍 Proceso de Decodificación:

```
1. Conectar a la blockchain (DedotClient)
   ↓
2. Obtener bloque/transacción
   ↓
3. Extraer eventos System::Remarked
   ↓
4. Decodificar datos (TextDecoder + JSON.parse)
   ↓
5. Validar estructura (v: 1, t, s, lat, lng, ts)
   ↓
6. Convertir códigos numéricos a strings:
   - t (tipo) → "MOUNTAIN_RESCUE", "MEDICAL", etc.
   - s (severidad) → "LOW", "MEDIUM", "HIGH", "CRITICAL"
   ↓
7. Convertir coordenadas (lat/lng / 1e6)
   ↓
8. Retornar datos decodificados
```

### 📊 Datos que se Obtienen:

```typescript
{
  emergencyId: "unique-id",
  reporter: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  emergencyType: "MOUNTAIN_RESCUE",
  severity: "CRITICAL",
  latitude: 19.178339,
  longitude: -98.642728,
  timestamp: 1767082659000,
  title: "Perdido en la montaña",
  description: "Necesito ayuda urgente",
  numberOfPeople: 1,
  address: "Iztaccíhuatl, México",
  city: "74139 Pue.",
  country: "MX",
  blockNumber: "123456",
  blockHash: "0x...",
  txHash: "0x...",
  rawData: { /* datos originales JSON */ }
}
```

### 🔐 Seguridad:

- ✅ Solo autoridades y admins pueden acceder
- ✅ Requiere autenticación
- ✅ Validación de estructura de datos
- ✅ Manejo de errores robusto

### 🎯 Casos de Uso:

1. **Verificar emergencia reportada externamente**
   - Autoridad recibe TX Hash
   - Busca en la blockchain
   - Verifica datos y ubicación

2. **Auditoría de emergencias**
   - Buscar en rango de bloques
   - Verificar todas las emergencias reportadas

3. **Monitoreo en tiempo real**
   - Buscar emergencias recientes
   - Detectar nuevas emergencias no procesadas

4. **Recuperación de datos**
   - Si el backend falla, leer directamente desde blockchain
   - Recuperar emergencias no sincronizadas

---

## 🚀 Resumen

1. **✅ Cualquier wallet con la misma estructura será detectada** - El listener es universal
2. **✅ Las autoridades pueden leer eventos directamente** - Herramientas completas creadas
3. **✅ Interfaz web disponible** - `/authority/blockchain-events`
4. **✅ API REST disponible** - Para integraciones externas
5. **✅ Decodificación automática** - Convierte códigos numéricos a datos legibles

¡Todo listo para que las autoridades puedan leer y verificar emergencias directamente desde la blockchain! 🎉

