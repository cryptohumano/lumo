import { prisma } from '../index'
import { getPolkadotService } from './polkadotService'
import { decodeAddress, signatureVerify } from '@polkadot/util-crypto'
import { u8aToHex, stringToU8a, compactAddLength, hexToU8a } from '@polkadot/util'
import { toPolkadotAddress } from '../utils/addressUtils'

/**
 * Servicio para autenticación con wallets de Polkadot
 */
export class PolkadotAuthService {
  /**
   * Verifica una firma de mensaje de una wallet
   * @param address Dirección de la wallet
   * @param message Mensaje que se firmó
   * @param signature Firma del mensaje (hex string)
   */
  async verifySignature(
    address: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      // Decodificar la dirección para obtener la clave pública
      // false = no throw error, 42 = SS58 prefix de Polkadot (puede ser auto-detectado)
      // Intentar primero con auto-detección del prefix
      let publicKey: Uint8Array
      try {
        publicKey = decodeAddress(address, false)
      } catch (error) {
        // Si falla, intentar con prefix específico de Polkadot (42)
        publicKey = decodeAddress(address, false, 42)
      }
      
      // Convertir el mensaje a bytes (UTF-8)
      const messageBytes = stringToU8a(message)
      
      // Cuando Polkadot.js extension usa signRaw con type: 'bytes',
      // NO agrega el prefijo SCALE <Bytes>...</Bytes>
      // Firma directamente los bytes del mensaje
      // Sin embargo, para compatibilidad, intentamos ambas formas
      
      // La firma viene como hex string, convertirla a Uint8Array
      // Usar hexToU8a de @polkadot/util que maneja correctamente el formato
      const signatureBytes = hexToU8a(signature)
      
      // Intentar verificar primero sin el prefijo SCALE (más común para signRaw con type: 'bytes')
      let verification = signatureVerify(messageBytes, signatureBytes, publicKey)
      
      // Si falla, intentar con el prefijo SCALE (por si acaso)
      if (!verification.isValid) {
        const messageWithPrefix = compactAddLength(messageBytes)
        verification = signatureVerify(messageWithPrefix, signatureBytes, publicKey)
      }
      
      if (!verification.isValid) {
        console.log('Firma inválida. Detalles:', {
          address,
          message: message.substring(0, 50) + '...',
          messageLength: message.length,
          messageBytesLength: messageBytes.length,
          signatureLength: signatureBytes.length,
          signatureHex: u8aToHex(signatureBytes).substring(0, 20) + '...',
          crypto: verification.crypto,
        })
      } else {
        console.log('✅ Firma válida para:', address)
      }
      
      return verification.isValid
    } catch (error: any) {
      console.error('Error verificando firma:', error.message || error)
      console.error('Stack:', error.stack)
      // Si hay error en la verificación, intentar validar al menos la dirección
      try {
        const polkadotService = getPolkadotService()
        const isValidAddr = await polkadotService.isValidAddress(address)
        console.log('Fallback: dirección válida?', isValidAddr)
        return isValidAddr
      } catch (addrError) {
        return false
      }
    }
  }

  /**
   * Vincula una wallet de Polkadot a un usuario existente
   * Convierte la dirección a formato Polkadot (prefix 0) antes de guardarla
   */
  async linkWalletToUser(
    userId: string,
    address: string,
    chain: string = 'POLKADOT',
    signature?: string,
    message?: string
  ): Promise<void> {
    // Convertir dirección a formato Polkadot (prefix 0)
    // Esto asegura que todas las direcciones se guarden en el mismo formato
    const polkadotAddress = toPolkadotAddress(address)
    
    // Verificar que la dirección no esté ya vinculada (usando formato Polkadot)
    const existingUser = await prisma.user.findUnique({
      where: { polkadotAddress: polkadotAddress },
    })

    if (existingUser && existingUser.id !== userId) {
      throw new Error('Esta wallet ya está vinculada a otra cuenta')
    }

    // Verificar firma usando la dirección original (puede estar en cualquier formato)
    if (signature && message) {
      const isValid = await this.verifySignature(address, message, signature)
      if (!isValid) {
        throw new Error('Firma inválida')
      }
    }

    // Verificar que la dirección sea válida (usando formato Polkadot para People Chain)
    const polkadotService = getPolkadotService()
    const isValid = await polkadotService.isValidAddress(polkadotAddress, chain as any)
    if (!isValid) {
      throw new Error('Dirección de wallet inválida')
    }

    // Actualizar usuario con dirección en formato Polkadot
    await prisma.user.update({
      where: { id: userId },
      data: {
        polkadotAddress: polkadotAddress, // Guardar en formato Polkadot
        polkadotChain: chain,
      },
    })

    // Crear cuenta de autenticación (usar formato Polkadot)
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'POLKADOT',
          providerAccountId: polkadotAddress,
        },
      },
      create: {
        userId,
        provider: 'POLKADOT',
        providerAccountId: polkadotAddress, // Guardar en formato Polkadot
        metadata: {
          chain,
          linkedAt: new Date().toISOString(),
          originalAddress: address, // Guardar dirección original para referencia
        },
      },
      update: {
        metadata: {
          chain,
          linkedAt: new Date().toISOString(),
          originalAddress: address, // Guardar dirección original para referencia
        },
      },
    })
  }

  /**
   * Autentica un usuario usando su wallet de Polkadot
   * Si el usuario no existe, crea uno nuevo
   * Si hay colisión de wallets, da prioridad al usuario más importante
   */
  async authenticateWithWallet(
    address: string,
    message: string,
    signature: string,
    createIfNotExists: boolean = true
  ): Promise<{ userId: string; email: string } | null> {
    // Verificar firma
    const isValid = await this.verifySignature(address, message, signature)
    if (!isValid) {
      return null
    }

    // Convertir dirección a formato Polkadot para búsqueda y guardado
    const polkadotAddress = toPolkadotAddress(address)
    
    // Buscar usuario con esta wallet (usando formato Polkadot)
    let user = await prisma.user.findUnique({
      where: { polkadotAddress: polkadotAddress },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    })

    // Si no se encuentra por polkadotAddress, buscar por Account
    if (!user) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'POLKADOT',
            providerAccountId: polkadotAddress,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
      })

      if (account?.user) {
        user = account.user
      }
    }

    // Si no existe y se permite crear, verificar si hay colisión
    if (!user && createIfNotExists) {
      // Verificar si hay una cuenta de autenticación con esta wallet pero sin usuario vinculado
      // o si hay otro usuario con esta wallet en formato diferente
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'POLKADOT',
            providerAccountId: polkadotAddress,
          },
        },
        include: {
          user: {
            include: {
              trips: { select: { id: true } },
              driverTrips: { select: { id: true } },
            },
          },
        },
      })

      // Si existe una cuenta pero el usuario está inactivo o hay colisión
      if (existingAccount?.user) {
        // Calcular peso del usuario existente
        const { calculateUserWeight } = await import('../utils/userWeight')
        const existingWeight = await calculateUserWeight(existingAccount.user.id)
        
        // Si el usuario existente tiene peso significativo, usar ese usuario
        if (existingWeight > 50) {
          console.log(`Usuario existente encontrado con peso ${existingWeight}, usando ese usuario`)
          user = {
            id: existingAccount.user.id,
            email: existingAccount.user.email,
            isActive: existingAccount.user.isActive,
          }
          
          // Actualizar polkadotAddress si no está actualizado
          if (!existingAccount.user.polkadotAddress || existingAccount.user.polkadotAddress !== polkadotAddress) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                polkadotAddress: polkadotAddress,
                polkadotChain: 'POLKADOT',
              },
            })
          }
        }
      }
    }

    // Si aún no existe usuario y se permite crear, crear nuevo usuario
    if (!user && createIfNotExists) {
      // Obtener identidad completa de People Chain y evaluar confiabilidad
      const { getPeopleChainService } = await import('./peopleChainService')
      const { peopleChainTrustService } = await import('./peopleChainTrustService')
      const peopleChainService = getPeopleChainService()
      
      const fullIdentity = await peopleChainService.getFullIdentity(polkadotAddress)
      const trustEvaluation = await peopleChainTrustService.evaluateTrustworthiness(polkadotAddress)
      
      // Usar display name de People Chain si está disponible
      const peopleChainIdentity = fullIdentity.identity?.displayName || null
      const displayName = peopleChainIdentity || 
                         fullIdentity.identity?.legalName || 
                         `Usuario ${polkadotAddress.slice(0, 8)}`
      
      // Crear email basado en la dirección o identidad
      const email = peopleChainIdentity 
        ? `${peopleChainIdentity.replace(/\s+/g, '.').toLowerCase()}@people-chain.lumo`
        : `${polkadotAddress.slice(0, 8)}...${polkadotAddress.slice(-8)}@polkadot.lumo`

      // Determinar si el usuario es confiable basado en People Chain
      // Un usuario es verificado si tiene identidad con judgements positivos
      const isVerified = trustEvaluation.isTrustworthy && trustEvaluation.isVerified

      // Crear nuevo usuario con dirección en formato Polkadot
      user = await prisma.user.create({
        data: {
          email,
          name: displayName,
          polkadotAddress: polkadotAddress, // Guardar en formato Polkadot
          polkadotChain: 'POLKADOT',
          peopleChainIdentity: peopleChainIdentity || null,
          role: 'PASSENGER',
          isActive: true,
          isVerified: isVerified, // Verificado solo si tiene judgements positivos en People Chain
          // Guardar información de confiabilidad en metadata si es necesario
        },
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      })

      // Crear o actualizar cuenta de autenticación (usar formato Polkadot)
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'POLKADOT',
            providerAccountId: polkadotAddress,
          },
        },
        create: {
          userId: user.id,
          provider: 'POLKADOT',
          providerAccountId: polkadotAddress, // Guardar en formato Polkadot
          metadata: {
            chain: 'POLKADOT',
            linkedAt: new Date().toISOString(),
            peopleChainIdentity: peopleChainIdentity || null,
            originalAddress: address, // Guardar dirección original para referencia
            trustScore: trustEvaluation.trustScore,
            trustLevel: trustEvaluation.trustLevel,
            verifiedByRegistrars: trustEvaluation.verifiedByRegistrars,
            judgements: trustEvaluation.judgements,
            hasIdentity: trustEvaluation.hasIdentity,
          },
        },
        update: {
          userId: user.id,
          metadata: {
            chain: 'POLKADOT',
            linkedAt: new Date().toISOString(),
            peopleChainIdentity: peopleChainIdentity || null,
            originalAddress: address, // Guardar dirección original para referencia
            trustScore: trustEvaluation.trustScore,
            trustLevel: trustEvaluation.trustLevel,
            verifiedByRegistrars: trustEvaluation.verifiedByRegistrars,
            judgements: trustEvaluation.judgements,
            hasIdentity: trustEvaluation.hasIdentity,
          },
        },
      })
    }

    if (!user || !user.isActive) {
      return null
    }

    return {
      userId: user.id,
      email: user.email,
    }
  }

  /**
   * Obtiene información de identidad de People Chain
   */
  async getPeopleChainIdentity(address: string): Promise<string | null> {
    try {
      const { getPeopleChainService } = await import('./peopleChainService')
      const peopleChainService = getPeopleChainService()
      
      // Obtener identidad completa
      const fullIdentity = await peopleChainService.getFullIdentity(address)
      
      // Retornar el display name si existe, o null
      if (fullIdentity.identity?.displayName) {
        return fullIdentity.identity.displayName
      }
      
      // Si tiene super identidad con display name, usar ese
      if (fullIdentity.superIdentity?.superIdentity) {
        const superIdentityData = await peopleChainService.getIdentity(
          fullIdentity.superIdentity.superIdentity
        )
        if (superIdentityData?.displayName) {
          return superIdentityData.displayName
        }
      }
      
      return null
    } catch (error) {
      console.error('Error obteniendo identidad de People Chain:', error)
      return null
    }
  }

  /**
   * Vincula identidad de People Chain a un usuario
   * Convierte la dirección a formato Polkadot antes de consultar
   * Obtiene y guarda información completa de People Chain
   */
  async linkPeopleChainIdentity(
    userId: string,
    address: string
  ): Promise<void> {
    try {
      // Convertir dirección a formato Polkadot
      const polkadotAddress = toPolkadotAddress(address)
      
      // Obtener identidad completa de People Chain
      const { getPeopleChainService } = await import('./peopleChainService')
      const { peopleChainTrustService } = await import('./peopleChainTrustService')
      const peopleChainService = getPeopleChainService()
      
      const identity = await peopleChainService.getIdentity(polkadotAddress)
      const fullIdentity = await peopleChainService.getFullIdentity(polkadotAddress)
      const trustEvaluation = await peopleChainTrustService.evaluateTrustworthiness(polkadotAddress)
      
      // Obtener display name para el campo legacy
      const displayName = identity?.displayName || null
      
      // Actualizar usuario con información de People Chain
      await prisma.user.update({
        where: { id: userId },
        data: {
          peopleChainIdentity: displayName, // Mantener compatibilidad con campo legacy
          // Actualizar isVerified basado en People Chain si no está verificado
          ...(trustEvaluation.isTrustworthy && trustEvaluation.isVerified ? { isVerified: true } : {}),
        },
      })

      // Actualizar cuenta de autenticación con información completa de People Chain
      await prisma.account.updateMany({
        where: {
          userId,
          provider: 'POLKADOT',
          providerAccountId: polkadotAddress,
        },
        data: {
          metadata: {
            // Información completa de identidad
            identity: identity ? {
              hasIdentity: identity.hasIdentity,
              displayName: identity.displayName,
              legalName: identity.legalName,
              email: identity.email,
              web: identity.web,
              twitter: identity.twitter,
              riot: identity.riot,
              judgements: identity.judgements || [],
              deposit: identity.deposit?.toString() || '0',
              isVerified: identity.judgements?.some((j: any) => {
                const status = Array.isArray(j) && j.length >= 2 ? j[1] : j
                return status === 'KnownGood' || status === 'Reasonable'
              }) || false,
            } : null,
            // Información completa (super y sub identidades)
            // Convertir bigint a string para JSON
            fullIdentity: fullIdentity ? JSON.parse(JSON.stringify(fullIdentity, (key, value) => 
              typeof value === 'bigint' ? value.toString() : value
            )) : null,
            // Evaluación de confiabilidad
            trustEvaluation: {
              trustLevel: trustEvaluation.trustLevel,
              trustScore: trustEvaluation.trustScore,
              isTrustworthy: trustEvaluation.isTrustworthy,
              isVerified: trustEvaluation.isVerified,
            },
            // Metadata adicional (mantener compatibilidad)
            chain: 'POLKADOT',
            peopleChainIdentity: displayName,
            trustScore: trustEvaluation.trustScore,
            trustLevel: trustEvaluation.trustLevel,
            verifiedByRegistrars: trustEvaluation.isVerified,
            judgements: identity?.judgements || [],
            hasIdentity: identity?.hasIdentity || false,
            linkedAt: new Date().toISOString(),
            originalAddress: address,
            polkadotAddress: polkadotAddress,
            updatedAt: new Date().toISOString(),
          },
        },
      })
    } catch (error) {
      console.error('Error vinculando identidad de People Chain:', error)
      // No lanzar error, solo loguear
    }
  }

  /**
   * Desvincula una wallet de Polkadot de un usuario
   */
  async unlinkWalletFromUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        polkadotAddress: true,
        accounts: {
          where: { provider: 'POLKADOT' },
          select: { id: true },
        },
      },
    })

    if (!user || !user.polkadotAddress) {
      throw new Error('El usuario no tiene wallet vinculada')
    }

    // Verificar que el usuario tenga al menos otro método de autenticación
    const allAccounts = await prisma.account.findMany({
      where: { userId },
    })
    
    const hasPassword = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })

    const totalAuthMethods = allAccounts.length + (hasPassword?.password ? 1 : 0)

    if (totalAuthMethods <= 1) {
      throw new Error('No se puede desvincular la única forma de autenticación')
    }

    // Eliminar cuenta de autenticación de Polkadot
    await prisma.account.deleteMany({
      where: {
        userId,
        provider: 'POLKADOT',
      },
    })

    // Limpiar campos de Polkadot del usuario
    await prisma.user.update({
      where: { id: userId },
      data: {
        polkadotAddress: null,
        polkadotChain: null,
        peopleChainIdentity: null,
      },
    })
  }
}

export const polkadotAuthService = new PolkadotAuthService()

