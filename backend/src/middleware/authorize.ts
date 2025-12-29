/**
 * Middleware de autorización
 * Verifica que el usuario tenga los permisos necesarios para realizar una acción
 */

import { Request, Response, NextFunction } from 'express'
import { UserRole } from '@prisma/client'
import { Resource, Action, hasPermission, hasAnyPermission, hasAllPermissions } from '../types/permissions'

/**
 * Opciones para el middleware de autorización
 */
export interface AuthorizeOptions {
  resource: Resource
  action: Action
  requireAll?: boolean // Si es true, requiere todos los permisos; si es false, requiere al menos uno
}

/**
 * Verifica si un usuario tiene permiso considerando todos sus roles
 */
function hasPermissionWithMultipleRoles(
  userRoles: string[],
  resource: Resource,
  action: Action
): boolean {
  return userRoles.some(role => 
    hasPermission(role as UserRole, resource, action)
  )
}

/**
 * Middleware de autorización simple
 * Verifica que el usuario tenga permiso para una acción sobre un recurso
 * Soporta múltiples roles por usuario
 */
export function authorize(resource: Resource, action: Action) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticación requerida'
      })
      return
    }

    // Obtener todos los roles del usuario (principal + adicionales)
    const userRoles = req.user.roles || [req.user.role]

    if (!hasPermissionWithMultipleRoles(userRoles, resource, action)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `No tienes permiso para ${action} ${resource}`
      })
      return
    }

    next()
  }
}

/**
 * Middleware de autorización con múltiples permisos
 * Verifica que el usuario tenga al menos uno de los permisos requeridos
 * Soporta múltiples roles por usuario
 */
export function authorizeAny(permissions: Array<{ resource: Resource; action: Action }>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticación requerida'
      })
      return
    }

    // Obtener todos los roles del usuario (principal + adicionales)
    const userRoles = req.user.roles || [req.user.role]

    // Verificar si alguno de los roles tiene al menos uno de los permisos
    const hasAny = userRoles.some(role => 
      hasAnyPermission(role as UserRole, permissions)
    )

    if (!hasAny) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes los permisos necesarios'
      })
      return
    }

    next()
  }
}

/**
 * Middleware de autorización que requiere todos los permisos
 * Soporta múltiples roles por usuario
 */
export function authorizeAll(permissions: Array<{ resource: Resource; action: Action }>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticación requerida'
      })
      return
    }

    // Obtener todos los roles del usuario (principal + adicionales)
    const userRoles = req.user.roles || [req.user.role]

    // Verificar si alguno de los roles tiene todos los permisos
    const hasAll = userRoles.some(role => 
      hasAllPermissions(role as UserRole, permissions)
    )

    if (!hasAll) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes todos los permisos necesarios'
      })
      return
    }

    next()
  }
}

/**
 * Middleware que verifica que el usuario tenga un rol específico
 * Soporta múltiples roles por usuario
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticación requerida'
      })
      return
    }

    // Obtener todos los roles del usuario (principal + adicionales)
    const userRoles = req.user.roles || [req.user.role]

    // Verificar si el usuario tiene al menos uno de los roles permitidos
    const hasRequiredRole = userRoles.some(role => 
      roles.includes(role as UserRole)
    )

    if (!hasRequiredRole) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Se requiere uno de los siguientes roles: ${roles.join(', ')}`
      })
      return
    }

    next()
  }
}

/**
 * Middleware que verifica que el usuario sea el propietario del recurso o tenga permisos
 * Útil para operaciones como "editar mi propio perfil" o "ver mi propio viaje"
 * Soporta múltiples roles por usuario
 */
export function authorizeOwnerOrPermission(
  getOwnerId: (req: Request) => string | null | Promise<string | null>,
  resource: Resource,
  action: Action
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticación requerida'
      })
      return
    }

    const ownerId = await getOwnerId(req)

    // Si es el propietario, permitir
    if (ownerId && ownerId === req.user.id) {
      next()
      return
    }

    // Si no es el propietario, verificar permisos con todos los roles
    const userRoles = req.user.roles || [req.user.role]
    if (!hasPermissionWithMultipleRoles(userRoles, resource, action)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes permiso para acceder a este recurso'
      })
      return
    }

    next()
  }
}

