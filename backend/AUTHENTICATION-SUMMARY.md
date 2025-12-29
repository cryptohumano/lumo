# Resumen de Autenticación - OAuth y FHE

## ✅ Cambios Implementados

### 1. Schema de Prisma Actualizado

#### Modelo User
- ✅ `password` ahora es **opcional** (`String?`)
- ✅ `isEmailVerified` agregado para verificación de email
- ✅ Relación con `Account[]` para cuentas OAuth

#### Nuevo Modelo Account
- ✅ Soporta múltiples proveedores OAuth (Google, Facebook, Apple)
- ✅ Almacena tokens de acceso (preparado para encriptación)
- ✅ Unique constraint en `[provider, providerAccountId]`
- ✅ Relación con User (Cascade delete)

#### Nuevo Enum AuthProvider
```prisma
enum AuthProvider {
  EMAIL      // Autenticación tradicional
  GOOGLE     // Google OAuth
  FACEBOOK   // Futuro
  APPLE      // Futuro
}
```

### 2. Servicios Creados

#### `oauthService.ts`
- ✅ `findOrCreateOAuthUser()` - Busca o crea usuario desde OAuth
- ✅ `linkOAuthAccount()` - Vincula cuenta OAuth adicional
- ✅ `unlinkOAuthAccount()` - Desvincula cuenta OAuth
- ✅ `getUserAccounts()` - Lista cuentas vinculadas

#### `userService.ts` Actualizado
- ✅ `password` opcional en `CreateUserData`
- ✅ Validación para usuarios solo OAuth en login
- ✅ Soporte para `avatar` en creación

### 3. Documentación

#### `OAUTH-AND-FHE.md`
- ✅ Guía completa de implementación OAuth
- ✅ Documentación de FHE (Full Homomorphic Encryption)
- ✅ Recomendaciones prácticas (AES-256 vs FHE)
- ✅ Ejemplos de código para encriptación

---

## 🔄 Flujos de Autenticación

### Flujo 1: Registro con Email/Password
```
1. Usuario ingresa email + password
2. Backend hashea password con bcrypt
3. Crea User con password hasheado
4. Genera JWT tokens
5. Retorna tokens al cliente
```

### Flujo 2: Login con Email/Password
```
1. Usuario ingresa email + password
2. Backend busca User por email
3. Verifica password con bcrypt.compare()
4. Genera JWT tokens
5. Retorna tokens al cliente
```

### Flujo 3: Registro/Login con Google OAuth
```
1. Usuario hace clic en "Continuar con Google"
2. Redirige a Google OAuth
3. Google retorna código de autorización
4. Backend intercambia código por tokens
5. Backend busca Account por provider + providerAccountId
6. Si existe: actualiza tokens
7. Si no existe: busca User por email
   - Si User existe: vincula Account
   - Si no existe: crea User + Account
8. Genera JWT tokens propios
9. Retorna tokens al cliente
```

### Flujo 4: Vincular Cuenta OAuth a Usuario Existente
```
1. Usuario ya tiene cuenta con email/password
2. Inicia sesión con Google
3. Backend detecta email existente
4. Crea Account vinculada al User existente
5. Usuario puede usar ambos métodos de login
```

---

## 🔒 Encriptación (FHE/AES)

### Estado Actual
- ⚠️ **Tokens OAuth NO están encriptados** (TODO en código)
- ⚠️ **Datos sensibles NO están encriptados** (preparado para implementar)

### Campos que Deberían Encriptarse

1. **Account Model**:
   - `accessToken` - Token de acceso OAuth
   - `refreshToken` - Refresh token OAuth
   - `idToken` - ID token OAuth

2. **User Model**:
   - `phone` - Número de teléfono (si se almacena)

3. **Payment Model**:
   - `paymentMethodDetails` - Detalles de método de pago

### Recomendación

**Para producción, usar AES-256-GCM**:
- ✅ Más rápido que FHE
- ✅ Suficientemente seguro
- ✅ Práctico para la mayoría de casos
- ✅ Soporte nativo en Node.js

**FHE solo si**:
- Requisitos regulatorios estrictos
- Necesidad de búsquedas sobre datos encriptados
- Presupuesto para alto costo computacional

---

## 📋 Próximos Pasos

### OAuth
- [ ] Instalar dependencias OAuth (passport-google-oauth20)
- [ ] Crear rutas de autenticación OAuth
- [ ] Implementar callback de Google OAuth
- [ ] Agregar botón "Continuar con Google" en frontend
- [ ] Manejar errores de vinculación de cuentas

### Encriptación
- [ ] Decidir: FHE completo o AES-256
- [ ] Crear servicio de encriptación
- [ ] Encriptar tokens OAuth antes de guardar
- [ ] Desencriptar tokens al usar
- [ ] Gestionar claves de forma segura (env vars, secrets manager)

### Testing
- [ ] Tests para registro OAuth
- [ ] Tests para login OAuth
- [ ] Tests para vinculación de cuentas
- [ ] Tests para encriptación/desencriptación

---

## 🔗 Dependencias Necesarias

```json
{
  "dependencies": {
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "@types/passport": "^1.0.16",
    "@types/passport-google-oauth20": "^2.0.14"
  }
}
```

---

## 📝 Notas Importantes

1. **Password Opcional**: Los usuarios pueden tener solo OAuth, solo password, o ambos
2. **Email Único**: El email sigue siendo único, pero un usuario puede tener múltiples Accounts
3. **Tokens OAuth**: Actualmente se guardan en texto plano (TODO: encriptar)
4. **Seguridad**: Implementar encriptación antes de producción
5. **Migración**: Ejecutar `prisma migrate dev` para aplicar cambios al schema

