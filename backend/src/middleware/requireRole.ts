/**
 * Middleware para requerir un rol específico
 * Soporta múltiples roles por usuario
 */

import { Request, Response, NextFunction } from 'express'
import { UserRole } from '@prisma/client'

/**
 * Middleware que verifica que el usuario tenga uno de los roles especificados
 * Verifica tanto el rol principal como los roles adicionales
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticación requerida'
      })
      return
    }

    // Root admin tiene acceso a todo
    if (req.user.isRootAdmin) {
      next()
      return
    }

    // Obtener todos los roles del usuario (principal + adicionales)
    const userRoles = req.user.roles || [req.user.role]
    
    // Verificar si el usuario tiene al menos uno de los roles permitidos
    const hasRequiredRole = userRoles.some(role => 
      allowedRoles.includes(role as UserRole)
    )

    if (!hasRequiredRole) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      })
      return
    }

    next()
  }
}


