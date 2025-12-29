# Sistema de Roles y Permisos - Operations Platform

## 🎯 Visión General

Sistema de roles y permisos diseñado para una plataforma de transporte especializada, donde los usuarios pueden ser:
- **Clientes** (PASSENGER): Solicitan servicios de transporte
- **Proveedores de servicios cortos** (DRIVER): Conductores para viajes regulares tipo Uber
- **Proveedores de servicios largos** (HOST): Chofers privados para experiencias de larga duración, tours y experiencias on/off road

## 👥 Roles del Sistema

### 1. **PASSENGER** (Pasajero/Cliente)
**Descripción**: Usuario que solicita servicios de transporte o alojamiento.

**Permisos**:
- ✅ Crear solicitudes de viaje/reserva
- ✅ Ver sus propios viajes/reservas
- ✅ Cancelar sus propias reservas (con restricciones de tiempo)
- ✅ Calificar y comentar servicios recibidos
- ✅ Gestionar su perfil personal
- ✅ Ver historial de pagos
- ❌ No puede aceptar viajes/reservas de otros
- ❌ No puede ver información de otros usuarios
- ❌ No puede gestionar propiedades/vehículos

**Casos de uso**:
- Solicitar un viaje desde A hasta B
- Reservar un alojamiento
- Ver estado de su viaje/reserva en tiempo real
- Pagar por servicios recibidos

---

### 2. **DRIVER** (Conductor Regular)
**Descripción**: Usuario que ofrece servicios de transporte regulares (viajes cortos, tipo Uber). Ideal para viajes urbanos, traslados al aeropuerto, y servicios puntuales.

**Permisos**:
- ✅ Ver solicitudes de viaje disponibles (viajes cortos/regulares)
- ✅ Aceptar/rechazar viajes regulares
- ✅ Ver detalles de viajes asignados
- ✅ Actualizar estado del viaje (en camino, en progreso, completado)
- ✅ Gestionar su perfil y vehículo
- ✅ Ver sus ganancias y estadísticas
- ✅ Calificar pasajeros
- ❌ No puede crear viajes para sí mismo
- ❌ No puede ver información de otros conductores
- ❌ No puede gestionar experiencias/tours (eso es para HOST)

**Casos de uso**:
- Ver viajes disponibles en su zona (viajes cortos)
- Aceptar un viaje regular (ej: centro a aeropuerto)
- Navegar hacia el punto de recogida
- Marcar viaje como completado
- Ver ingresos del día/mes

---

### 3. **HOST** (Chofer Privado / Experiencias)
**Descripción**: Usuario que ofrece servicios de transporte de larga duración con experiencias on/off road. Actúa como chofer privado para viajes extendidos, tours y experiencias especializadas.

**Permisos**:
- ✅ Crear y gestionar experiencias/tours (viajes de larga duración)
- ✅ Ver solicitudes de experiencias
- ✅ Aceptar/rechazar experiencias
- ✅ Gestionar calendario de disponibilidad para experiencias
- ✅ Gestionar vehículos especializados (off-road, lujo, etc.)
- ✅ Ver estadísticas de experiencias completadas
- ✅ Calificar pasajeros
- ✅ Gestionar precios y paquetes de experiencias
- ✅ Crear itinerarios personalizados
- ❌ No puede aceptar viajes regulares (cortos) - esos son para DRIVER
- ❌ No puede ver información de otros hosts

**Casos de uso**:
- Crear una experiencia "Tour por el desierto de Atacama (3 días)"
- Publicar experiencia "Chofer privado Santiago-Valparaíso con paradas"
- Ver solicitudes de experiencias pendientes
- Aceptar/rechazar experiencias personalizadas
- Gestionar disponibilidad para tours programados
- Ver ingresos por experiencias
- Configurar paquetes todo-incluido (transporte + guía + alojamiento)

---

### 4. **DISPATCHER** (Despachador/Coordinador)
**Descripción**: Usuario que coordina y asigna viajes entre pasajeros y conductores.

**Permisos**:
- ✅ Ver todos los viajes (pendientes, en progreso, completados)
- ✅ Asignar viajes a conductores
- ✅ Reasignar viajes
- ✅ Ver información de conductores y pasajeros
- ✅ Cancelar viajes (con justificación)
- ✅ Ver estadísticas y reportes
- ✅ Gestionar zonas de servicio
- ❌ No puede crear propiedades
- ❌ No puede gestionar alojamientos
- ❌ No puede modificar configuraciones del sistema

**Casos de uso**:
- Ver panel de viajes pendientes
- Asignar viaje a conductor disponible
- Reasignar viaje si conductor no responde
- Ver mapa de conductores activos
- Generar reportes de operaciones

---

### 5. **SUPPORT** (Soporte al Cliente)
**Descripción**: Usuario que atiende consultas y problemas de clientes.

**Permisos**:
- ✅ Ver todos los viajes/reservas
- ✅ Ver información de usuarios (limitada)
- ✅ Cancelar viajes/reservas (con justificación)
- ✅ Crear reembolsos
- ✅ Ver historial de interacciones
- ✅ Responder tickets de soporte
- ✅ Ver reportes de problemas
- ❌ No puede modificar configuraciones del sistema
- ❌ No puede crear/eliminar usuarios
- ❌ No puede gestionar propiedades/vehículos

**Casos de uso**:
- Ver ticket de soporte de un pasajero
- Cancelar viaje y procesar reembolso
- Contactar a conductor/pasajero
- Ver historial de problemas de un usuario

---

### 6. **MODERATOR** (Moderador)
**Descripción**: Usuario que modera contenido y comportamiento de usuarios.

**Permisos**:
- ✅ Ver perfiles de usuarios
- ✅ Ver reseñas y comentarios
- ✅ Eliminar contenido inapropiado
- ✅ Suspender usuarios temporalmente
- ✅ Ver reportes de contenido
- ✅ Marcar usuarios como verificados
- ❌ No puede eliminar usuarios permanentemente
- ❌ No puede modificar configuraciones del sistema
- ❌ No puede gestionar pagos

**Casos de uso**:
- Revisar reseña reportada
- Suspender usuario por comportamiento inapropiado
- Eliminar comentario ofensivo
- Verificar identidad de usuario

---

### 7. **ADMIN** (Administrador)
**Descripción**: Acceso completo al sistema.

**Permisos**:
- ✅ **TODO** - Acceso completo a todas las funcionalidades
- ✅ Crear/editar/eliminar usuarios
- ✅ Modificar roles de usuarios
- ✅ Gestionar configuraciones del sistema
- ✅ Ver todas las estadísticas y reportes
- ✅ Gestionar experiencias y vehículos
- ✅ Gestionar pagos y reembolsos
- ✅ Acceso a logs del sistema
- ✅ Gestionar zonas de servicio
- ✅ Configurar tarifas y comisiones

**Casos de uso**:
- Crear nuevo usuario administrador
- Cambiar rol de usuario
- Ver dashboard completo del sistema
- Configurar tarifas de viaje
- Exportar datos para análisis

---

## 🔐 Matriz de Permisos por Recurso

| Recurso | PASSENGER | DRIVER | HOST | DISPATCHER | SUPPORT | MODERATOR | ADMIN |
|---------|-----------|--------|------|------------|---------|-----------|-------|
| **Perfil Propio** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| **Perfil Otros** | ❌ | ❌ | ❌ | ✅ R | ✅ R | ✅ R | ✅ CRUD |
| **Viajes Propios** | ✅ CRUD | ✅ CRUD | ❌ | ✅ CRUD | ✅ CRUD | ✅ R | ✅ CRUD |
| **Viajes Otros** | ❌ | ❌ | ❌ | ✅ CRUD | ✅ CRUD | ✅ R | ✅ CRUD |
| **Experiencias Propias** | ❌ | ❌ | ✅ CRUD | ❌ | ✅ R | ✅ R | ✅ CRUD |
| **Experiencias Otros** | ✅ R (públicas) | ✅ R (públicas) | ❌ | ❌ | ✅ R | ✅ R | ✅ CRUD |
| **Reservas Experiencias** | ✅ CRUD | ❌ | ✅ CRUD | ❌ | ✅ CRUD | ✅ R | ✅ CRUD |
| **Reservas Experiencias Otros** | ❌ | ❌ | ✅ R (sus experiencias) | ❌ | ✅ CRUD | ✅ R | ✅ CRUD |
| **Pagos Propios** | ✅ R | ✅ R | ✅ R | ❌ | ✅ R | ❌ | ✅ CRUD |
| **Pagos Otros** | ❌ | ❌ | ❌ | ❌ | ✅ CRUD | ❌ | ✅ CRUD |
| **Calificaciones** | ✅ C (recibidas) | ✅ C (recibidas) | ✅ C (recibidas) | ❌ | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| **Reportes** | ❌ | ❌ | ❌ | ✅ R | ✅ R | ✅ R | ✅ CRUD |
| **Usuarios** | ❌ | ❌ | ❌ | ✅ R | ✅ R | ✅ R | ✅ CRUD |
| **Configuración Sistema** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ CRUD |

**Leyenda**: C=Create, R=Read, U=Update, D=Delete

---

## 🏗️ Arquitectura de Implementación

### 1. **Roles en Base de Datos**
- Enum `UserRole` en Prisma Schema
- Campo `role` en modelo `User`
- Campo `isActive` para suspender usuarios

### 2. **Sistema de Permisos**
- Middleware de autenticación (verificar JWT)
- Middleware de autorización (verificar permisos)
- Funciones helper para verificar permisos específicos

### 3. **Validación en Rutas**
- Cada ruta valida permisos antes de ejecutar
- Respuestas de error claras cuando no hay permisos
- Logging de intentos de acceso no autorizados

### 4. **Frontend**
- Mostrar/ocultar funcionalidades según rol
- Redirección automática si no tiene permisos
- Mensajes claros de por qué no puede acceder

---

## 🔄 Roles Múltiples (Futuro)

**Nota**: Inicialmente un usuario tiene un solo rol. En el futuro se puede implementar:
- Usuario puede ser tanto PASSENGER como DRIVER
- Usuario puede ser tanto PASSENGER como HOST
- Sistema de "roles secundarios" o "permisos adicionales"

---

## 📝 Notas de Implementación

1. **Seguridad**: Todos los permisos se validan en el backend, nunca confiar solo en el frontend
2. **Auditoría**: Registrar todos los cambios de roles y accesos
3. **Escalabilidad**: Sistema diseñado para agregar nuevos roles fácilmente
4. **Flexibilidad**: Permisos granulares permiten ajustes sin cambiar código

---

## 🚀 Próximos Pasos

1. ✅ Actualizar enum `UserRole` en Prisma Schema
2. ✅ Crear middleware de autorización
3. ✅ Implementar funciones de verificación de permisos
4. ✅ Actualizar rutas con validación de permisos
5. ✅ Crear tests de permisos
6. ✅ Documentar API con permisos requeridos

