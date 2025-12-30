# Configuración de System::remarkWithEvent para Emergencias

## 📋 Análisis de System::remarkWithEvent

### **Según Documentación de Dedot:**

**Sintaxis:**
```typescript
client.tx.system.remarkWithEvent(remark: string | HexString | Uint8Array)
```

**Parámetros:**
- `remark`: Datos arbitrarios como:
  - `string`: Se convierte automáticamente a bytes (UTF-8)
  - `HexString`: Se interpreta como hexadecimal
  - `Uint8Array`: Se usa directamente como bytes

**Evento Emitido:**
- `System::Remarked([AccountId, Vec<u8>])`
  - `AccountId`: Dirección que envió el remark
  - `Vec<u8>`: Los datos enviados (bytes)

## 📦 Estructura de Datos para Emergencias

### **Formato JSON Optimizado:**

```typescript
{
  // Prefijo para identificar emergencias (opcional pero recomendado)
  "v": 1,  // Versión del formato
  
  // ID único (32 bytes como string base64)
  "id": "abc123...",
  
  // Datos críticos (siempre presentes)
  "t": 1,      // Tipo (u8): 1-8
  "s": 3,      // Severidad (u8): 1-4
  "lat": -33234567,  // Latitud * 1e6 (i32)
  "lng": -70345678,  // Longitud * 1e6 (i32)
  "ts": 1704067200,  // Timestamp Unix (u64 segundos)
  
  // Metadata (opcional, truncada)
  "m": {
    "t": "Título...",      // Título (max 100 chars)
    "d": "Descripción...", // Descripción (max 500 chars)
    "n": 2,                // Número de personas
    "a": "Dirección...",   // Dirección (max 200 chars)
    "c": "Santiago",       // Ciudad
    "co": "CL"             // País (código ISO 2 letras)
  }
}
```

### **Optimizaciones:**

1. **Nombres de campos cortos:**
   - `v` en lugar de `version`
   - `t` en lugar de `type`
   - `s` en lugar de `severity`
   - `m` en lugar de `meta`

2. **Truncamiento:**
   - Título: 100 caracteres
   - Descripción: 500 caracteres
   - Dirección: 200 caracteres

3. **Eliminar espacios:**
   - JSON compacto (sin espacios ni saltos de línea)

### **Tamaño Estimado:**

- **Mínimo** (solo datos críticos): ~150 bytes
- **Promedio** (con metadata básica): ~400-600 bytes
- **Máximo** (con toda la metadata): ~1500-2000 bytes
- **Límite práctico**: ~32KB (pero no recomendado)

## 💰 Costos

### **Cálculo de Fees:**

```
Fee base: ~0.001 DOT
Por byte: ~0.000001 DOT
Total estimado: 0.001 + (tamaño_bytes * 0.000001) DOT
```

**Ejemplos:**
- 500 bytes: ~0.0015 DOT (~$0.015)
- 1000 bytes: ~0.002 DOT (~$0.02)
- 2000 bytes: ~0.003 DOT (~$0.03)

## 🔧 Implementación Correcta

### **1. Preparar Datos:**

```typescript
const criticalData = {
  v: 1,  // Versión del formato
  id: generateEmergencyId(...),
  t: getEmergencyTypeCode(emergencyType),  // 1-8
  s: getSeverityCode(severity),            // 1-4
  lat: Math.round(latitude * 1e6),         // i32
  lng: Math.round(longitude * 1e6),        // i32
  ts: Math.floor(timestamp / 1000),        // u64 (segundos)
  m: {
    t: title?.slice(0, 100),
    d: description?.slice(0, 500),
    n: numberOfPeople || 1,
    a: address?.slice(0, 200),
    c: city,
    co: country,
  }
}

// Convertir a JSON compacto y luego a bytes
const jsonString = JSON.stringify(criticalData)
const dataBytes = new TextEncoder().encode(jsonString)
```

### **2. Crear Extrinsic:**

```typescript
// remarkWithEvent acepta string, HexString o Uint8Array
const extrinsic = client.tx.system.remarkWithEvent(dataBytes)
```

### **3. Obtener Payment Info (Opcional):**

```typescript
// Estimar el fee antes de enviar
const paymentInfo = await extrinsic.paymentInfo(account.address)
const estimatedFee = paymentInfo.partialFee
console.log('Fee estimado:', estimatedFee.toString())
```

### **4. Firmar y Enviar:**

```typescript
const result = await extrinsic
  .signAndSend(account.address, {
    signer: injector.signer,
  }, ({ status, events }) => {
    // Monitorear estado
    if (status.type === 'BestChainBlockIncluded') {
      console.log('Transacción incluida en bloque')
    }
    
    // Buscar evento System::Remarked
    if (events) {
      events.forEach(({ event }) => {
        if (client.events.system.Remarked.is(event)) {
          const [accountId, remarkData] = event.data
          console.log('Remarked por:', accountId.toString())
        }
      })
    }
  })
  .untilFinalized()

// Obtener blockHash y blockNumber
const blockHash = result.status.value.blockHash
const blockNumber = result.status.value.blockNumber
```

## 📡 Escuchar Eventos

### **Suscribirse a Bloques Finalizados:**

```typescript
// Suscribirse a bloques finalizados
const unsubscribe = await client.rpc.chain.subscribeFinalizedHeads(async (header) => {
  const blockHash = header.hash
  const blockNumber = parseInt(header.number.toString())
  
  // Obtener eventos del bloque
  const events = await client.query.system.events.at(blockHash)
  
  events.forEach((record) => {
    const { event } = record
    
    if (client.events.system.Remarked.is(event)) {
      const [accountId, remarkData] = event.data
      
      // Decodificar datos
      try {
        const decoded = new TextDecoder().decode(remarkData as Uint8Array)
        const data = JSON.parse(decoded)
        
        // Validar que sea una emergencia (tiene campo 'v' y 't')
        if (data.v === 1 && data.t && data.lat && data.lng) {
          // Es una emergencia
          processEmergency({
            reporter: accountId.toString(),
            blockNumber,
            blockHash: blockHash.toString(),
            data,
          })
        }
      } catch (error) {
        // No es JSON válido o no es una emergencia
      }
    }
  })
})
```

## ✅ Mejoras Implementadas

1. **✅ Uso correcto de `remarkWithEvent`** con `Uint8Array`
2. **✅ Payment Info** para estimar fees antes de enviar
3. **✅ `untilFinalized()`** para obtener blockHash y blockNumber
4. **✅ Manejo correcto de eventos** System::Remarked
5. **✅ JSON optimizado** con nombres de campos cortos
6. **✅ Validación de tamaño** antes de enviar

## 🔍 Verificación

### **En Polkadot.js Apps:**

1. Conectar a Asset Hub de Paseo: `wss://sys.ibp.network/asset-hub-paseo`
2. Ir a **Network > Explorer**
3. Buscar tu transacción por hash
4. Ver evento `system.Remarked` en los eventos del bloque
5. Los datos están en el segundo parámetro del evento (Vec<u8>)

### **Decodificar Datos:**

```typescript
// Desde el evento System::Remarked
const [accountId, remarkData] = event.data

// Decodificar bytes a string
const decoded = new TextDecoder().decode(remarkData as Uint8Array)

// Parsear JSON
const emergencyData = JSON.parse(decoded)

// Convertir coordenadas de vuelta
const latitude = emergencyData.lat / 1e6
const longitude = emergencyData.lng / 1e6
const timestamp = emergencyData.ts * 1000  // Convertir a ms
```

## 📊 Comparación: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Formato datos** | JSON con nombres largos | JSON optimizado |
| **Tamaño promedio** | ~800 bytes | ~400-600 bytes |
| **Fee estimado** | ~0.002 DOT | ~0.0015 DOT |
| **BlockHash** | ❌ No capturado | ✅ Capturado |
| **BlockNumber** | ❌ No capturado | ✅ Capturado |
| **Payment Info** | ❌ No estimado | ✅ Estimado antes |
| **Eventos** | ⚠️ Básico | ✅ Completo |

## 🎯 Próximos Pasos

1. **Testing en PASET_HUB**
2. **Validar decodificación** de eventos
3. **Optimizar más** si es necesario (compresión)
4. **Documentar** para servicios de emergencia

