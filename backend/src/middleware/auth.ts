/**
 * Middleware de autenticación
 * Verifica que el usuario esté autenticado y extrae información del JWT
 */

import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Payload del JWT
 */
export interface JWTPayload {
  userId: string
  email?: string
  role?: string
  type?: string
  iat?: number
  exp?: number
}

/**
 * Extensión de Request para incluir información del usuario autenticado
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string // Rol principal (para compatibilidad)
        roles: string[] // Todos los roles del usuario (incluyendo el principal)
        isRootAdmin?: boolean // Flag de root admin
      }
    }
  }
}

/**
 * Middleware de autenticación
 * Verifica el token JWT y agrega información del usuario a req.user
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token de autenticación requerido'
      })
      return
    }

    const token = authHeader.substring(7) // Remover "Bearer "

    // Verificar y decodificar token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET no está configurado')
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error de configuración del servidor'
      })
      return
    }

    let decoded: JWTPayload
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload
    } catch (error) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido o expirado'
      })
      return
    }

    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        activeRole: true,
        isActive: true,
        isRootAdmin: true,
        userRoles: {
          select: {
            role: true
          }
        }
      }
    })

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuario no encontrado'
      })
      return
    }

    if (!user.isActive) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Usuario inactivo'
      })
      return
    }

    // Obtener todos los roles del usuario (principal + adicionales)
    // Si es root admin, automáticamente incluir ADMIN
    const allRoles = [
      user.role,
      ...user.userRoles.map(ur => ur.role),
      ...(user.isRootAdmin ? ['ADMIN' as const] : [])
    ].filter((role, index, self) => self.indexOf(role) === index) // Eliminar duplicados

    // Usar activeRole si está definido, sino usar el rol principal
    const effectiveRole = user.activeRole || user.role

    // Agregar información del usuario a la request
    req.user = {
      id: user.id,
      email: user.email,
      role: effectiveRole, // Rol activo o principal (para compatibilidad)
      roles: allRoles, // Todos los roles
      isRootAdmin: user.isRootAdmin // Flag de root admin
    }

    next()
  } catch (error) {
    console.error('Error en middleware de autenticación:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error al verificar autenticación'
    })
  }
}

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, pero agrega req.user si existe
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No hay token, continuar sin autenticación
      next()
      return
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      next()
      return
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          userRoles: {
            select: {
              role: true
            }
          }
        }
      })

      if (user && user.isActive) {
        // Obtener todos los roles del usuario
        const allRoles = [
          user.role,
          ...user.userRoles.map(ur => ur.role)
        ].filter((role, index, self) => self.indexOf(role) === index)

        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          roles: allRoles
        }
      }
    } catch (error) {
      // Token inválido, continuar sin autenticación
    }

    next()
  } catch (error) {
    next()
  }
}

