# Cómo los Servicios de Emergencia Escuchan Eventos en la Blockchain

## 📡 Arquitectura

Cuando se reporta una emergencia usando `System::remarkWithEvent`, se emite un evento `System::Remarked` en la blockchain. Los servicios de emergencia pueden escuchar estos eventos en tiempo real.

## 🔄 Flujo Completo

```
1. Usuario reporta emergencia
   ↓
2. Frontend envía transacción a blockchain (System::remarkWithEvent)
   ↓
3. Blockchain emite evento System::Remarked
   ↓
4. Backend escucha eventos (subscribeFinalizedHeads)
   ↓
5. Backend filtra solo emergencias (valida estructura de datos)
   ↓
6. Backend decodifica datos JSON
   ↓
7. Backend guarda en base de datos
   ↓
8. Backend notifica a servicios de emergencia
```

## 🛠️ Implementación

### **1. Servicio Backend que Escucha Eventos**

Ya hemos creado dos servicios:

#### **`emergencyBlockchainListener.ts`**
- Se suscribe a bloques finalizados
- Filtra eventos `System::Remarked`
- Valida que sean emergencias (campo `v: 1`)
- Decodifica datos JSON
- Llama a callback cuando detecta emergencia

#### **`emergencyBlockchainService.ts`**
- Integra el listener con la base de datos
- Crea registros de emergencia automáticamente
- Procesa alertas a servicios
- Notifica a servicios externos

### **2. Cómo Iniciar el Listener**

En el backend (por ejemplo, en `src/index.ts`):

```typescript
import { getEmergencyBlockchainService } from './services/emergencyBlockchainService'

// Obtener chain de configuración
const chain = process.env.POLKADOT_CHAIN || 'PASET_HUB'

// Iniciar servicio
const emergencyBlockchainService = getEmergencyBlockchainService(chain as ChainName)

// Iniciar escucha
await emergencyBlockchainService.start()

console.log('✅ Escuchando emergencias en blockchain...')
```

### **3. Cómo Funciona el Filtrado**

El listener valida que los datos sean una emergencia verificando:

```typescript
// Estructura requerida para ser considerada emergencia:
{
  v: 1,              // Versión (debe ser 1)
  t: number,         // Tipo de emergencia (1-8)
  s: number,         // Severidad (1-4)
  lat: number,       // Latitud * 1e6
  lng: number,       // Longitud * 1e6
  ts: number,        // Timestamp en segundos
  id: string,        // ID único
  m?: {              // Metadata opcional
    t?: string,      // Título
    d?: string,      // Descripción
    n?: number,      // Número de personas
    a?: string,      // Dirección
    c?: string,      // Ciudad
    co?: string      // País
  }
}
```

Si los datos tienen esta estructura, se considera una emergencia válida.

## 📊 Datos que se Reciben

Cuando se detecta una emergencia, el callback recibe:

```typescript
{
  emergencyId: "NUc0RnJMVjV4N0FOeTlqbVpIRXg1aTNx",
  reporter: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // Address de wallet
  emergencyType: "MOUNTAIN_RESCUE",
  severity: "HIGH",
  latitude: 19.178339,
  longitude: -98.642728,
  timestamp: 1767082659000, // En milisegundos
  title: "perdido en la montaña",
  description: "perdido en la montaña",
  numberOfPeople: 1,
  address: "Iztaccíhuatl, 74139 Pue., México",
  city: "74139 Pue.",
  country: "MX",
  blockNumber: "123456",
  blockHash: "0x...",
  txHash: "0x..."
}
```

## 🔍 Cómo Filtrar por Área Geográfica

Los servicios pueden filtrar emergencias por su área de cobertura:

```typescript
function isInServiceArea(latitude: number, longitude: number): boolean {
  // Ejemplo: Área de cobertura de Santiago, Chile
  const serviceArea = {
    minLat: -33.6,
    maxLat: -33.3,
    minLng: -70.8,
    maxLng: -70.5,
  }
  
  return (
    latitude >= serviceArea.minLat &&
    latitude <= serviceArea.maxLat &&
    longitude >= serviceArea.minLng &&
    longitude <= serviceArea.maxLng
  )
}

// En el callback:
onEmergencyDetected: async (emergency) => {
  if (isInServiceArea(emergency.latitude, emergency.longitude)) {
    // Notificar al servicio
    await notifyService(emergency)
  }
}
```

## 🚨 Notificaciones a Servicios Externos

El servicio puede notificar a APIs externas:

```typescript
async function notifyEmergencyServices(emergency: EmergencyOnChainEvent) {
  // Notificar según tipo de emergencia
  switch (emergency.emergencyType) {
    case 'FIRE':
      await notifyFireDepartment(emergency)
      break
    case 'MEDICAL':
      await notifyAmbulance(emergency)
      break
    case 'CRIME':
      await notifyPolice(emergency)
      break
    case 'MOUNTAIN_RESCUE':
      await notifyMountainRescue(emergency)
      break
    // etc.
  }
}
```

## 🔐 Seguridad y Validación

### **Validaciones Implementadas:**

1. **Estructura de Datos**: Solo acepta datos con `v: 1` y campos requeridos
2. **Coordenadas**: Valida que lat/lng estén en rangos válidos
3. **Deduplicación**: Verifica que la emergencia no exista ya (por txHash)
4. **Usuario Vinculado**: Intenta vincular con usuario si tiene wallet address

### **Ventajas de Usar Blockchain:**

- ✅ **Resiliencia**: No depende de servidor central
- ✅ **Transparencia**: Cualquiera puede verificar emergencias
- ✅ **Inmutabilidad**: Los datos no pueden ser modificados
- ✅ **Descentralización**: Múltiples nodos pueden escuchar
- ✅ **Identidad**: Usa identidad de Polkadot (People Chain)

## 📈 Escalabilidad

### **Múltiples Listeners:**

Puedes tener múltiples servicios escuchando la misma cadena:

```typescript
// Servicio de Bomberos
const fireService = createEmergencyListener('PASET_HUB', {
  onEmergencyDetected: async (emergency) => {
    if (emergency.emergencyType === 'FIRE') {
      await notifyFireDepartment(emergency)
    }
  }
})

// Servicio de Ambulancias
const medicalService = createEmergencyListener('PASET_HUB', {
  onEmergencyDetected: async (emergency) => {
    if (emergency.emergencyType === 'MEDICAL') {
      await notifyAmbulance(emergency)
    }
  }
})

await Promise.all([
  fireService.start(),
  medicalService.start(),
])
```

## 🧪 Testing

Para probar el listener:

1. **Reportar emergencia desde frontend** (con wallet conectada)
2. **Verificar en logs del backend** que se detectó
3. **Verificar en base de datos** que se creó el registro
4. **Verificar notificaciones** a servicios externos

## 📝 Notas Importantes

1. **System::Remarked es genérico**: Puede contener cualquier tipo de dato, por eso filtramos por estructura
2. **Performance**: El listener procesa todos los bloques, pero solo decodifica los que tienen eventos Remarked
3. **Reconexión**: El listener se reconecta automáticamente si se pierde la conexión
4. **Bloques Finalizados**: Solo procesa bloques finalizados (no provisionales) para evitar reorganizaciones

## 🎯 Próximos Pasos

1. **Integrar con APIs reales** de servicios de emergencia
2. **Agregar filtros geográficos** más sofisticados
3. **Implementar priorización** por severidad
4. **Dashboard en tiempo real** para servicios de emergencia
5. **Notificaciones push** a aplicaciones móviles de servicios

