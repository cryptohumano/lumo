# Sistema de Notificaciones - Documentación Completa

## 📋 Resumen

Sistema completo de notificaciones que soporta todos los roles del sistema y diferentes canales de comunicación.

## 🎯 Características

- ✅ **Múltiples tipos de notificaciones** por rol y evento
- ✅ **Múltiples canales**: In-app, Email, Push, SMS, WhatsApp
- ✅ **Prioridades**: Low, Normal, High, Urgent
- ✅ **Estados**: Unread, Read, Archived, Deleted
- ✅ **Preferencias por usuario**: Control granular de notificaciones
- ✅ **Expiración**: Notificaciones temporales con fecha de expiración
- ✅ **Acciones**: Botones de acción en notificaciones

## 📊 Modelos

### 1. Notification

Modelo principal para almacenar notificaciones.

**Campos clave**:
- `id`: UUID (PK)
- `userId`: UUID (FK → User)
- `type`: NotificationType enum
- `title`: String
- `message`: String
- `data`: Json? (datos adicionales: tripId, reservationId, etc.)
- `priority`: NotificationPriority enum
- `status`: NotificationStatus enum
- `channels`: NotificationChannel[] (canales usados)
- `actionUrl`: String? (URL de acción)
- `actionLabel`: String? (etiqueta del botón)
- `expiresAt`: DateTime? (expiración)

**Índices**:
- `userId` - Búsqueda por usuario
- `type` - Filtrado por tipo
- `status` - Filtrado por estado
- `priority` - Ordenamiento por prioridad
- `createdAt` - Ordenamiento temporal
- `expiresAt` - Limpieza de expiradas

### 2. NotificationPreference

Preferencias de notificación por usuario, tipo y canal.

**Campos clave**:
- `id`: UUID (PK)
- `userId`: UUID (FK → User)
- `type`: NotificationType enum
- `channel`: NotificationChannel enum
- `enabled`: Boolean

**Unique constraint**: `[userId, type, channel]`

## 🔔 Tipos de Notificaciones por Rol

### PASSENGER (Pasajero)

#### Viajes
- `TRIP_CREATED` - Viaje creado exitosamente
- `TRIP_ASSIGNED` - Conductor asignado a tu viaje
- `TRIP_ACCEPTED` - Conductor aceptó tu viaje
- `TRIP_REJECTED` - Conductor rechazó tu viaje
- `TRIP_CANCELLED` - Viaje cancelado
- `TRIP_IN_PROGRESS` - Viaje en progreso
- `TRIP_DRIVER_ARRIVED` - Conductor llegó al punto de recogida
- `TRIP_COMPLETED` - Viaje completado
- `TRIP_REASSIGNED` - Viaje reasignado a otro conductor

#### Experiencias
- `RESERVATION_CREATED` - Reserva de experiencia creada
- `RESERVATION_CONFIRMED` - Reserva confirmada por el HOST
- `RESERVATION_CANCELLED` - Reserva cancelada
- `RESERVATION_IN_PROGRESS` - Experiencia en progreso
- `RESERVATION_COMPLETED` - Experiencia completada
- `EXPERIENCE_REMINDER` - Recordatorio de experiencia próxima

#### Pagos
- `PAYMENT_PENDING` - Pago pendiente
- `PAYMENT_PROCESSING` - Pago procesando
- `PAYMENT_COMPLETED` - Pago completado
- `PAYMENT_FAILED` - Pago fallido
- `PAYMENT_REFUNDED` - Pago reembolsado

#### Reseñas
- `REVIEW_APPROVED` - Tu reseña fue aprobada
- `REVIEW_REJECTED` - Tu reseña fue rechazada

#### Soporte
- `SUPPORT_TICKET_CREATED` - Ticket de soporte creado
- `SUPPORT_TICKET_UPDATED` - Ticket actualizado
- `SUPPORT_TICKET_RESOLVED` - Ticket resuelto
- `REFUND_REQUESTED` - Reembolso solicitado
- `REFUND_APPROVED` - Reembolso aprobado
- `REFUND_REJECTED` - Reembolso rechazado

---

### DRIVER (Conductor)

#### Viajes
- `TRIP_AVAILABLE` - Nuevo viaje disponible en tu zona
- `TRIP_ASSIGNED` - Viaje asignado a ti
- `TRIP_ACCEPTED` - Viaje aceptado exitosamente
- `TRIP_REJECTED` - Viaje rechazado
- `TRIP_CANCELLED` - Viaje cancelado por pasajero
- `TRIP_IN_PROGRESS` - Viaje en progreso
- `TRIP_COMPLETED` - Viaje completado
- `TRIP_REASSIGNED` - Viaje reasignado a otro conductor

#### Pagos
- `PAYMENT_RECEIVED` - Pago recibido por viaje
- `PAYMENT_REFUNDED` - Pago reembolsado

#### Reseñas
- `REVIEW_RECEIVED` - Nueva reseña recibida
- `REVIEW_APPROVED` - Reseña aprobada y visible

#### Vehículos
- `VEHICLE_VERIFIED` - Vehículo verificado
- `VEHICLE_REJECTED` - Vehículo rechazado
- `VEHICLE_EXPIRING` - Documentos del vehículo por expirar

---

### HOST (Chofer Privado)

#### Experiencias
- `EXPERIENCE_CREATED` - Experiencia creada exitosamente
- `RESERVATION_CREATED` - Nueva reserva de experiencia
- `RESERVATION_CONFIRMED` - Reserva confirmada
- `RESERVATION_CANCELLED` - Reserva cancelada
- `RESERVATION_IN_PROGRESS` - Experiencia en progreso
- `RESERVATION_COMPLETED` - Experiencia completada
- `EXPERIENCE_REMINDER` - Recordatorio de experiencia próxima

#### Pagos
- `PAYMENT_RECEIVED` - Pago recibido por experiencia
- `PAYMENT_REFUNDED` - Pago reembolsado

#### Reseñas
- `REVIEW_RECEIVED` - Nueva reseña recibida
- `REVIEW_APPROVED` - Reseña aprobada y visible

#### Vehículos
- `VEHICLE_VERIFIED` - Vehículo verificado
- `VEHICLE_REJECTED` - Vehículo rechazado
- `VEHICLE_EXPIRING` - Documentos del vehículo por expirar

---

### DISPATCHER (Despachador)

#### Viajes
- `TRIP_UNASSIGNED` - Viaje sin conductor asignado
- `TRIP_CANCELLED` - Viaje cancelado
- `TRIP_REASSIGNED` - Viaje reasignado
- `DRIVER_UNAVAILABLE` - Conductor no disponible
- `HIGH_DEMAND` - Alta demanda en zona específica

#### Sistema
- `SYSTEM_ALERT` - Alerta del sistema

---

### SUPPORT (Soporte)

#### Tickets
- `SUPPORT_TICKET_CREATED` - Nuevo ticket creado
- `SUPPORT_TICKET_UPDATED` - Ticket actualizado
- `SUPPORT_TICKET_RESOLVED` - Ticket resuelto

#### Reembolsos
- `REFUND_REQUESTED` - Reembolso solicitado
- `REFUND_APPROVED` - Reembolso aprobado
- `REFUND_REJECTED` - Reembolso rechazado

---

### MODERATOR (Moderador)

#### Contenido
- `REVIEW_PENDING` - Reseña pendiente de moderación
- `REVIEW_REPORTED` - Reseña reportada
- `CONTENT_REPORTED` - Contenido reportado

#### Usuarios
- `USER_SUSPENDED` - Usuario suspendido
- `USER_VERIFIED` - Usuario verificado
- `USER_REJECTED` - Usuario rechazado

---

### ADMIN (Administrador)

#### Sistema
- `SYSTEM_MAINTENANCE` - Mantenimiento programado
- `SYSTEM_UPDATE` - Actualización del sistema
- `SECURITY_ALERT` - Alerta de seguridad
- `PERFORMANCE_ALERT` - Alerta de rendimiento

---

### GENERALES (Todos los roles)

- `WELCOME` - Bienvenida al sistema
- `PROMOTION` - Promoción disponible
- `ANNOUNCEMENT` - Anuncio general
- `REMINDER` - Recordatorio
- `NEW_FEATURE` - Nueva función disponible
- `PROFILE_UPDATED` - Perfil actualizado
- `EMAIL_VERIFIED` - Email verificado
- `ACCOUNT_LINKED` - Cuenta OAuth vinculada
- `ACCOUNT_UNLINKED` - Cuenta OAuth desvinculada
- `PASSWORD_CHANGED` - Contraseña cambiada
- `LOGIN_NEW_DEVICE` - Login desde nuevo dispositivo
- `LOGIN_SUSPICIOUS` - Login sospechoso

## 📱 Canales de Notificación

### IN_APP
- Notificaciones dentro de la aplicación
- Siempre activas (no se pueden desactivar)
- Badge con contador de no leídas

### EMAIL
- Notificaciones por correo electrónico
- Configurable por tipo de notificación
- Templates personalizados por tipo

### PUSH
- Notificaciones push para móviles
- Requiere permisos del usuario
- Configurable por tipo

### SMS
- Notificaciones por SMS
- Para notificaciones urgentes
- Costo adicional

### WHATSAPP
- Notificaciones por WhatsApp
- Integración con WhatsApp Business API
- Para notificaciones importantes

## 🎚️ Prioridades

### LOW
- Notificaciones informativas
- No requieren acción inmediata
- Ejemplo: `PROMOTION`, `NEW_FEATURE`

### NORMAL
- Notificaciones estándar
- Requieren atención pero no urgente
- Ejemplo: `TRIP_COMPLETED`, `REVIEW_RECEIVED`

### HIGH
- Notificaciones importantes
- Requieren atención pronto
- Ejemplo: `TRIP_ASSIGNED`, `PAYMENT_FAILED`

### URGENT
- Notificaciones críticas
- Requieren acción inmediata
- Ejemplo: `TRIP_CANCELLED`, `SECURITY_ALERT`

## 📝 Ejemplos de Uso

### Crear Notificación de Viaje Asignado

```typescript
await prisma.notification.create({
  data: {
    userId: passengerId,
    type: 'TRIP_ASSIGNED',
    title: 'Conductor asignado',
    message: 'Tu viaje ha sido asignado a Juan Pérez',
    priority: 'HIGH',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    data: {
      tripId: trip.id,
      driverId: driver.id,
      driverName: driver.name
    },
    actionUrl: `/trips/${trip.id}`,
    actionLabel: 'Ver viaje'
  }
})
```

### Crear Notificación de Pago Recibido

```typescript
await prisma.notification.create({
  data: {
    userId: driverId,
    type: 'PAYMENT_RECEIVED',
    title: 'Pago recibido',
    message: `Has recibido $${amount} por el viaje ${tripNumber}`,
    priority: 'NORMAL',
    channels: ['IN_APP', 'EMAIL'],
    data: {
      tripId: trip.id,
      amount: amount,
      currency: 'CLP'
    },
    actionUrl: `/payments/${paymentId}`,
    actionLabel: 'Ver detalles'
  }
})
```

### Crear Notificación General

```typescript
await prisma.notification.createMany({
  data: allUsers.map(userId => ({
    userId,
    type: 'ANNOUNCEMENT',
    title: 'Nueva función disponible',
    message: 'Ahora puedes reservar experiencias de larga duración',
    priority: 'LOW',
    channels: ['IN_APP'],
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
  }))
})
```

## ⚙️ Preferencias de Usuario

### Obtener Preferencias

```typescript
const preferences = await prisma.notificationPreference.findMany({
  where: { userId }
})
```

### Actualizar Preferencia

```typescript
await prisma.notificationPreference.upsert({
  where: {
    userId_type_channel: {
      userId,
      type: 'TRIP_ASSIGNED',
      channel: 'EMAIL'
    }
  },
  update: { enabled: false },
  create: {
    userId,
    type: 'TRIP_ASSIGNED',
    channel: 'EMAIL',
    enabled: false
  }
})
```

### Verificar si se debe enviar notificación

```typescript
async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel
): Promise<boolean> {
  const preference = await prisma.notificationPreference.findUnique({
    where: {
      userId_type_channel: {
        userId,
        type,
        channel
      }
    }
  })

  // Si no hay preferencia, usar default (true)
  return preference?.enabled ?? true
}
```

## 🔄 Flujo de Notificación

1. **Evento ocurre** (ej: viaje asignado)
2. **Crear notificación** en base de datos
3. **Verificar preferencias** del usuario
4. **Enviar por canales habilitados**:
   - IN_APP: Siempre (guardar en BD)
   - EMAIL: Si está habilitado
   - PUSH: Si está habilitado y tiene permisos
   - SMS: Si está habilitado y es urgente
   - WHATSAPP: Si está habilitado y es importante
5. **Actualizar estado** cuando se lee/archiva

## 🚀 Próximos Pasos

1. Crear servicio de notificaciones
2. Implementar envío por diferentes canales
3. Crear templates de email
4. Integrar con servicios de push (FCM, APNS)
5. Integrar con WhatsApp Business API
6. Crear dashboard de notificaciones
7. Implementar limpieza automática de notificaciones expiradas

