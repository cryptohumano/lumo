# OAuth y Full Homomorphic Encryption (FHE)

## 🔐 Autenticación OAuth

### Implementación Actual

El schema de Prisma ahora soporta múltiples métodos de autenticación:

1. **Email/Password**: Autenticación tradicional
2. **Google OAuth**: Autenticación con Google
3. **Extensible**: Preparado para Facebook, Apple, etc.

### Modelo Account

Cada usuario puede tener múltiples cuentas vinculadas (ej: email + Google). Esto permite:
- Iniciar sesión con cualquier método vinculado
- Vincular cuentas adicionales después del registro
- Mantener historial y datos unificados

### Campos Clave

```prisma
model Account {
  provider          AuthProvider  // GOOGLE, EMAIL, etc.
  providerAccountId String        // ID único en el proveedor
  accessToken       String?       // Token de acceso (encriptado)
  refreshToken      String?       // Refresh token (encriptado)
  expiresAt         DateTime?     // Expiración del token
}
```

### Flujo de Autenticación OAuth

1. **Registro/Login con Google**:
   - Usuario hace clic en "Continuar con Google"
   - Redirige a Google OAuth
   - Google retorna código de autorización
   - Backend intercambia código por tokens
   - Busca o crea usuario con `providerAccountId`
   - Vincula Account al User
   - Genera JWT propio del sistema

2. **Vincular Cuenta Existente**:
   - Usuario ya tiene cuenta con email/password
   - Inicia sesión con Google
   - Sistema detecta email existente
   - Vincula Account de Google al User existente

3. **Login con Cuenta Vinculada**:
   - Usuario puede usar email/password O Google
   - Ambos métodos acceden al mismo User

---

## 🔒 Full Homomorphic Encryption (FHE)

### ¿Qué es FHE?

FHE permite realizar operaciones sobre datos encriptados sin desencriptarlos. Esto significa que:
- Los datos están encriptados en la base de datos
- Se pueden hacer búsquedas y cálculos sin desencriptar
- Solo el usuario final puede ver los datos desencriptados

### Consideraciones para Implementación

**⚠️ IMPORTANTE**: FHE es extremadamente costoso computacionalmente y actualmente no es práctico para la mayoría de aplicaciones. Sin embargo, documentamos cómo se implementaría.

### Campos que Deberían Usar FHE

#### 1. **Datos Sensibles de Usuario**
```typescript
// En el modelo User
phone          String?  // Encriptado con FHE
// Datos de pago (si se almacenan)
creditCardLast4 String? // Encriptado con FHE
```

#### 2. **Tokens OAuth**
```typescript
// En el modelo Account
accessToken    String?  // Encriptado con FHE
refreshToken  String?  // Encriptado con FHE
idToken       String?  // Encriptado con FHE
```

#### 3. **Datos de Pago**
```typescript
// En el modelo Payment
paymentMethodDetails Json? // Detalles encriptados con FHE
```

#### 4. **Información Personal de Viajes**
```typescript
// En el modelo Trip
clientName     String?  // Encriptado con FHE
clientPhone    String?  // Encriptado con FHE
clientEmail    String?  // Encriptado con FHE
```

### Implementación de FHE

#### Opción 1: Usar Biblioteca FHE (Teórico)

```typescript
// Ejemplo con Microsoft SEAL o similar
import { Encryptor, Decryptor } from '@microsoft/seal'

class FHEManager {
  private encryptor: Encryptor
  private decryptor: Decryptor

  encrypt(data: string): string {
    // Encriptar usando FHE
    return this.encryptor.encrypt(data)
  }

  decrypt(encrypted: string): string {
    // Desencriptar (solo el usuario puede hacerlo)
    return this.decryptor.decrypt(encrypted)
  }

  // Operaciones sobre datos encriptados
  search(encryptedQuery: string, encryptedData: string[]): string[] {
    // Buscar sin desencriptar
    return encryptedData.filter(data => 
      this.encryptor.compare(encryptedQuery, data)
    )
  }
}
```

#### Opción 2: Encriptación Híbrida (Práctica)

Para producción, recomendamos un enfoque híbrido:

```typescript
// Encriptación AES-256 para datos sensibles
import * as crypto from 'crypto'

class EncryptionService {
  private algorithm = 'aes-256-gcm'
  private key: Buffer

  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    }
  }

  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    )
    decipher.setAuthTag(Buffer.from(tag, 'hex'))
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}
```

### Campos en Schema para FHE

Si se implementa FHE, los campos sensibles deberían tener estructura:

```prisma
model User {
  // Campos normales
  email      String   @unique
  name       String
  
  // Campos encriptados (FHE o AES)
  phoneEncrypted      String?  // Datos encriptados
  phoneEncryptionIv   String?  // IV para desencriptar
  phoneEncryptionTag  String?  // Tag de autenticación
}
```

### Recomendación para Producción

**Para esta aplicación, recomendamos**:

1. **Encriptación AES-256-GCM** para datos sensibles:
   - Tokens OAuth
   - Números de teléfono
   - Información de pago
   - Datos personales de clientes

2. **FHE solo para casos específicos**:
   - Si se requiere búsqueda sobre datos encriptados
   - Si hay requisitos regulatorios estrictos
   - Si el costo computacional es aceptable

3. **Encriptación a nivel de aplicación**:
   - Encriptar antes de guardar en BD
   - Desencriptar solo cuando el usuario autorizado accede
   - Usar claves por usuario o por tenant

### Implementación Práctica

```typescript
// backend/src/services/encryption.ts
import * as crypto from 'crypto'

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32

  static encrypt(text: string, userKey: string): {
    encrypted: string
    iv: string
    tag: string
  } {
    const key = crypto.scryptSync(userKey, 'salt', this.KEY_LENGTH)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    }
  }

  static decrypt(
    encrypted: string,
    iv: string,
    tag: string,
    userKey: string
  ): string {
    const key = crypto.scryptSync(userKey, 'salt', this.KEY_LENGTH)
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    )
    decipher.setAuthTag(Buffer.from(tag, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }
}
```

### Uso en Servicios

```typescript
// Ejemplo: Guardar token OAuth encriptado
const encrypted = EncryptionService.encrypt(
  accessToken,
  user.id // Usar ID de usuario como parte de la clave
)

await prisma.account.create({
  data: {
    userId: user.id,
    provider: 'GOOGLE',
    providerAccountId: googleUser.id,
    accessToken: encrypted.encrypted,
    // Guardar IV y tag para poder desencriptar
    metadata: {
      iv: encrypted.iv,
      tag: encrypted.tag
    }
  }
})
```

---

## 📋 Checklist de Implementación

### OAuth
- [x] Schema actualizado con modelo Account
- [ ] Implementar servicio de OAuth (Google)
- [ ] Crear rutas de autenticación OAuth
- [ ] Manejar vinculación de cuentas
- [ ] Actualizar userService para soportar OAuth

### FHE/Encriptación
- [ ] Decidir: FHE completo o AES-256
- [ ] Implementar servicio de encriptación
- [ ] Actualizar campos sensibles en schema
- [ ] Encriptar datos antes de guardar
- [ ] Desencriptar datos al leer (solo usuarios autorizados)
- [ ] Gestionar claves de encriptación de forma segura

---

## 🔗 Recursos

- [Prisma OAuth Guide](https://www.prisma.io/docs/guides/authentication/oauth)
- [Microsoft SEAL (FHE)](https://github.com/microsoft/SEAL)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [OWASP Encryption Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

