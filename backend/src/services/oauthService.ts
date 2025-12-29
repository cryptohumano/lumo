/**
 * Servicio para manejo de OAuth (Google, Facebook, etc.)
 */

import { PrismaClient, AuthProvider, User } from '@prisma/client'
import * as jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export interface OAuthUserData {
  provider: AuthProvider
  providerAccountId: string
  email: string
  name: string
  avatar?: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  idToken?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: Omit<User, 'password'>
}

/**
 * Busca o crea un usuario a partir de datos OAuth
 */
export async function findOrCreateOAuthUser(
  data: OAuthUserData
): Promise<AuthTokens> {
  // Buscar cuenta existente por provider y providerAccountId
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: data.provider,
        providerAccountId: data.providerAccountId
      }
    },
    include: {
      user: true
    }
  })

  let user: User

  if (existingAccount) {
    // Usuario ya existe, actualizar tokens
    user = existingAccount.user

    // Actualizar tokens de la cuenta
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: data.accessToken, // TODO: Encriptar con FHE/AES
        refreshToken: data.refreshToken, // TODO: Encriptar con FHE/AES
        expiresAt: data.expiresAt,
        idToken: data.idToken, // TODO: Encriptar con FHE/AES
        updatedAt: new Date()
      }
    })
  } else {
    // Buscar usuario por email (puede que ya tenga cuenta con email/password)
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      // Usuario existe con email/password, vincular cuenta OAuth
      user = existingUser

      await prisma.account.create({
        data: {
          userId: user.id,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          accessToken: data.accessToken, // TODO: Encriptar con FHE/AES
          refreshToken: data.refreshToken, // TODO: Encriptar con FHE/AES
          expiresAt: data.expiresAt,
          idToken: data.idToken, // TODO: Encriptar con FHE/AES
          metadata: {
            avatar: data.avatar
          }
        }
      })

      // Actualizar avatar si no tiene uno
      if (!user.avatar && data.avatar) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatar: data.avatar }
        })
        user.avatar = data.avatar
      }
    } else {
      // Crear nuevo usuario
      user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          avatar: data.avatar,
          password: null, // No tiene password, solo OAuth
          isEmailVerified: true, // OAuth providers verifican el email
          accounts: {
            create: {
              provider: data.provider,
              providerAccountId: data.providerAccountId,
              accessToken: data.accessToken, // TODO: Encriptar con FHE/AES
              refreshToken: data.refreshToken, // TODO: Encriptar con FHE/AES
              expiresAt: data.expiresAt,
              idToken: data.idToken, // TODO: Encriptar con FHE/AES
              metadata: {
                avatar: data.avatar
              }
            }
          }
        }
      })
    }
  }

  // Generar tokens JWT propios del sistema
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  )

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' } as jwt.SignOptions
  )

  // Guardar refresh token en la base de datos
  await prisma.token.create({
    data: {
      userId: user.id,
      token: refreshToken,
      type: 'REFRESH_TOKEN',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    }
  })

  // Retornar usuario sin password
  const { password, ...userWithoutPassword } = user

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword
  }
}

/**
 * Vincula una cuenta OAuth adicional a un usuario existente
 */
export async function linkOAuthAccount(
  userId: string,
  data: OAuthUserData
): Promise<void> {
  // Verificar que no existe ya esta cuenta
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: data.provider,
        providerAccountId: data.providerAccountId
      }
    }
  })

  if (existingAccount) {
    throw new Error('Esta cuenta OAuth ya está vinculada a otro usuario')
  }

  // Crear cuenta vinculada
  await prisma.account.create({
    data: {
      userId,
      provider: data.provider,
      providerAccountId: data.providerAccountId,
      accessToken: data.accessToken, // TODO: Encriptar con FHE/AES
      refreshToken: data.refreshToken, // TODO: Encriptar con FHE/AES
      expiresAt: data.expiresAt,
      idToken: data.idToken, // TODO: Encriptar con FHE/AES
      metadata: {
        avatar: data.avatar
      }
    }
  })
}

/**
 * Desvincula una cuenta OAuth de un usuario
 * Nota: No se puede desvincular si es la única forma de autenticación
 */
export async function unlinkOAuthAccount(
  userId: string,
  provider: AuthProvider
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true
    }
  })

  if (!user) {
    throw new Error('Usuario no encontrado')
  }

  // Verificar que no sea la única cuenta
  if (user.accounts.length === 1 && !user.password) {
    throw new Error('No se puede desvincular la única cuenta de autenticación')
  }

  // Eliminar cuenta
  await prisma.account.deleteMany({
    where: {
      userId,
      provider
    }
  })
}

/**
 * Obtiene todas las cuentas vinculadas de un usuario
 */
export async function getUserAccounts(userId: string) {
  return await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      createdAt: true,
      // No retornar tokens por seguridad
    }
  })
}

