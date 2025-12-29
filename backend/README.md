# Backend API - Operations

Backend API para el sistema de Operations. Maneja usuarios, tokens, números de WhatsApp y registra todas las interacciones.

## 🏗️ Arquitectura

- **PostgreSQL**: Base de datos principal
- **Prisma**: ORM y gestión de esquemas
- **Express**: Framework web
- **JWT**: Autenticación con tokens
- **TypeScript**: Tipado estático

## 📋 Características

- ✅ Autenticación de usuarios (JWT)
- ✅ Gestión de tokens (refresh tokens, API keys)
- ✅ Números de WhatsApp como punto de entrada
- ✅ Registro completo de interacciones (independiente de WhatsApp)
- ✅ Gestión de viajes/cotizaciones
- ✅ Sistema de roles (Admin, Driver, Operator)

## 🚀 Instalación

```bash
# Instalar dependencias
yarn install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Configurar base de datos
# Crear base de datos PostgreSQL
createdb operations

# Generar cliente de Prisma
yarn prisma:generate

# Ejecutar migraciones
yarn prisma:migrate

# (Opcional) Poblar con datos de ejemplo
yarn prisma:seed
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/operations?schema=public"

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server
PORT=3000
NODE_ENV=development

# WhatsApp (opcional)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

## 🗄️ Esquema de Base de Datos

### Modelos Principales

- **User**: Usuarios del sistema (conductores, administradores)
- **Token**: Tokens de autenticación (JWT refresh tokens, API keys)
- **WhatsAppNumber**: Números de WhatsApp asociados a usuarios
- **Interaction**: Registro de todas las interacciones de WhatsApp
- **Trip**: Viajes/cotizaciones

### Relaciones

```
User
  ├── tokens (Token[])
  ├── whatsappNumbers (WhatsAppNumber[])
  ├── interactions (Interaction[])
  └── trips (Trip[])

WhatsAppNumber
  ├── user (User)
  ├── interactions (Interaction[])
  └── trips (Trip[])

Interaction
  ├── whatsappNumber (WhatsAppNumber)
  ├── user (User?)
  └── trip (Trip?)

Trip
  ├── user (User?)
  ├── whatsappNumber (WhatsAppNumber?)
  └── interactions (Interaction[])
```

## 🛠️ Desarrollo

```bash
# Modo desarrollo (con watch)
yarn dev

# Build
yarn build

# Iniciar producción
yarn start

# Prisma Studio (GUI para la base de datos)
yarn prisma:studio
```

## 📚 Scripts Disponibles

- `yarn dev` - Desarrollo con watch
- `yarn build` - Compilar TypeScript
- `yarn start` - Iniciar en producción
- `yarn prisma:generate` - Generar cliente de Prisma
- `yarn prisma:migrate` - Ejecutar migraciones
- `yarn prisma:studio` - Abrir Prisma Studio
- `yarn prisma:seed` - Poblar base de datos con datos de ejemplo

## 🔐 Autenticación

El sistema usa JWT con refresh tokens:

1. **Login**: Usuario se autentica con email/password
2. **Access Token**: Token de corta duración (7 días)
3. **Refresh Token**: Token de larga duración (30 días) guardado en BD
4. **Refresh**: Usar refresh token para obtener nuevo access token

## 📊 Registro de Interacciones

Todas las interacciones de WhatsApp se registran en la base de datos, independientemente de si se envían o no:

- **Tipo**: TRIP_REQUEST, TRIP_CONFIRMATION, MESSAGE, etc.
- **Dirección**: OUTBOUND (enviado) o INBOUND (recibido)
- **Estado**: PENDING, SENT, DELIVERED, READ, FAILED
- **Metadata**: Información adicional (tripData, errores, etc.)

Esto permite:
- Mantener historial completo
- No depender de WhatsApp para consultar mensajes
- Analizar interacciones
- Debugging

## 🔌 Integración con WhatsApp

El backend está diseñado para trabajar con:

1. **WhatsApp Business API** (Meta)
2. **Twilio WhatsApp API**

Los mensajes se envían a través de estos servicios, pero **todos se registran en la base de datos** antes y después del envío.

## 📄 Licencia

MIT





