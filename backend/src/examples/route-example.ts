/**
 * Ejemplo de uso de los middlewares de autenticación y autorización
 * Este archivo muestra cómo usar los middlewares en las rutas
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authorize, requireRole, authorizeOwnerOrPermission, authorizeAny } from '../middleware/authorize'
import { Resource, Action } from '../types/permissions'
import { UserRole } from '@prisma/client'

const router = Router()

// ============================================
// Ejemplo 1: Ruta pública (sin autenticación)
// ============================================
router.get('/public', (req, res) => {
  res.json({ message: 'Esta ruta es pública' })
})

// ============================================
// Ejemplo 2: Ruta protegida (requiere autenticación)
// ============================================
router.get('/profile', authenticate, (req, res) => {
  // req.user está disponible aquí
  res.json({
    message: 'Perfil del usuario',
    user: req.user
  })
})

// ============================================
// Ejemplo 3: Ruta con autorización simple
// Solo usuarios con permiso para leer perfiles
// ============================================
router.get('/users', 
  authenticate,
  authorize(Resource.USER, Action.READ),
  (req, res) => {
    res.json({ message: 'Lista de usuarios' })
  }
)

// ============================================
// Ejemplo 4: Ruta con múltiples permisos (cualquiera)
// Puede crear viajes O crear reservas
// ============================================
router.post('/bookings',
  authenticate,
  authorizeAny([
    { resource: Resource.TRIP, action: Action.CREATE },
    { resource: Resource.RESERVATION, action: Action.CREATE }
  ]),
  (req, res) => {
    res.json({ message: 'Reserva creada' })
  }
)

// ============================================
// Ejemplo 5: Ruta con rol específico
// Solo administradores pueden acceder
// ============================================
router.delete('/users/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  (req, res) => {
    res.json({ message: 'Usuario eliminado' })
  }
)

// ============================================
// Ejemplo 6: Ruta con múltiples roles
// Solo conductores o despachadores
// ============================================
router.get('/trips/available',
  authenticate,
  requireRole(UserRole.DRIVER, UserRole.DISPATCHER),
  (req, res) => {
    res.json({ message: 'Viajes disponibles' })
  }
)

// ============================================
// Ejemplo 7: Ruta con autorización de propietario
// Puede editar su propio perfil O tener permiso de editar usuarios
// ============================================
router.put('/users/:id',
  authenticate,
  authorizeOwnerOrPermission(
    async (req) => {
      // Obtener el ID del propietario del recurso
      const userId = req.params.id
      // Aquí podrías hacer una consulta a la BD si es necesario
      return userId
    },
    Resource.USER,
    Action.UPDATE
  ),
  (req, res) => {
    res.json({ message: 'Usuario actualizado' })
  }
)

// ============================================
// Ejemplo 8: Ruta para pasajeros (crear viaje)
// ============================================
router.post('/trips',
  authenticate,
  authorize(Resource.TRIP, Action.CREATE),
  (req, res) => {
    // Solo PASSENGER puede crear viajes
    res.json({ message: 'Viaje creado' })
  }
)

// ============================================
// Ejemplo 9: Ruta para conductores (aceptar viaje)
// ============================================
router.post('/trips/:id/accept',
  authenticate,
  requireRole(UserRole.DRIVER, UserRole.DISPATCHER),
  authorize(Resource.TRIP, Action.UPDATE),
  (req, res) => {
    res.json({ message: 'Viaje aceptado' })
  }
)

// ============================================
// Ejemplo 10: Ruta para hosts (crear experiencias de transporte)
// ============================================
router.post('/experiences',
  authenticate,
  requireRole(UserRole.HOST, UserRole.ADMIN),
  authorize(Resource.EXPERIENCE, Action.CREATE),
  (req, res) => {
    res.json({ message: 'Experiencia creada (ej: Tour de 3 días por el desierto)' })
  }
)

// ============================================
// Ejemplo 11: Ruta para soporte (ver todos los viajes)
// ============================================
router.get('/trips',
  authenticate,
  requireRole(UserRole.SUPPORT, UserRole.ADMIN, UserRole.DISPATCHER),
  authorize(Resource.TRIP, Action.READ),
  (req, res) => {
    res.json({ message: 'Lista de viajes' })
  }
)

// ============================================
// Ejemplo 12: Ruta para moderadores (moderar reseñas)
// ============================================
router.delete('/reviews/:id',
  authenticate,
  requireRole(UserRole.MODERATOR, UserRole.ADMIN),
  authorize(Resource.REVIEW, Action.DELETE),
  (req, res) => {
    res.json({ message: 'Reseña eliminada' })
  }
)

export default router

