# Documentación del Schema de Prisma

## 📋 Resumen

Schema completo y optimizado para PostgreSQL con UUIDs, índices apropiados y relaciones bien definidas.

## 🔑 Características Principales

### UUIDs en lugar de CUIDs
- Todos los modelos usan `@default(uuid())` para mejor performance y seguridad
- UUIDs son más eficientes en PostgreSQL y evitan problemas de colisión

### Índices Optimizados
- Índices en campos de búsqueda frecuente (email, status, fechas)
- Índices compuestos para consultas complejas
- Índices en foreign keys para joins eficientes

### Relaciones Seguras
- `onDelete: Cascade` donde es apropiado (tokens, vehículos)
- `onDelete: SetNull` para relaciones opcionales (viajes, interacciones)
- Foreign keys bien definidas en todos los modelos

## 📊 Modelos del Sistema

### 1. **User** (Usuarios)
**Campos clave**:
- `id`: UUID (PK)
- `email`: String único
- `role`: UserRole enum
- `isActive`: Boolean
- `isVerified`: Boolean

**Relaciones**:
- `tokens`: Token[] (1:N)
- `vehicles`: Vehicle[] (1:N)
- `trips`: Trip[] como pasajero (1:N)
- `driverTrips`: Trip[] como conductor (1:N)
- `experiences`: Experience[] (1:N)
- `reservations`: Reservation[] (1:N)
- `payments`: Payment[] (1:N)
- `reviews`: Review[] como revisor y como revisado (1:N)

**Índices**:
- `email` (único)
- `role`
- `isActive`
- `createdAt`

---

### 2. **Token** (Tokens de autenticación)
**Campos clave**:
- `id`: UUID (PK)
- `userId`: UUID (FK → User)
- `token`: String único
- `type`: TokenType enum
- `expiresAt`: DateTime?

**Relaciones**:
- `user`: User (N:1)

**Índices**:
- `userId`
- `token` (único)
- `type`
- `isActive`
- `expiresAt`

---

### 3. **Vehicle** (Vehículos)
**Campos clave**:
- `id`: UUID (PK)
- `userId`: UUID (FK → User)
- `licensePlate`: String único
- `type`: VehicleType enum
- `isAvailable`: Boolean
- `isVerified`: Boolean

**Relaciones**:
- `user`: User (N:1)
- `trips`: Trip[] (1:N)
- `experiences`: Experience[] (1:N)

**Índices**:
- `userId`
- `licensePlate` (único)
- `type`
- `isAvailable`

---

### 4. **Trip** (Viajes Regulares)
**Campos clave**:
- `id`: UUID (PK)
- `tripNumber`: String único (legible)
- `passengerId`: UUID? (FK → User)
- `driverId`: UUID? (FK → User)
- `vehicleId`: UUID? (FK → Vehicle)
- `status`: TripStatus enum
- `totalPrice`: Float

**Relaciones**:
- `passenger`: User (N:1, opcional)
- `driver`: User (N:1, opcional)
- `vehicle`: Vehicle (N:1, opcional)
- `payments`: Payment[] (1:N)
- `reviews`: Review[] (1:N)

**Índices**:
- `passengerId`
- `driverId`
- `vehicleId`
- `tripNumber` (único)
- `status`
- `scheduledAt`
- `createdAt`

---

### 5. **Experience** (Experiencias de Larga Duración)
**Campos clave**:
- `id`: UUID (PK)
- `hostId`: UUID (FK → User)
- `vehicleId`: UUID? (FK → Vehicle)
- `title`: String
- `durationDays`: Int
- `status`: ExperienceStatus enum
- `basePrice`: Float

**Relaciones**:
- `host`: User (N:1)
- `vehicle`: Vehicle (N:1, opcional)
- `reservations`: Reservation[] (1:N)
- `reviews`: Review[] (1:N)

**Índices**:
- `hostId`
- `vehicleId`
- `status`
- `title`
- `createdAt`

---

### 6. **Reservation** (Reservas de Experiencias)
**Campos clave**:
- `id`: UUID (PK)
- `experienceId`: UUID (FK → Experience)
- `passengerId`: UUID (FK → User)
- `startDate`: DateTime
- `endDate`: DateTime
- `status`: ReservationStatus enum
- `totalPrice`: Float

**Relaciones**:
- `experience`: Experience (N:1)
- `passenger`: User (N:1)
- `payments`: Payment[] (1:N)
- `reviews`: Review[] (1:N)

**Índices**:
- `experienceId`
- `passengerId`
- `status`
- `startDate`
- `createdAt`

---

### 7. **Payment** (Pagos)
**Campos clave**:
- `id`: UUID (PK)
- `userId`: UUID? (FK → User)
- `tripId`: UUID? (FK → Trip)
- `reservationId`: UUID? (FK → Reservation)
- `amount`: Float
- `status`: PaymentStatus enum
- `method`: PaymentMethod enum

**Relaciones**:
- `user`: User (N:1, opcional)
- `trip`: Trip (N:1, opcional)
- `reservation`: Reservation (N:1, opcional)

**Índices**:
- `userId`
- `tripId`
- `reservationId`
- `status`
- `transactionId`
- `createdAt`

---

### 8. **Review** (Reseñas)
**Campos clave**:
- `id`: UUID (PK)
- `reviewerId`: UUID (FK → User)
- `reviewedUserId`: UUID (FK → User)
- `tripId`: UUID? (FK → Trip)
- `experienceId`: UUID? (FK → Experience)
- `reservationId`: UUID? (FK → Reservation)
- `rating`: Int (1-5)
- `status`: ReviewStatus enum

**Relaciones**:
- `reviewer`: User (N:1)
- `reviewedUser`: User (N:1)
- `trip`: Trip (N:1, opcional)
- `experience`: Experience (N:1, opcional)
- `reservation`: Reservation (N:1, opcional)

**Índices**:
- `reviewerId`
- `reviewedUserId`
- `tripId`
- `experienceId`
- `reservationId`
- `rating`
- `status`
- `createdAt`

---

### 9. **Location** (Ubicaciones)
**Campos clave**:
- `id`: UUID (PK)
- `userId`: UUID? (FK → User)
- `latitude`: Float
- `longitude`: Float

**Relaciones**:
- `user`: User (N:1, opcional)

**Índices**:
- `userId`
- `[latitude, longitude]` (compuesto para búsquedas geográficas)

---

### 10. **WhatsAppNumber** (Números de WhatsApp)
**Campos clave**:
- `id`: UUID (PK)
- `userId`: UUID (FK → User)
- `phoneNumber`: String único
- `isPrimary`: Boolean

**Relaciones**:
- `user`: User (N:1)
- `trips`: Trip[] (1:N)
- `reservations`: Reservation[] (1:N)

**Índices**:
- `userId`
- `phoneNumber` (único)
- `isActive`

---

### 11. **Interaction** (Interacciones de WhatsApp)
**Campos clave**:
- `id`: UUID (PK)
- `whatsappNumberId`: UUID (FK → WhatsAppNumber)
- `userId`: UUID? (FK → User)
- `type`: InteractionType enum
- `status`: InteractionStatus enum

**Relaciones**:
- `whatsappNumber`: WhatsAppNumber (N:1)
- `user`: User (N:1, opcional)
- `trip`: Trip (N:1, opcional)
- `experience`: Experience (N:1, opcional)
- `reservation`: Reservation (N:1, opcional)

**Índices**:
- `whatsappNumberId`
- `userId`
- `phoneNumber`
- `type`
- `status`
- `createdAt`

---

## 🔄 Relaciones Principales

```
User
├── tokens (Token[])
├── vehicles (Vehicle[])
├── trips (Trip[] como pasajero)
├── driverTrips (Trip[] como conductor)
├── experiences (Experience[])
├── reservations (Reservation[])
├── payments (Payment[])
├── reviews (Review[] como revisor)
└── receivedReviews (Review[] como revisado)

Trip
├── passenger (User)
├── driver (User)
├── vehicle (Vehicle)
├── payments (Payment[])
└── reviews (Review[])

Experience
├── host (User)
├── vehicle (Vehicle)
├── reservations (Reservation[])
└── reviews (Review[])

Reservation
├── experience (Experience)
├── passenger (User)
├── payments (Payment[])
└── reviews (Review[])
```

## ✅ Optimizaciones Implementadas

1. **UUIDs**: Todos los IDs usan UUID para mejor performance en PostgreSQL
2. **Índices estratégicos**: Índices en campos de búsqueda frecuente
3. **Foreign keys**: Todas las relaciones tienen foreign keys definidas
4. **Cascadas apropiadas**: `onDelete` configurado según la lógica de negocio
5. **Campos únicos**: Email, phoneNumber, licensePlate, tripNumber tienen constraints únicos
6. **Índices compuestos**: Para búsquedas geográficas (latitude, longitude)

## 🚀 Próximos Pasos

1. Ejecutar migración: `yarn prisma migrate dev --name init`
2. Generar cliente: `yarn prisma generate`
3. Verificar relaciones: `yarn prisma studio`
4. Crear seed data si es necesario

