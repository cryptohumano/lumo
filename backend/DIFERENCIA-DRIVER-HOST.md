# Diferencia entre DRIVER y HOST

## 🚗 DRIVER (Conductor Regular)

**Tipo de servicio**: Viajes cortos y regulares

**Características**:
- Viajes urbanos y traslados puntuales
- Distancias cortas a medianas (ej: centro a aeropuerto, barrio a barrio)
- Servicios bajo demanda (on-demand)
- Similar a Uber/Lyft
- Múltiples viajes por día
- Precio por kilómetro/tiempo

**Ejemplos de servicios**:
- Traslado al aeropuerto
- Viaje del centro a las afueras
- Servicio de taxi tradicional
- Viaje de emergencia

**Modelo de negocio**:
- Alta frecuencia de viajes
- Precios estándar por zona
- Disponibilidad inmediata
- Sin planificación previa

---

## 🏔️ HOST (Chofer Privado / Experiencias)

**Tipo de servicio**: Experiencias de transporte de larga duración

**Características**:
- Viajes de larga duración (días, semanas)
- Experiencias on/off road
- Servicios personalizados y planificados
- Chofer privado dedicado
- Tours y paquetes completos
- Vehículos especializados (4x4, lujo, etc.)

**Ejemplos de servicios**:
- Tour de 3 días por el desierto de Atacama
- Chofer privado Santiago-Valparaíso con paradas turísticas
- Experiencia off-road en la Patagonia (7 días)
- Servicio de chofer para viaje de negocios extendido
- Tour gastronómico con transporte incluido

**Modelo de negocio**:
- Baja frecuencia pero alto valor
- Precios personalizados por experiencia
- Requiere planificación y reserva previa
- Incluye servicios adicionales (guía, alojamiento, etc.)

---

## 📊 Comparación Rápida

| Aspecto | DRIVER | HOST |
|---------|--------|------|
| **Duración** | Corta (minutos/horas) | Larga (días/semanas) |
| **Tipo** | Regular, bajo demanda | Personalizado, planificado |
| **Frecuencia** | Múltiples viajes/día | Pocos viajes/mes |
| **Precio** | Estándar por zona | Personalizado por experiencia |
| **Vehículo** | Estándar | Especializado (4x4, lujo) |
| **Planificación** | Inmediata | Requiere reserva previa |
| **Servicios extra** | No | Sí (guía, alojamiento, etc.) |

---

## 🎯 Casos de Uso en la Plataforma

### Cuando usar DRIVER:
- Cliente necesita ir del punto A al B rápidamente
- Viaje urbano o traslado al aeropuerto
- Servicio bajo demanda
- Múltiples opciones de conductores disponibles

### Cuando usar HOST:
- Cliente quiere una experiencia completa
- Viaje de larga duración con múltiples paradas
- Necesita vehículo especializado (off-road, lujo)
- Requiere servicios adicionales (guía, planificación)
- Tour o experiencia turística

---

## 💡 Ejemplo Práctico

**Escenario**: Cliente quiere ir de Santiago a Valparaíso

**Opción DRIVER**:
- Viaje directo, 1.5 horas
- Precio: $50.000
- Conductor disponible en 5 minutos
- Solo transporte

**Opción HOST**:
- Tour completo con paradas en:
  - Viña del Mar
  - Casablanca (degustación de vinos)
  - Reñaca
- Duración: 1 día completo
- Precio: $200.000
- Incluye: Chofer privado, guía, degustaciones
- Requiere reserva con 24h de anticipación

---

## 🔐 Permisos en el Sistema

### DRIVER puede:
- Ver viajes regulares disponibles
- Aceptar viajes cortos
- Gestionar su vehículo estándar
- Ver estadísticas de viajes regulares

### HOST puede:
- Crear experiencias/tours personalizados
- Gestionar calendario de disponibilidad
- Aceptar reservas de experiencias
- Gestionar vehículos especializados
- Crear paquetes todo-incluido

### PASSENGER puede:
- Solicitar viajes regulares (DRIVER)
- Reservar experiencias (HOST)
- Ver ambos tipos de servicios disponibles

