# Solución: Error 404 y Listener Siempre Activo

## 🔴 Problema: Error 404 en `/api/emergency-blockchain/*`

### Causa:
El backend necesita **reiniciarse** para cargar las nuevas rutas que acabamos de crear.

### Solución:

1. **Detener el backend actual** (si está corriendo):
   ```bash
   # Buscar el proceso
   lsof -i :3000
   # O usar Ctrl+C en la terminal donde está corriendo
   ```

2. **Reiniciar el backend en modo desarrollo**:
   ```bash
   cd /home/edgar/lumo/backend
   yarn dev
   ```

3. **Verificar que las rutas estén cargadas**:
   Deberías ver en los logs:
   ```
   🚀 Servidor corriendo en http://0.0.0.0:3000
   ✅ Listener de emergencias blockchain iniciado en PASET_HUB
   ```

---

## ✅ El Listener SIEMPRE Está Escuchando

### Configuración Automática:

El listener **ya está configurado para iniciarse automáticamente** cuando el backend arranca:

**Ubicación:** `backend/src/index.ts` (líneas 157-166)

```typescript
// Iniciar listener de emergencias desde blockchain
try {
  const chain = (process.env.POLKADOT_CHAIN || 'PASET_HUB') as ChainName
  const emergencyBlockchainService = getEmergencyBlockchainService(chain)
  await emergencyBlockchainService.start()
  console.log(`✅ Listener de emergencias blockchain iniciado en ${chain}`)
} catch (error: any) {
  console.error('❌ Error iniciando listener de emergencias blockchain:', error)
  // No detener el servidor si falla el listener
}
```

### Características:

1. **✅ Inicio Automático**: Se inicia cuando el backend arranca
2. **✅ Reconexión Automática**: Si se pierde la conexión, intenta reconectar
3. **✅ Escucha Continua**: Escucha todos los bloques finalizados
4. **✅ Resiliente**: No detiene el servidor si falla

---

## 🔄 Reconexión Automática

### Implementado:

- ✅ **Detección de errores de conexión**
- ✅ **Reconexión automática con backoff exponencial**
- ✅ **Máximo 10 intentos** (configurable)
- ✅ **Logs informativos** de cada intento

### Cómo Funciona:

1. Si se pierde la conexión, detecta el error
2. Programa una reconexión automática
3. Espera 5s, 10s, 15s... (backoff exponencial)
4. Intenta reconectar hasta 10 veces
5. Si tiene éxito, continúa escuchando normalmente

### Logs de Reconexión:

```
⚠️ Error de conexión detectado, programando reconexión...
🔄 Programando reconexión en 5 segundos (intento 1/10)...
🔄 Intentando reconectar (intento 1)...
✅ Reconexión exitosa
```

---

## 🚀 Cómo Asegurar que Siempre Esté Activo

### 1. Modo Desarrollo (Recomendado para desarrollo):

```bash
cd /home/edgar/lumo/backend
yarn dev
```

**Ventajas:**
- ✅ Recarga automática cuando cambias código
- ✅ Logs en tiempo real
- ✅ Inicia el listener automáticamente

### 2. Modo Producción (Para producción):

```bash
cd /home/edgar/lumo/backend
yarn build
yarn start
```

**Ventajas:**
- ✅ Optimizado para producción
- ✅ Inicia el listener automáticamente
- ✅ Más eficiente

### 3. Usando PM2 (Para producción con auto-restart):

```bash
npm install -g pm2
cd /home/edgar/lumo/backend
yarn build
pm2 start dist/index.js --name "lumo-backend"
pm2 save
pm2 startup
```

**Ventajas:**
- ✅ Auto-restart si el proceso se cae
- ✅ Logs persistentes
- ✅ Monitoreo de recursos
- ✅ Inicia automáticamente al reiniciar el servidor

---

## 🔍 Verificar que el Listener Está Activo

### En los Logs del Backend:

Busca estos mensajes:

```
🔊 Iniciando listener de emergencias en PASET_HUB...
✅ Conectado a PASET_HUB
✅ Escuchando eventos de emergencia en PASET_HUB
✅ Listener de emergencias blockchain iniciado en PASET_HUB
```

### Si Detecta una Emergencia:

```
🚨 Emergencia detectada en bloque 123456: {
  id: "emergency-...",
  type: "MOUNTAIN_RESCUE",
  severity: "HIGH",
  location: "19.178339, -98.642728"
}
✅ Emergencia creada en BD: abc-123-def-456
```

---

## 📊 Estado del Listener

### Verificar Estado (desde código):

```typescript
import { getEmergencyBlockchainService } from './services/emergencyBlockchainService'

const service = getEmergencyBlockchainService()
const isActive = service.isActive() // true si está escuchando
```

### Verificar Último Bloque Procesado:

El listener mantiene un registro del último bloque procesado para evitar procesar bloques duplicados.

---

## 🎯 Resumen

1. **✅ El listener se inicia automáticamente** cuando el backend arranca
2. **✅ Tiene reconexión automática** si se pierde la conexión
3. **✅ Escucha continuamente** todos los bloques finalizados
4. **✅ No necesitas hacer nada manual** - solo asegúrate de que el backend esté corriendo

**Para solucionar el 404:**
- Reinicia el backend: `cd backend && yarn dev`
- Verifica que veas los logs de inicio del listener
- Las rutas `/api/emergency-blockchain/*` estarán disponibles

