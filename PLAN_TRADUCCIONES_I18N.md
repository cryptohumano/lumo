# Plan Completo de Traducciones i18n para Lumo

## 📋 Estado Actual

### Idiomas Soportados
- **Español (es)** - Idioma principal/fallback
- **Inglés (en)** - Parcialmente traducido
- **Portugués (pt)** - Parcialmente traducido

### Estructura Actual
```
frontend/src/i18n/
├── config.ts          # Configuración de i18next
└── locales/
    ├── es.json        # Español (más completo)
    ├── en.json        # Inglés (parcial)
    └── pt.json        # Portugués (parcial)
```

---

## 🎯 Objetivos del Plan

1. **Completar todas las traducciones faltantes**
2. **Organizar las claves por módulos funcionales**
3. **Asegurar consistencia entre idiomas**
4. **Identificar y traducir textos hardcodeados**
5. **Crear estructura escalable para futuras funcionalidades**

---

## 📦 Estructura Propuesta de Claves

### 1. **common** ✅ (Completado)
- Acciones comunes: save, cancel, delete, edit, close, confirm, back
- Estados: loading, error, success
- Navegación básica: view, search, previous, next
- Paginación: page, of, loadMore

### 2. **auth** ✅ (Completado)
- Login, registro, logout
- Validaciones y mensajes de error
- WhatsApp (opcional)

### 3. **roles** ✅ (Completado)
- Todos los roles del sistema

### 4. **navigation** ⚠️ (Parcial - FALTA)
- ✅ home, trips, experiences, profile, settings, admin, driver
- ❌ **emergencies** (FALTA)
- ❌ **polkadot** (FALTA - si se necesita)

### 5. **passenger** ✅ (Completado)
- Dashboard, solicitud de viajes, historial
- Favoritos, ubicaciones guardadas
- Detalles de viaje, tracking

### 6. **driver** ✅ (Completado)
- Dashboard, viajes disponibles
- Gestión de vehículos
- Iniciar/completar viajes
- Alertas y notificaciones

### 7. **trip** ✅ (Completado)
- Estados: pending, confirmed, inProgress, completed, cancelled
- Estados adicionales: expiredNoResponse, expiredTime

### 8. **admin** ✅ (Completado)
- Dashboard, usuarios, viajes
- Vehículos, onboarding
- Reportes y configuración

### 9. **notifications** ✅ (Completado)
- Lista, marcar como leída
- Archivar, estados

### 10. **settings** ✅ (Completado)
- Información personal
- Preferencias
- Configuración de cuenta

### 11. **profile** ✅ (Completado)
- Perfiles por rol
- Información personal y profesional
- Documentos y licencias

### 12. **currency** ✅ (Completado)
- Todas las monedas soportadas

### 13. **vehicle** ✅ (Completado)
- Tipos, estados, información

### 14. **theme** ✅ (Completado)
- light, dark, system

### 15. **pwa** ✅ (Completado)
- Instalación y beneficios

### 16. **footer** ✅ (Completado)
- Términos, privacidad, copyright

### 17. **terms** ✅ (Completado)
- Placeholder para términos

### 18. **privacy** ✅ (Completado)
- Placeholder para privacidad

---

## 🚨 MÓDULOS FALTANTES (CRÍTICO)

### 19. **emergency** ❌ (FALTA COMPLETAMENTE)

#### 19.1. emergency.report
```json
{
  "emergency": {
    "report": {
      "title": "Reportar Emergencia",
      "description": "Reporta una emergencia. Las autoridades serán notificadas inmediatamente.",
      "type": "Tipo de Emergencia",
      "selectType": "Selecciona el tipo de emergencia",
      "severity": "Severidad",
      "titleLabel": "Título",
      "titlePlaceholder": "Ej: Accidente de tránsito en Avenida Principal",
      "descriptionLabel": "Descripción",
      "descriptionPlaceholder": "Describe la emergencia con el mayor detalle posible...",
      "numberOfPeople": "Número de personas afectadas",
      "location": "Ubicación",
      "locationPlaceholder": "Buscar ubicación o usar mi ubicación actual",
      "useCurrentLocation": "Usar mi ubicación actual",
      "relatedTrip": "Viaje relacionado (opcional)",
      "selectTrip": "Ninguno",
      "none": "Ninguno",
      "submit": "Reportar Emergencia",
      "reporting": "Reportando...",
      "success": "Emergencia reportada correctamente. Las autoridades han sido notificadas.",
      "error": "Error al reportar emergencia"
    },
    "types": {
      "ACCIDENT": "Accidente",
      "MEDICAL": "Emergencia Médica",
      "FIRE": "Incendio",
      "CRIME": "Crimen",
      "SECURITY_THREAT": "Amenaza de Seguridad",
      "MOUNTAIN_RESCUE": "Rescate en Montaña",
      "WATER_RESCUE": "Rescate Acuático",
      "OTHER": "Otro"
    },
    "severity": {
      "LOW": "Baja",
      "MEDIUM": "Media",
      "HIGH": "Alta",
      "CRITICAL": "Crítica"
    },
    "status": {
      "REPORTED": "Reportada",
      "ALERTING": "Alertando",
      "ALERTED": "Alertada",
      "RESPONDING": "Respondiendo",
      "RESOLVED": "Resuelta",
      "CANCELLED": "Cancelada"
    },
    "list": {
      "title": "Emergencias",
      "description": "Gestiona y monitorea todas las emergencias",
      "descriptionUser": "Visualiza tus emergencias reportadas",
      "reportNew": "Reportar Emergencia",
      "noEmergencies": "No se encontraron emergencias",
      "loading": "Cargando emergencias...",
      "search": "Buscar por número, título o descripción...",
      "filterStatus": "Todos los estados",
      "filterType": "Todos los tipos",
      "filterSeverity": "Todas las severidades",
      "number": "Número",
      "type": "Tipo",
      "title": "Título",
      "severity": "Severidad",
      "status": "Estado",
      "location": "Ubicación",
      "reportedBy": "Reportado por",
      "date": "Fecha",
      "actions": "Acciones",
      "view": "Ver",
      "showing": "Mostrando",
      "of": "de",
      "emergencies": "emergencias"
    },
    "details": {
      "title": "Detalles de Emergencia",
      "back": "Volver a emergencias",
      "emergencyNumber": "Número",
      "type": "Tipo de Emergencia",
      "description": "Descripción",
      "numberOfPeople": "Número de personas afectadas",
      "reportDate": "Fecha de reporte",
      "location": "Ubicación",
      "openInMaps": "Abrir en Google Maps",
      "reportedBy": "Reportado por",
      "relatedTrip": "Viaje relacionado",
      "resolution": "Resolución",
      "resolvedBy": "Resuelto por",
      "resolvedAt": "el",
      "alerts": "Alertas enviadas",
      "service": "Servicio",
      "method": "Método",
      "status": "Estado",
      "sentAt": "Enviada",
      "actions": "Acciones",
      "updateStatus": "Actualizar Estado",
      "resolve": "Resolver",
      "cancel": "Cancelar",
      "updateStatusTitle": "Actualizar Estado",
      "updateStatusDescription": "Selecciona el nuevo estado de la emergencia",
      "statusLabel": "Estado",
      "resolveTitle": "Resolver Emergencia",
      "resolveDescription": "Proporciona detalles sobre cómo se resolvió la emergencia",
      "resolutionLabel": "Resolución",
      "resolutionPlaceholder": "Describe cómo se resolvió la emergencia...",
      "resolveButton": "Resolver",
      "cancelTitle": "Cancelar Emergencia",
      "cancelDescription": "¿Estás seguro de que deseas cancelar esta emergencia?",
      "cancelReason": "Motivo (opcional)",
      "cancelReasonPlaceholder": "Razón de la cancelación...",
      "cancelButton": "Cancelar Emergencia",
      "dontCancel": "No cancelar",
      "updating": "Actualizando...",
      "resolving": "Resolviendo...",
      "cancelling": "Cancelando...",
      "updateSuccess": "Estado actualizado correctamente",
      "resolveSuccess": "Emergencia resuelta correctamente",
      "cancelSuccess": "Emergencia cancelada correctamente",
      "updateError": "Error al actualizar el estado",
      "resolveError": "Error al resolver la emergencia",
      "cancelError": "Error al cancelar la emergencia",
      "resolutionRequired": "Por favor proporciona una resolución"
    }
  }
}
```

### 20. **polkadot** ❌ (FALTA COMPLETAMENTE)

#### 20.1. polkadot.wallet
```json
{
  "polkadot": {
    "wallet": {
      "connect": "Conectar Billetera",
      "disconnect": "Desconectar",
      "connected": "Conectado",
      "connecting": "Conectando...",
      "selectAccount": "Seleccionar Cuenta",
      "noAccounts": "No se encontraron cuentas",
      "selectAccountDescription": "Selecciona una cuenta de tu billetera",
      "account": "Cuenta",
      "balance": "Balance",
      "chain": "Cadena",
      "connectError": "Error al conectar billetera",
      "disconnectError": "Error al desconectar",
      "notConnected": "No conectado",
      "connectFirst": "Conecta tu billetera primero"
    },
    "payment": {
      "title": "Pago con Polkadot",
      "description": "Realiza el pago usando tu billetera Polkadot",
      "amount": "Monto",
      "currency": "Moneda",
      "to": "Para",
      "from": "Desde",
      "network": "Red",
      "pay": "Pagar",
      "paying": "Pagando...",
      "success": "Pago realizado correctamente",
      "error": "Error al realizar el pago",
      "cancelled": "Pago cancelado",
      "insufficientBalance": "Balance insuficiente",
      "processing": "Procesando pago...",
      "confirmPayment": "Confirmar Pago",
      "paymentDetails": "Detalles del Pago",
      "qrCode": "Código QR",
      "scanToPay": "Escanea para pagar",
      "copyAddress": "Copiar dirección",
      "addressCopied": "Dirección copiada"
    },
    "identity": {
      "title": "Identidad People Chain",
      "description": "Gestiona tu identidad en People Chain",
      "noIdentity": "No tienes una identidad registrada",
      "createIdentity": "Crear Identidad",
      "identityCreated": "Identidad creada correctamente",
      "identityError": "Error al crear identidad",
      "displayName": "Nombre a Mostrar",
      "legalName": "Nombre Legal",
      "email": "Email",
      "web": "Sitio Web",
      "twitter": "Twitter",
      "riot": "Riot",
      "judgements": "Juicios"
    }
  }
}
```

### 21. **systemConfig** ❌ (FALTA COMPLETAMENTE)

```json
{
  "systemConfig": {
    "title": "Configuración del Sistema",
    "description": "Gestiona las configuraciones del sistema",
    "validations": {
      "title": "Validaciones",
      "description": "Configura las validaciones del sistema",
      "distanceStartTrip": "Validar distancia al iniciar viaje",
      "distanceEndTrip": "Validar distancia al finalizar viaje",
      "save": "Guardar Configuraciones",
      "saving": "Guardando...",
      "success": "Configuraciones guardadas correctamente",
      "error": "Error al guardar configuraciones"
    },
    "polkadot": {
      "title": "Configuración de Polkadot",
      "description": "Configura los parámetros de integración con Polkadot",
      "network": "Red",
      "networkDescription": "Red de Polkadot a utilizar",
      "paymentChain": "Cadena de Pago",
      "paymentChainDescription": "Cadena utilizada para pagos",
      "paymentPreset": "Preset de Pago",
      "paymentPresetDescription": "Configuración predefinida de pago",
      "paymentCustom": "Configuración Personalizada",
      "paymentCustomDescription": "Configuración personalizada de pago (JSON)",
      "assetUsdtId": "ID de Asset USDT",
      "assetUsdtIdDescription": "ID del asset USDT en la cadena",
      "assetUsdcId": "ID de Asset USDC",
      "assetUsdcIdDescription": "ID del asset USDC en la cadena",
      "platformAddress": "Dirección de la Plataforma",
      "platformAddressDescription": "Dirección que recibe los pagos de la plataforma",
      "platformFeePercentage": "Porcentaje de Comisión",
      "platformFeePercentageDescription": "Porcentaje de comisión de la plataforma",
      "save": "Guardar Configuración",
      "saving": "Guardando...",
      "success": "Configuración de Polkadot guardada correctamente",
      "error": "Error al guardar configuración",
      "loadError": "Error al cargar configuraciones de Polkadot",
      "selectNetwork": "Seleccionar Red",
      "selectChain": "Seleccionar Cadena",
      "selectPreset": "Seleccionar Preset",
      "networks": {
        "ASSET_HUB": "Asset Hub (Polkadot)",
        "ASSET_HUB_KUSAMA": "Asset Hub (Kusama)",
        "PASET_HUB": "PassetHub (Testnet)"
      },
      "chains": {
        "ASSET_HUB": "Asset Hub",
        "ASSET_HUB_KUSAMA": "Asset Hub Kusama",
        "PASET_HUB": "PassetHub"
      }
    }
  }
}
```

---

## 📝 CLAVES ADICIONALES FALTANTES

### 22. **trip.status** ⚠️ (FALTA)
```json
{
  "trip": {
    "status": {
      "pendingPayment": "Pago Pendiente"  // ❌ FALTA
    }
  }
}
```

### 23. **admin** ⚠️ (FALTA)
```json
{
  "admin": {
    "driverReassigned": "Conductor cambiado correctamente",  // ❌ FALTA
    "manageVehicles": "Gestionar Vehículos",  // ❌ FALTA
    "vehiclesDescription": "Aprobar o rechazar vehículos",  // ❌ FALTA
    "viewVehicles": "Ver Vehículos",  // ❌ FALTA
    "systemConfig": "Configuración del Sistema",  // ❌ FALTA
    "systemConfigDescription": "Gestiona las configuraciones del sistema"  // ❌ FALTA
  }
}
```

---

## 🔧 TAREAS DE IMPLEMENTACIÓN

### Fase 1: Emergencias (CRÍTICO) 🔴
- [ ] Agregar todas las claves de `emergency.*` a es.json
- [ ] Traducir a en.json
- [ ] Traducir a pt.json
- [ ] Reemplazar textos hardcodeados en:
  - `pages/Emergencies.tsx`
  - `pages/EmergencyDetails.tsx`
  - `pages/ReportEmergency.tsx`

### Fase 2: Polkadot (ALTO) 🟡
- [ ] Agregar todas las claves de `polkadot.*` a es.json
- [ ] Traducir a en.json
- [ ] Traducir a pt.json
- [ ] Reemplazar textos hardcodeados en:
  - `components/polkadot/*`
  - `hooks/usePolkadotPayment.ts`
  - `hooks/usePolkadotWallet.ts`
  - `pages/Settings.tsx` (sección Polkadot)

### Fase 3: Configuración del Sistema (ALTO) 🟡
- [ ] Agregar todas las claves de `systemConfig.*` a es.json
- [ ] Traducir a en.json
- [ ] Traducir a pt.json
- [ ] Reemplazar textos hardcodeados en:
  - `pages/admin/SystemConfig.tsx`

### Fase 4: Completar Claves Faltantes (MEDIO) 🟢
- [ ] Agregar `trip.status.pendingPayment`
- [ ] Agregar claves faltantes en `admin.*`
- [ ] Agregar `navigation.emergencies`
- [ ] Verificar y completar todas las claves con fallbacks

### Fase 5: Revisión y Limpieza (BAJO) 🔵
- [ ] Buscar y reemplazar todos los textos hardcodeados
- [ ] Verificar consistencia entre idiomas
- [ ] Validar que no haya claves duplicadas
- [ ] Documentar estructura final

---

## 📊 Estadísticas

### Estado Actual
- **Español (es)**: ~85% completo
- **Inglés (en)**: ~70% completo
- **Portugués (pt)**: ~70% completo

### Después de Implementación
- **Español (es)**: 100% completo
- **Inglés (en)**: 100% completo
- **Portugués (pt)**: 100% completo

### Claves Totales Estimadas
- **Actuales**: ~600 claves
- **Faltantes**: ~150 claves
- **Total Final**: ~750 claves

---

## 🎨 Convenciones de Nomenclatura

### Estructura de Claves
```
{modulo}.{submodulo}.{elemento}
```

### Ejemplos
- `emergency.report.title` ✅
- `polkadot.wallet.connect` ✅
- `admin.trips.list` ✅
- `common.save` ✅

### Evitar
- Claves muy genéricas: `title`, `description` (sin contexto)
- Claves duplicadas en diferentes módulos
- Claves anidadas más de 3 niveles

---

## 📋 Checklist de Implementación

### Para cada módulo nuevo:
- [ ] Crear estructura en es.json
- [ ] Traducir a en.json
- [ ] Traducir a pt.json
- [ ] Reemplazar textos hardcodeados en componentes
- [ ] Verificar que no haya fallbacks innecesarios
- [ ] Probar en los 3 idiomas
- [ ] Validar formato JSON

---

## 🚀 Prioridades

1. **🔴 CRÍTICO**: Sistema de Emergencias (ya implementado, falta i18n)
2. **🟡 ALTO**: Polkadot (funcionalidad importante)
3. **🟡 ALTO**: SystemConfig (ya implementado, falta i18n)
4. **🟢 MEDIO**: Claves faltantes en módulos existentes
5. **🔵 BAJO**: Limpieza y optimización

---

## 📝 Notas Importantes

1. **Fallbacks**: Muchos componentes usan `t('key') || 'Texto hardcodeado'`. Estos deben eliminarse una vez que todas las claves estén traducidas.

2. **Consistencia**: Mantener el mismo estilo y tono en todos los idiomas.

3. **Contexto**: Algunas traducciones pueden necesitar contexto adicional (ej: "Save" puede ser "Guardar" o "Salvar" dependiendo del contexto).

4. **Pluralización**: i18next soporta pluralización, pero actualmente no se está usando. Considerar para futuras mejoras.

5. **Interpolación**: Algunas traducciones usan variables (ej: `{{count}}`). Asegurar que todas las interpolaciones estén correctamente formateadas.

---

## 🔍 Archivos a Modificar

### Archivos de Traducción
- `frontend/src/i18n/locales/es.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/pt.json`

### Componentes a Actualizar
- `frontend/src/pages/Emergencies.tsx`
- `frontend/src/pages/EmergencyDetails.tsx`
- `frontend/src/pages/ReportEmergency.tsx`
- `frontend/src/pages/admin/SystemConfig.tsx`
- `frontend/src/components/polkadot/*` (todos)
- `frontend/src/hooks/usePolkadotPayment.ts`
- `frontend/src/hooks/usePolkadotWallet.ts`
- `frontend/src/pages/Settings.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/UserMenu.tsx`

---

## ✅ Resultado Esperado

Al finalizar este plan:
- ✅ 100% de las funcionalidades traducidas
- ✅ 3 idiomas completamente soportados
- ✅ Sin textos hardcodeados
- ✅ Estructura organizada y escalable
- ✅ Fácil mantenimiento y extensión

---

## 📅 Estimación

- **Fase 1 (Emergencias)**: 2-3 horas
- **Fase 2 (Polkadot)**: 3-4 horas
- **Fase 3 (SystemConfig)**: 1-2 horas
- **Fase 4 (Completar)**: 1-2 horas
- **Fase 5 (Revisión)**: 1-2 horas

**Total estimado**: 8-13 horas

---

*Última actualización: 2025-12-30*

