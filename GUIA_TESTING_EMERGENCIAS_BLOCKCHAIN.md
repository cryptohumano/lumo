# Guía de Testing: Emergencias en Blockchain (Paseo)

## 🎯 Objetivo

Probar el sistema de reporte de emergencias directamente en la blockchain de Polkadot usando **Asset Hub de Paseo** (testnet).

---

## 📋 Prerrequisitos

### 1. **Wallet de Polkadot**
Instala una de estas extensiones:
- [Polkadot.js Extension](https://polkadot.js.org/extension/)
- [Talisman Wallet](https://www.talisman.one/)

### 2. **Tokens PAS (Paseo)**
Necesitas tokens PAS para pagar las transacciones (~0.001-0.002 PAS por emergencia).

---

## 🚀 Paso 1: Obtener Tokens PAS

### **Opción A: Faucet Oficial de Paseo**

1. Ve a: https://paseo.site/developers
2. Haz clic en **"Get Test Tokens"**
3. Usa **Polkadot Faucet** con autenticación Matrix
4. Selecciona **Asset Hub de Paseo**
5. Ingresa tu dirección de wallet
6. Recibirás tokens PAS gratuitos

### **Opción B: Desde Polkadot.js Apps**

1. Ve a: https://polkadot.js.org/apps
2. Conecta a **Asset Hub de Paseo**: `wss://sys.ibp.network/asset-hub-paseo`
3. Ve a **Accounts** → **Faucet**
4. Solicita tokens PAS

---

## 🔧 Paso 2: Configurar la Aplicación

### **1. Verificar Configuración de Chain**

Asegúrate de que la aplicación esté configurada para usar **PASET_HUB**:

```typescript
// frontend/src/services/polkadotService.ts
PASET_HUB: 'wss://sys.ibp.network/asset-hub-paseo'
```

### **2. Verificar Endpoint en ReportEmergency**

```typescript
// frontend/src/pages/ReportEmergency.tsx
const chain: ChainName = 'PASET_HUB' // Debe ser PASET_HUB
```

---

## 🧪 Paso 3: Probar Reporte de Emergencia

### **1. Conectar Wallet**

1. Inicia sesión en la aplicación
2. Ve a **Reportar Emergencia** (`/report-emergency`)
3. Haz clic en **"Conectar Wallet Polkadot"**
4. Selecciona tu cuenta con tokens PAS
5. Acepta la conexión

### **2. Reportar Emergencia**

1. **Completa el formulario:**
   - Tipo de emergencia: Ej. "Accidente"
   - Severidad: Ej. "Alta"
   - Título: Ej. "Accidente de tránsito"
   - Descripción: Detalles de la emergencia
   - Ubicación: Usa "Usar mi ubicación actual" o busca manualmente

2. **Activa "Enviar a la Blockchain":**
   - Toggle **"Enviar a la Blockchain (Polkadot)"** debe estar activado
   - Verás información sobre el envío a la blockchain

3. **Haz clic en "Reportar Emergencia"**

4. **Firma la transacción:**
   - Se abrirá tu wallet
   - Revisa los detalles de la transacción
   - **Firma** la transacción
   - Espera la confirmación (~10-30 segundos)

### **3. Verificar Transacción**

#### **En la Aplicación:**
- Verás un toast de éxito con el hash de la transacción
- Ejemplo: `TX: 0x1234...5678`

#### **En Polkadot.js Apps:**
1. Ve a: https://polkadot.js.org/apps
2. Conecta a **Asset Hub de Paseo**
3. Ve a **Network** → **Explorer**
4. Pega el hash de la transacción
5. Verás:
   - Estado: ✅ Finalized
   - Evento: `system.Remarked`
   - Datos: Los datos comprimidos de la emergencia

#### **En Subscan (si está disponible):**
1. Ve a: https://paseo.subscan.io/ (si existe)
2. Busca el hash de la transacción
3. Verás los detalles completos

---

## 🔍 Paso 4: Verificar Datos en la Blockchain

### **1. Decodificar el Evento System::Remarked**

El evento `System::Remarked` contiene los datos de la emergencia en formato comprimido.

**Estructura de datos:**
```json
{
  "v": 1,                    // Versión
  "id": "abc123...",         // ID único
  "t": 1,                    // Tipo (1=ACCIDENT, 2=MEDICAL, etc.)
  "s": 3,                    // Severidad (1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL)
  "lat": -33500000,          // Latitud * 1e6
  "lng": -70600000,          // Longitud * 1e6
  "ts": 1704067200,          // Timestamp (Unix, segundos)
  "m": {                     // Metadata (opcional)
    "t": "Título",           // Title
    "d": "Descripción",      // Description
    "n": 2,                  // Number of people
    "a": "Dirección",        // Address
    "c": "Ciudad",           // City
    "co": "CL"               // Country
  }
}
```

### **2. Usar el Servicio de Suscripción**

La aplicación incluye `subscribeToEmergencyEvents` para escuchar emergencias en tiempo real:

```typescript
import { subscribeToEmergencyEvents } from '@/services/emergencyOnChainService'

// Escuchar emergencias en PASET_HUB
const unsubscribe = await subscribeToEmergencyEvents('PASET_HUB', (emergency) => {
  console.log('🚨 Nueva emergencia detectada:', emergency)
  // emergency contiene:
  // - emergencyType, severity, latitude, longitude
  // - timestamp, title, description, etc.
  // - reporter (dirección de wallet)
  // - blockNumber
})

// Para dejar de escuchar:
unsubscribe()
```

---

## 🐛 Troubleshooting

### **Error: "No se pudo obtener el signer de la wallet"**
- **Solución**: Asegúrate de que la wallet esté desbloqueada
- Verifica que la extensión esté activa

### **Error: "Insufficient balance"**
- **Solución**: Obtén más tokens PAS del faucet
- Verifica que tengas al menos 0.01 PAS para cubrir fees

### **Error: "Timeout obteniendo ubicación"**
- **Solución**: 
  - Permite acceso a ubicación en el navegador
  - Intenta en un lugar abierto (mejor señal GPS)
  - Usa búsqueda manual de ubicación como alternativa

### **Error: "Precisión muy baja"**
- **Solución**:
  - Espera unos segundos más para que el GPS se estabilice
  - Muévete a un lugar abierto
  - Usa búsqueda manual de ubicación

### **Transacción no aparece en el explorer**
- **Solución**:
  - Espera unos segundos (puede tardar en propagarse)
  - Verifica que estés conectado a la cadena correcta (PASET_HUB)
  - Revisa la consola del navegador para errores

---

## 📊 Monitoreo en Tiempo Real

### **Usar Polkadot.js Apps para Monitorear**

1. Conecta a **Asset Hub de Paseo**
2. Ve a **Network** → **Explorer**
3. Filtra por eventos `system.Remarked`
4. Verás todas las emergencias reportadas en tiempo real

### **Usar el Dashboard de Autoridades**

1. Inicia sesión como usuario **AUTHORITY**
2. Ve a `/authority/dashboard`
3. El dashboard muestra emergencias del backend
4. Las emergencias reportadas en blockchain también se sincronizan al backend

---

## ✅ Checklist de Testing

- [ ] Wallet conectada con tokens PAS
- [ ] Ubicación GPS precisa (< 100m de error)
- [ ] Formulario de emergencia completado
- [ ] Toggle "Enviar a Blockchain" activado
- [ ] Transacción firmada y enviada
- [ ] Hash de transacción recibido
- [ ] Transacción visible en Polkadot.js Apps
- [ ] Evento `System::Remarked` visible
- [ ] Datos decodificados correctamente
- [ ] Emergencia sincronizada en backend (opcional)

---

## 🔗 Enlaces Útiles

- **Paseo Developer Portal**: https://paseo.site/developers
- **Polkadot.js Apps**: https://polkadot.js.org/apps
- **Paseo Faucet**: https://paseo.site/developers (Get Test Tokens)
- **Documentación de RemarkWithEvent**: Ver `CONFIGURACION_REMARK_EMERGENCIAS.md`

---

## 📝 Notas Importantes

1. **Costo de Transacción**: ~0.001-0.002 PAS por emergencia (muy barato)
2. **Tiempo de Confirmación**: ~10-30 segundos en Paseo
3. **Precisión GPS**: El sistema intenta obtener precisión < 100m, pero puede variar según el dispositivo y ubicación
4. **Fallback**: Si falla el envío a blockchain, automáticamente se usa el backend
5. **Sincronización**: Las emergencias en blockchain se sincronizan al backend para compatibilidad

---

## 🎉 ¡Listo!

Con esta guía deberías poder probar completamente el sistema de emergencias en blockchain. Si encuentras algún problema, revisa la sección de Troubleshooting o consulta los logs de la consola del navegador.

