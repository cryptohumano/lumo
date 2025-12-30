# Cómo Iniciar el Listener de Emergencias Blockchain

## ✅ El Listener se Inicia Automáticamente

El listener de emergencias blockchain **ya está configurado para iniciarse automáticamente** cuando el backend arranca.

### Ubicación del Código:

En `backend/src/index.ts` (líneas 157-166):

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

## 🚀 Cómo Iniciar el Backend

### Opción 1: Modo Desarrollo (Recomendado)

```bash
cd /home/edgar/lumo/backend
yarn dev
```

O si usas npm:
```bash
npm run dev
```

Esto iniciará el servidor con `tsx watch`, que:
- ✅ Recarga automáticamente cuando cambias código
- ✅ Inicia el listener automáticamente
- ✅ Muestra logs en tiempo real

### Opción 2: Modo Producción

```bash
cd /home/edgar/lumo/backend
yarn build
yarn start
```

## 🔍 Verificar que el Listener Está Activo

Cuando el backend inicia, deberías ver estos mensajes en la consola:

```
🚀 Servidor corriendo en http://0.0.0.0:3000
🔊 Iniciando listener de emergencias en PASET_HUB...
✅ Conectado a PASET_HUB
✅ Escuchando eventos de emergencia en PASET_HUB
✅ Listener de emergencias blockchain iniciado en PASET_HUB
```

## 🔄 Reconexión Automática

El listener ahora tiene **reconexión automática**:

- ✅ Si se pierde la conexión, intenta reconectar automáticamente
- ✅ Usa backoff exponencial (5s, 10s, 15s, etc.)
- ✅ Máximo 10 intentos de reconexión
- ✅ Logs informativos de cada intento

### Logs de Reconexión:

```
⚠️ Error de conexión detectado, programando reconexión...
🔄 Programando reconexión en 5 segundos (intento 1/10)...
🔄 Intentando reconectar (intento 1)...
✅ Reconexión exitosa
```

## ⚙️ Configuración

### Variable de Entorno:

Puedes configurar la cadena usando la variable de entorno:

```bash
POLKADOT_CHAIN=PASET_HUB yarn dev
```

O en el archivo `.env`:

```
POLKADOT_CHAIN=PASET_HUB
```

### Cadenas Disponibles:

- `PASET_HUB` (default) - Testnet
- `PEOPLE_CHAIN` - Mainnet
- `POLKADOT` - Mainnet
- `KUSAMA` - Mainnet
- etc.

## 🐛 Solución de Problemas

### Error 404 en `/api/emergency-blockchain/*`

**Causa:** El backend no está corriendo o necesita reiniciarse.

**Solución:**
1. Verificar que el backend esté corriendo:
   ```bash
   lsof -i :3000
   ```

2. Si no está corriendo, iniciarlo:
   ```bash
   cd /home/edgar/lumo/backend
   yarn dev
   ```

3. Si está corriendo pero da 404, reiniciarlo para cargar las nuevas rutas

### El Listener No Inicia

**Verificar:**
1. Que la variable `POLKADOT_CHAIN` esté configurada correctamente
2. Que el endpoint de la blockchain sea accesible
3. Revisar los logs del backend para ver el error específico

### El Listener Se Desconecta

**Solución:** El listener ahora tiene reconexión automática. Si se desconecta:
- Espera unos segundos
- El listener intentará reconectar automáticamente
- Revisa los logs para ver el estado de la reconexión

## 📊 Monitoreo

### Verificar Estado del Listener:

El listener expone métodos para verificar su estado:

```typescript
const service = getEmergencyBlockchainService()
const isActive = service.isActive() // true si está escuchando
```

### Logs Importantes:

- `🔊 Iniciando listener...` - Iniciando
- `✅ Escuchando eventos...` - Activo y escuchando
- `🚨 Emergencia detectada...` - Emergencia encontrada
- `🔄 Programando reconexión...` - Intentando reconectar
- `❌ Error...` - Error (revisar logs)

## 🎯 Resumen

1. **✅ El listener se inicia automáticamente** cuando el backend arranca
2. **✅ Tiene reconexión automática** si se pierde la conexión
3. **✅ Escucha continuamente** todos los bloques finalizados
4. **✅ Detecta emergencias automáticamente** y las guarda en BD

**No necesitas hacer nada manual** - solo asegúrate de que el backend esté corriendo en modo desarrollo (`yarn dev`) o producción (`yarn start`).

