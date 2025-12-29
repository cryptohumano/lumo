/**
 * Tipos y definiciones para el sistema de permisos
 */

import { UserRole } from '@prisma/client'

/**
 * Recursos del sistema que pueden tener permisos
 */
export enum Resource {
  // Perfiles
  PROFILE = 'profile',
  USER = 'user',
  
  // Viajes y transporte
  TRIP = 'trip',           // Viajes regulares (cortos) - para DRIVER
  RIDE = 'ride',
  EXPERIENCE = 'experience', // Experiencias de larga duración/tours - para HOST
  RESERVATION = 'reservation', // Reservas de experiencias
  
  // Financiero
  PAYMENT = 'payment',
  TRANSACTION = 'transaction',
  
  // Contenido
  REVIEW = 'review',
  RATING = 'rating',
  
  // Sistema
  REPORT = 'report',
  CONFIG = 'config',
  LOG = 'log',
}

/**
 * Acciones que se pueden realizar sobre recursos
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Acción especial que incluye todas las anteriores
}

/**
 * Tipo de permiso: permite o deniega
 */
export type PermissionType = 'allow' | 'deny'

/**
 * Definición de un permiso
 */
export interface Permission {
  resource: Resource
  action: Action | Action[]
  type: PermissionType
}

/**
 * Matriz de permisos por rol
 * Define qué puede hacer cada rol en el sistema
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // PASSENGER: Puede gestionar sus propios viajes y reservas de experiencias
  PASSENGER: [
    { resource: Resource.PROFILE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.TRIP, action: [Action.CREATE, Action.READ], type: 'allow' },
    { resource: Resource.EXPERIENCE, action: Action.READ, type: 'allow' }, // Ver experiencias disponibles
    { resource: Resource.RESERVATION, action: [Action.CREATE, Action.READ, Action.UPDATE], type: 'allow' },
    { resource: Resource.PAYMENT, action: Action.READ, type: 'allow' },
    { resource: Resource.REVIEW, action: Action.CREATE, type: 'allow' },
  ],

  // DRIVER: Puede gestionar viajes que acepta
  DRIVER: [
    { resource: Resource.PROFILE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.TRIP, action: [Action.READ, Action.UPDATE], type: 'allow' },
    { resource: Resource.PAYMENT, action: Action.READ, type: 'allow' },
    { resource: Resource.REVIEW, action: Action.CREATE, type: 'allow' },
  ],

  // HOST: Puede gestionar experiencias de transporte de larga duración y reservas
  HOST: [
    { resource: Resource.PROFILE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.EXPERIENCE, action: Action.MANAGE, type: 'allow' }, // Crear y gestionar experiencias/tours
    { resource: Resource.RESERVATION, action: [Action.READ, Action.UPDATE], type: 'allow' }, // Reservas de sus experiencias
    { resource: Resource.PAYMENT, action: Action.READ, type: 'allow' },
    { resource: Resource.REVIEW, action: Action.CREATE, type: 'allow' },
  ],

  // DISPATCHER: Puede gestionar viajes y ver información de usuarios
  DISPATCHER: [
    { resource: Resource.PROFILE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.USER, action: Action.READ, type: 'allow' },
    { resource: Resource.TRIP, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.REPORT, action: Action.READ, type: 'allow' },
  ],

  // SUPPORT: Puede ver y gestionar viajes/reservas, crear reembolsos
  SUPPORT: [
    { resource: Resource.PROFILE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.USER, action: Action.READ, type: 'allow' },
    { resource: Resource.TRIP, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.RESERVATION, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.PAYMENT, action: [Action.READ, Action.UPDATE], type: 'allow' },
    { resource: Resource.REPORT, action: Action.READ, type: 'allow' },
  ],

  // MODERATOR: Puede moderar contenido y usuarios
  MODERATOR: [
    { resource: Resource.PROFILE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.USER, action: [Action.READ, Action.UPDATE], type: 'allow' },
    { resource: Resource.REVIEW, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.REPORT, action: Action.READ, type: 'allow' },
  ],

  // ADMIN: Acceso completo
  ADMIN: [
    { resource: Resource.PROFILE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.USER, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.TRIP, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.EXPERIENCE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.RESERVATION, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.PAYMENT, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.REVIEW, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.REPORT, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.CONFIG, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.LOG, action: Action.READ, type: 'allow' },
  ],

  // OPERATOR (deprecado): Mismo que DISPATCHER
  OPERATOR: [
    { resource: Resource.PROFILE, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.USER, action: Action.READ, type: 'allow' },
    { resource: Resource.TRIP, action: Action.MANAGE, type: 'allow' },
    { resource: Resource.REPORT, action: Action.READ, type: 'allow' },
  ],
}

/**
 * Verifica si un rol tiene permiso para realizar una acción sobre un recurso
 */
export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []
  
  for (const permission of permissions) {
    if (permission.resource !== resource) continue
    
    // Si el permiso es de tipo 'deny', retornar false
    if (permission.type === 'deny') return false
    
    // Si el permiso es de tipo 'allow'
    if (permission.type === 'allow') {
      // Si la acción es MANAGE, permite todo
      if (permission.action === Action.MANAGE) return true
      
      // Si la acción es un array, verificar si incluye la acción solicitada
      if (Array.isArray(permission.action)) {
        if (permission.action.includes(action)) return true
      }
      
      // Si la acción coincide exactamente
      if (permission.action === action) return true
    }
  }
  
  // Por defecto, no tiene permiso
  return false
}

/**
 * Verifica si un rol tiene al menos uno de los permisos requeridos
 */
export function hasAnyPermission(
  role: UserRole,
  requiredPermissions: Array<{ resource: Resource; action: Action }>
): boolean {
  return requiredPermissions.some(({ resource, action }) =>
    hasPermission(role, resource, action)
  )
}

/**
 * Verifica si un rol tiene todos los permisos requeridos
 */
export function hasAllPermissions(
  role: UserRole,
  requiredPermissions: Array<{ resource: Resource; action: Action }>
): boolean {
  return requiredPermissions.every(({ resource, action }) =>
    hasPermission(role, resource, action)
  )
}

