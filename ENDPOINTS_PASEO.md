# Endpoints RPC de Paseo

## 🌐 Endpoints Oficiales de Paseo

Según la [documentación oficial de Paseo](https://paseo.site/developers#rpc-endpoints):

### **Asset Hub de Paseo (PASET_HUB)**

**Endpoint Principal:**
- `wss://sys.ibp.network/asset-hub-paseo` ✅ **Oficial**

**Endpoints Alternativos:**
- `wss://rpc.ibp.network/paseo-asset-hub`
- `wss://paseo-asset-hub-rpc.dotters.network`

### **Otros Parachains de Paseo:**

**Paseo Relay Chain:**
- `wss://rpc.ibp.network/paseo`

**People Chain:**
- `wss://sys.ibp.network/people-paseo`

**Bridge Hub:**
- `wss://sys.ibp.network/bridgehub-paseo`

**Coretime:**
- `wss://sys.ibp.network/coretime-paseo`

## 🔄 Cambios Realizados

### **Actualizado en:**
1. ✅ `frontend/src/services/polkadotService.ts`
2. ✅ `backend/src/services/polkadotService.ts`
3. ✅ `backend/src/config/paymentPresets.ts`
4. ✅ `frontend/src/pages/admin/SystemConfig.tsx`
5. ✅ Documentación de testing

### **Endpoint Anterior:**
- ❌ `wss://pas-rpc.stakeworld.io/assethub` (no oficial)

### **Endpoint Nuevo:**
- ✅ `wss://sys.ibp.network/asset-hub-paseo` (oficial)

## 🎁 Obtener Tokens de Test

### **Faucet Oficial de Paseo:**
- **URL**: https://paseo.site/developers
- **Método**: Polkadot Faucet con Matrix authentication
- **Tokens**: PAS (gratis)
- **Disponible para**: 
  - Paseo Relay Chain
  - Asset Hub
  - Bridge Hub
  - Coretime
  - People
  - Collectives

## 📊 Características de Paseo

### **Ventajas:**
- ✅ Testnet oficial y estable
- ✅ Misma tecnología que Polkadot mainnet
- ✅ Tokens gratuitos
- ✅ Endpoints públicos y gratuitos
- ✅ Perfecto para desarrollo y testing

### **Costos (PAS tokens):**
- Asset Creation: ~0.0017 + 0.4 Deposit
- Identity Creation: ~0.002 + 0.2 Deposit
- **RemarkWithEvent**: ~0.001-0.002 (muy barato)

## 🔗 Referencias

- [Paseo Developer Portal](https://paseo.site/developers#rpc-endpoints)
- [Paseo Faucet](https://paseo.site/developers) - Obtener tokens PAS
- [Paseo Documentation](https://paseo.site/developers)

