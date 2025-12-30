# Dónde Aparecen los Eventos Detectados en la Blockchain

## 📍 Ubicaciones donde se muestran los eventos

### 1. **Lista de Emergencias** (`/emergencies`)

Los eventos detectados desde blockchain aparecen en la lista normal de emergencias con un **badge "On-Chain"** que indica que fueron detectadas desde la blockchain.

**Características:**
- Badge azul con ícono de wallet
- Visible en la columna del número de emergencia
- Todas las emergencias (tanto reportadas manualmente como detectadas desde blockchain) aparecen juntas

### 2. **Detalles de Emergencia** (`/emergencies/:id`)

Cuando una emergencia fue detectada desde blockchain, en los detalles aparece una sección completa con:

- ✅ **Badge "Reportada en Blockchain"**
- 📝 **TX Hash** (con link al explorador)
- 🔢 **Número de Bloque**
- 🆔 **ID On-Chain**
- 🔗 **Link al explorador de blockchain** (Subscan)

**Ubicación:** Sección "Información de Blockchain" en la página de detalles

### 3. **Dashboard de Autoridad** (`/authority/dashboard`)

Las emergencias detectadas desde blockchain aparecen en:
- Mapa de emergencias (con marcadores)
- Lista de emergencias recientes
- Estadísticas (total, activas, resueltas, críticas)

### 4. **Base de Datos**

Todas las emergencias detectadas se guardan automáticamente en la BD con:
- Campo `metadata.onChainTxHash`: Hash de la transacción
- Campo `metadata.onChainBlockNumber`: Número de bloque
- Campo `metadata.onChainEmergencyId`: ID único de la emergencia
- Campo `metadata.reporterWallet`: Dirección de wallet del reporter

## 🔄 Flujo de Detección

```
1. Usuario reporta emergencia on-chain
   ↓
2. Blockchain emite evento System::Remarked
   ↓
3. Backend listener detecta el evento (emergencyBlockchainListener.ts)
   ↓
4. Backend valida que sea emergencia (campo v: 1)
   ↓
5. Backend guarda en BD (emergencyBlockchainService.ts)
   ↓
6. Emergencia aparece en:
   - Lista de emergencias (con badge "On-Chain")
   - Dashboard de autoridad
   - Detalles de emergencia (con info de blockchain)
```

## 🎯 Cómo Identificar Emergencias Detectadas desde Blockchain

### En la Lista:
- Busca el badge azul "On-Chain" con ícono de wallet
- Aparece junto al número de emergencia

### En los Detalles:
- Busca la sección "Información de Blockchain"
- Si tiene TX Hash, fue detectada desde blockchain
- Si no tiene esta sección, fue reportada manualmente

### En la Base de Datos:
```sql
-- Buscar emergencias detectadas desde blockchain
SELECT * FROM emergencies 
WHERE metadata->>'onChainTxHash' IS NOT NULL;

-- Contar emergencias on-chain
SELECT COUNT(*) FROM emergencies 
WHERE metadata->>'onChainTxHash' IS NOT NULL;
```

## 📊 Logs del Backend

Los eventos también aparecen en los logs del backend:

```
🚨 Emergencia detectada en bloque 123456: {
  id: "emergency-123456-...",
  type: "MOUNTAIN_RESCUE",
  severity: "HIGH",
  location: "19.178339, -98.642728"
}
✅ Emergencia creada en BD: abc-123-def-456
```

## 🔍 Verificación Manual

Para verificar que un evento fue detectado:

1. **En el Frontend:**
   - Ve a `/emergencies`
   - Busca el badge "On-Chain"
   - O filtra por emergencias que tengan `metadata.onChainTxHash`

2. **En el Backend:**
   - Revisa los logs de consola
   - Busca mensajes que empiecen con "🚨 Emergencia detectada"

3. **En la Blockchain:**
   - Usa el TX Hash para buscar en el explorador (Subscan)
   - Verifica que el evento `System::Remarked` esté presente

## 🚀 Próximas Mejoras

- [ ] Filtro específico para "Solo emergencias on-chain"
- [ ] Vista de eventos en tiempo real (WebSocket)
- [ ] Log de eventos detectados (página dedicada)
- [ ] Estadísticas de eventos on-chain vs manuales
- [ ] Notificaciones push cuando se detecta evento

