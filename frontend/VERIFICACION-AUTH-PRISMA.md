# Verificación: AuthContext vs Prisma Schema

## Comparación de Campos

### Schema Prisma (User Model)
```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  name            String
  phone           String?
  password        String?  // No se devuelve al frontend
  role            UserRole @default(PASSENGER)
  isActive        Boolean  @default(true)
  isVerified      Boolean  @default(false)
  isEmailVerified Boolean  @default(false)
  avatar          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Tipo User en Frontend (`src/types/index.ts`)
```typescript
export interface User {
  id: string
  email: string
  name: string
  phone?: string | null
  role: UserRole
  isActive: boolean
  isVerified: boolean
  isEmailVerified: boolean
  avatar?: string | null
  createdAt: string  // DateTime se serializa como string ISO
  updatedAt: string  // DateTime se serializa como string ISO
}
```

### AuthContext - Campos que espera recibir
```typescript
const userData: User = {
  id: data.user.id,
  email: data.user.email,
  name: data.user.name,
  phone: data.user.phone || null,
  avatar: data.user.avatar || null,
  role: data.user.role as UserRole,
  isActive: data.user.isActive ?? true,
  isVerified: data.user.isVerified ?? false,
  isEmailVerified: data.user.isEmailVerified ?? false,
  createdAt: data.user.createdAt || new Date().toISOString(),
  updatedAt: data.user.updatedAt || new Date().toISOString(),
}
```

## Estado Actual

### ✅ Campos que MATCHEAN:
- `id` ✅
- `email` ✅
- `name` ✅
- `phone` ✅
- `role` ✅
- `isActive` ✅
- `isVerified` ✅
- `isEmailVerified` ✅
- `avatar` ✅
- `createdAt` ✅
- `updatedAt` ✅

### ⚠️ Problema Encontrado:

**Backend `createUser` service** solo devuelve:
- ❌ FALTA: `avatar`
- ❌ FALTA: `isVerified`
- ❌ FALTA: `isEmailVerified`

**Solución aplicada:**
- Actualizado `select` en `createUser` para incluir todos los campos necesarios

### 📝 Notas:

1. **DateTime serialization**: Prisma devuelve `DateTime` como objetos Date de JavaScript, pero al serializarse a JSON se convierten a strings ISO. El frontend espera strings.

2. **Campos opcionales**: El frontend maneja correctamente los campos opcionales con `|| null` y valores por defecto.

3. **Password**: Correctamente excluido del tipo User en el frontend (no se devuelve nunca).

## Verificación de Endpoints

### Respuesta esperada de `/auth/register`:
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string",
    "phone": "string | null",
    "role": "UserRole",
    "isActive": true,
    "isVerified": false,
    "isEmailVerified": false,
    "avatar": "string | null",
    "createdAt": "ISO string",
    "updatedAt": "ISO string"
  },
  "token": "jwt_token"
}
```

### Respuesta esperada de `/auth/login`:
```json
{
  "user": {
    // Mismos campos que register
  },
  "token": "jwt_token"
}
```

## Estado Final

✅ **AuthContext está correctamente alineado con Prisma Schema**
✅ **Tipos TypeScript coinciden con el modelo Prisma**
✅ **Backend `createUser` actualizado para devolver todos los campos necesarios**

