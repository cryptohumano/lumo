# Acceso a Emergencias - Roles y Permisos

## 👥 Usuarios que pueden acceder a emergencias

### **1. Reportar Emergencias (POST /api/emergencies)**
✅ **Cualquier usuario autenticado** puede reportar emergencias:
- PASSENGER (Pasajero)
- DRIVER (Conductor)
- HOST (Anfitrión)
- DISPATCHER (Despachador)
- SUPPORT (Soporte)
- MODERATOR (Moderador)
- ADMIN (Administrador)
- AUTHORITY (Autoridad)

**Requisitos:**
- Usuario debe estar autenticado (tener token JWT válido)
- Debe proporcionar: tipo, coordenadas, título y descripción

---

### **2. Ver Emergencias (GET /api/emergencies)**

#### **Usuarios Regulares** (PASSENGER, DRIVER, HOST, etc.)
✅ Pueden ver **SOLO sus propias emergencias** (las que ellos reportaron)

#### **AUTHORITY (Autoridad)**
✅ Pueden ver **TODAS las emergencias** en su área de cobertura
- Pueden filtrar por proximidad (usando `latitude`, `longitude`, `radiusKm`)
- Acceso al dashboard de emergencias: `/authority/dashboard`
- Pueden ver mapa con todas las emergencias

#### **ADMIN (Administrador)**
✅ Pueden ver **TODAS las emergencias** sin restricciones
- Acceso completo a todas las funcionalidades
- Pueden ver todas las emergencias sin filtros de área

---

### **3. Ver Detalles de Emergencia (GET /api/emergencies/:id)**

✅ **Pueden ver:**
- El usuario que reportó la emergencia (reporter)
- Usuarios con rol **AUTHORITY**
- Usuarios con rol **ADMIN**

❌ **NO pueden ver:**
- Otros usuarios que no reportaron la emergencia

---

### **4. Gestionar Emergencias (Actualizar estado, resolver, cancelar)**

#### **AUTHORITY (Autoridad)**
✅ Pueden:
- Actualizar estado de emergencias (`PUT /api/emergencies/:id/status`)
- Resolver emergencias (`POST /api/emergencies/:id/resolve`)
- Cancelar emergencias (`POST /api/emergencies/:id/cancel`)
- Ver emergencias cercanas (`GET /api/emergencies/nearby`)

#### **ADMIN (Administrador)**
✅ Pueden hacer **TODO** lo que puede hacer AUTHORITY, más:
- Acceso completo sin restricciones de área
- Gestionar cualquier emergencia en el sistema

---

## 🔐 Resumen de Permisos

| Acción | Usuario Regular | AUTHORITY | ADMIN |
|--------|----------------|-----------|-------|
| **Reportar emergencia** | ✅ | ✅ | ✅ |
| **Ver propias emergencias** | ✅ | ✅ | ✅ |
| **Ver todas las emergencias** | ❌ | ✅ (en su área) | ✅ (todas) |
| **Ver detalles de emergencia** | ✅ (solo propias) | ✅ (todas) | ✅ (todas) |
| **Actualizar estado** | ❌ | ✅ | ✅ |
| **Resolver emergencia** | ❌ | ✅ | ✅ |
| **Cancelar emergencia** | ❌ | ✅ | ✅ |
| **Dashboard de emergencias** | ❌ | ✅ | ✅ |

---

## 🚨 Cómo crear un usuario AUTHORITY

### **Opción 1: Desde el backend (directo en base de datos)**
```sql
-- Actualizar rol de usuario existente
UPDATE users SET role = 'AUTHORITY' WHERE email = 'autoridad@ejemplo.com';

-- Crear perfil de autoridad
INSERT INTO authority_profiles (id, "userId", "authorityType", department, "isVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'autoridad@ejemplo.com'),
  'POLICE', -- o FIRE_DEPARTMENT, AMBULANCE, etc.
  'Policía Nacional',
  true,
  NOW(),
  NOW()
);
```

### **Opción 2: Desde el código (si hay endpoint de admin)**
Un ADMIN puede cambiar el rol de un usuario a `AUTHORITY` desde el panel de administración.

### **Opción 3: Durante el registro (si está implementado)**
Algunos sistemas permiten que autoridades se registren directamente con su rol, pero requieren verificación posterior.

---

## 📍 Área de Cobertura (AUTHORITY)

Los usuarios con rol `AUTHORITY` pueden tener un `areaOfCoverage` definido en su `AuthorityProfile`:
- GeoJSON con polígonos de cobertura
- Lista de regiones/países
- Radio de cobertura desde su ubicación

Si no está definido, pueden ver todas las emergencias (similar a ADMIN).

---

## 🔗 Rutas del Frontend

### **Para todos los usuarios:**
- `/report-emergency` - Reportar emergencia
- `/emergencies` - Lista de emergencias (solo propias para usuarios regulares)
- `/emergencies/:id` - Detalles de emergencia

### **Solo para AUTHORITY y ADMIN:**
- `/authority/dashboard` - Dashboard completo con mapa y estadísticas

---

## ⚠️ Notas Importantes

1. **Autenticación requerida**: Todas las rutas de emergencias requieren autenticación
2. **Verificación de autoridad**: Los usuarios con rol `AUTHORITY` deberían tener un `AuthorityProfile` verificado (`isVerified = true`)
3. **Ubicación**: Las autoridades pueden usar su ubicación (`user.latitude`, `user.longitude`) para filtrar emergencias cercanas
4. **Seguridad**: El backend valida los permisos en cada endpoint antes de permitir el acceso

