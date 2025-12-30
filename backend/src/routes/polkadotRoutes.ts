/**
 * Rutas para integración con Polkadot
 * - Autenticación con wallets
 * - Pagos con Asset Hub
 * - Gestión de identidad en People Chain
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { polkadotAuthService } from '../services/polkadotAuthService'
import { polkadotPaymentService } from '../services/polkadotPaymentService'
import { getPolkadotService, ChainName, POLKADOT_CHAINS } from '../services/polkadotService'
import { prisma } from '../index'
import jwt from 'jsonwebtoken'
import { serializeBigInt } from '../utils/jsonSerialization'
import { generatePaymentQrCode } from '../utils/tripSecurity'

const router = Router()

/**
 * POST /api/polkadot/auth/verify-signature
 * Verifica una firma de wallet para autenticación
 */
router.post('/auth/verify-signature', async (req, res) => {
  try {
    const { address, message, signature } = req.body

    if (!address || !message || !signature) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Dirección, mensaje y firma son requeridos',
      })
    }

    // Intentar autenticar (creará usuario nuevo si no existe)
    const user = await polkadotAuthService.authenticateWithWallet(
      address,
      message,
      signature,
      true // createIfNotExists = true para permitir registro automático
    )

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firma inválida',
      })
    }

    // Generar JWT
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'JWT_SECRET no configurado',
      })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        activeRole: true,
        isRootAdmin: true,
        preferredCurrency: true,
        country: true,
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        polkadotAddress: true,
        polkadotChain: true,
        peopleChainIdentity: true,
        userRoles: {
          select: { role: true },
        },
      },
    })

    if (!dbUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Usuario no encontrado',
      })
    }

    const effectiveRole = dbUser.activeRole || dbUser.role
    const allRoles = [
      dbUser.role,
      ...dbUser.userRoles.map((ur) => ur.role),
      ...(dbUser.isRootAdmin ? ['ADMIN' as const] : []),
    ].filter((role, index, self) => self.indexOf(role) === index)

    // Usar el operador de aserción no-null ya que verificamos que JWT_SECRET existe
    const accessToken = jwt.sign(
      { userId: dbUser.id, email: dbUser.email, role: effectiveRole } as object,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    )

    const refreshToken = jwt.sign(
      { userId: dbUser.id, type: 'refresh' } as object,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' } as jwt.SignOptions
    )

    // Guardar refresh token
    await prisma.token.create({
      data: {
        userId: dbUser.id,
        token: refreshToken,
        type: 'REFRESH_TOKEN',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // Obtener identidad completa de People Chain si tiene wallet vinculada (opcional, no bloquea)
    let peopleChainIdentity = null
    if (dbUser.polkadotAddress) {
      try {
        const { getPeopleChainService } = await import('../services/peopleChainService')
        const peopleChainService = getPeopleChainService()
        const identity = await peopleChainService.getIdentity(dbUser.polkadotAddress)
        
        if (identity && identity.hasIdentity) {
          peopleChainIdentity = {
            hasIdentity: true,
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
          }
        } else {
          peopleChainIdentity = {
            hasIdentity: false,
          }
        }
      } catch (error: any) {
        console.error('Error obteniendo identidad de People Chain en login (no crítico):', error.message || error)
        // No bloqueamos el login si falla obtener la identidad
        peopleChainIdentity = {
          hasIdentity: false,
        }
      }
    }

    return res.json(serializeBigInt({
      accessToken,
      refreshToken,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        phone: dbUser.phone,
        avatar: dbUser.avatar,
        role: effectiveRole,
        activeRole: effectiveRole,
        roles: allRoles,
        preferredCurrency: dbUser.preferredCurrency,
        country: dbUser.country,
        isActive: dbUser.isActive,
        isVerified: dbUser.isVerified,
        isEmailVerified: dbUser.isEmailVerified,
        isRootAdmin: dbUser.isRootAdmin,
        polkadotAddress: dbUser.polkadotAddress,
        polkadotChain: dbUser.polkadotChain,
        peopleChainIdentity: dbUser.peopleChainIdentity, // Mantener compatibilidad
        peopleChainIdentityFull: peopleChainIdentity, // Nueva propiedad con identidad completa
        userRoles: dbUser.userRoles,
      },
    }))
  } catch (error: any) {
    console.error('Error en verificación de firma:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al verificar firma',
    })
  }
})

/**
 * POST /api/polkadot/auth/link-wallet
 * Vincula una wallet a un usuario autenticado
 */
router.post('/auth/link-wallet', authenticate, async (req, res) => {
  try {
    const { address, chain, signature, message } = req.body
    const userId = req.user!.id

    if (!address) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Dirección de wallet es requerida',
      })
    }

    if (!signature) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Firma de wallet es requerida',
      })
    }

    if (!message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Mensaje a firmar es requerido',
      })
    }

    await polkadotAuthService.linkWalletToUser(
      userId,
      address,
      chain || 'POLKADOT',
      signature,
      message
    )

    // Obtener la dirección en formato Polkadot (ya convertida por linkWalletToUser)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { polkadotAddress: true },
    })

    // Intentar vincular identidad de People Chain usando dirección en formato Polkadot
    if (user?.polkadotAddress) {
      await polkadotAuthService.linkPeopleChainIdentity(userId, user.polkadotAddress)
    }

    return res.json({
      message: 'Wallet vinculada exitosamente',
      address: user?.polkadotAddress || address, // Retornar dirección en formato Polkadot
      chain: chain || 'POLKADOT',
    })
  } catch (error: any) {
    console.error('Error vinculando wallet:', error)
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Error al vincular wallet',
    })
  }
})

/**
 * DELETE /api/polkadot/auth/unlink-wallet
 * Desvincula la wallet de Polkadot del usuario autenticado
 */
router.delete('/auth/unlink-wallet', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id

    await polkadotAuthService.unlinkWalletFromUser(userId)

    return res.json({
      message: 'Wallet desvinculada exitosamente',
    })
  } catch (error: any) {
    console.error('Error desvinculando wallet:', error)
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Error al desvincular wallet',
    })
  }
})

/**
 * GET /api/polkadot/people-chain/identity/:address
 * Obtiene la identidad básica de People Chain para una dirección
 */
router.get('/people-chain/identity/:address', authenticate, async (req, res) => {
  try {
    const { address } = req.params
    const { getPeopleChainService } = await import('../services/peopleChainService')
    const peopleChainService = getPeopleChainService()
    const identity = await peopleChainService.getIdentity(address)

    return res.json(serializeBigInt(identity || { hasIdentity: false }))
  } catch (error: any) {
    console.error('Error obteniendo identidad de People Chain:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener identidad',
    })
  }
})

/**
 * GET /api/polkadot/people-chain/identity/:address/full
 * Obtiene la identidad completa de People Chain para una dirección
 */
router.get('/people-chain/identity/:address/full', authenticate, async (req, res) => {
  try {
    const { address } = req.params
    const { getPeopleChainService } = await import('../services/peopleChainService')
    const peopleChainService = getPeopleChainService()
    const identity = await peopleChainService.getIdentity(address)

    if (!identity || !identity.hasIdentity) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No se encontró identidad en People Chain para esta dirección',
      })
    }

    return res.json(serializeBigInt({
      hasIdentity: true,
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
    }))
  } catch (error: any) {
    console.error('Error obteniendo identidad completa de People Chain:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener identidad',
    })
  }
})

/**
 * GET /api/polkadot/people-chain/identity/:address/verified
 * Verifica si una dirección tiene identidad verificada en People Chain
 */
router.get('/people-chain/identity/:address/verified', authenticate, async (req, res) => {
  try {
    const { address } = req.params
    const { getPeopleChainService } = await import('../services/peopleChainService')
    const peopleChainService = getPeopleChainService()
    const identity = await peopleChainService.getIdentity(address)

    const isVerified = identity?.judgements?.some((j: any) => {
      const status = Array.isArray(j) && j.length >= 2 ? j[1] : j
      return status === 'KnownGood' || status === 'Reasonable'
    }) || false

    return res.json({
      address,
      verified: isVerified && (identity?.hasIdentity || false),
    })
  } catch (error: any) {
    console.error('Error verificando identidad de People Chain:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al verificar identidad',
    })
  }
})

/**
 * GET /api/polkadot/people-chain/identity/:address/display-name
 * Obtiene solo el display name de People Chain para una dirección
 */
router.get('/people-chain/identity/:address/display-name', authenticate, async (req, res) => {
  try {
    const { address } = req.params
    const { getPeopleChainService } = await import('../services/peopleChainService')
    const peopleChainService = getPeopleChainService()
    const identity = await peopleChainService.getIdentity(address)

    return res.json({
      address,
      displayName: identity?.displayName || null,
    })
  } catch (error: any) {
    console.error('Error obteniendo display name de People Chain:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener display name',
    })
  }
})

/**
 * PUT /api/polkadot/auth/privacy-settings
 * Actualiza las preferencias de privacidad de People Chain del usuario
 */
router.put('/auth/privacy-settings', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id
    const {
      showDisplayName,
      showLegalName,
      showEmail,
      showWeb,
      showTwitter,
      showRiot,
      showJudgements,
      preferredName,
    } = req.body

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        peopleChainShowDisplayName: showDisplayName ?? true,
        peopleChainShowLegalName: showLegalName ?? false,
        peopleChainShowEmail: showEmail ?? false,
        peopleChainShowWeb: showWeb ?? false,
        peopleChainShowTwitter: showTwitter ?? false,
        peopleChainShowRiot: showRiot ?? false,
        peopleChainShowJudgements: showJudgements ?? true,
        peopleChainPreferredName: preferredName || 'display',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        activeRole: true,
        preferredCurrency: true,
        country: true,
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        isRootAdmin: true,
        polkadotAddress: true,
        polkadotChain: true,
        peopleChainIdentity: true,
        peopleChainShowDisplayName: true,
        peopleChainShowLegalName: true,
        peopleChainShowEmail: true,
        peopleChainShowWeb: true,
        peopleChainShowTwitter: true,
        peopleChainShowRiot: true,
        peopleChainShowJudgements: true,
        peopleChainPreferredName: true,
        userRoles: {
          select: { role: true },
        },
      },
    })

    return res.json(serializeBigInt(updatedUser))
  } catch (error: any) {
    console.error('Error actualizando preferencias de privacidad:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al actualizar preferencias de privacidad',
    })
  }
})

/**
 * GET /api/polkadot/auth/wallet-info
 * Obtiene información de la wallet vinculada del usuario, incluyendo identidad completa de People Chain
 */
router.get('/auth/wallet-info', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        polkadotAddress: true,
        polkadotChain: true,
        peopleChainIdentity: true,
      },
    })

    if (!user || !user.polkadotAddress) {
      return res.json({
        hasWallet: false,
      })
    }

    // Obtener balance (opcional, no bloquea la respuesta si falla)
    const polkadotService = getPolkadotService()
    let balance = '0'
    try {
      const balanceBigInt = await polkadotService.getBalance(
        user.polkadotAddress,
        (user.polkadotChain || 'POLKADOT') as any
      )
      balance = balanceBigInt.toString()
    } catch (error: any) {
      console.error('Error obteniendo balance (no crítico):', error.message || error)
      // No lanzamos el error, simplemente dejamos balance en 0
      balance = '0'
    }

    // Obtener identidad completa de People Chain (opcional, no bloquea la respuesta si falla)
    let peopleChainIdentity = null
    try {
      const { getPeopleChainService } = await import('../services/peopleChainService')
      const peopleChainService = getPeopleChainService()
      const identity = await peopleChainService.getIdentity(user.polkadotAddress)
      
      if (identity && identity.hasIdentity) {
        peopleChainIdentity = {
          hasIdentity: true,
          displayName: identity.displayName,
          legalName: identity.legalName,
          email: identity.email,
          web: identity.web,
          twitter: identity.twitter,
          riot: identity.riot,
          judgements: identity.judgements || [],
          deposit: identity.deposit?.toString() || '0',
          // Información adicional
          isVerified: identity.judgements?.some((j: any) => {
            const status = Array.isArray(j) && j.length >= 2 ? j[1] : j
            return status === 'KnownGood' || status === 'Reasonable'
          }) || false,
        }
      } else {
        peopleChainIdentity = {
          hasIdentity: false,
        }
      }
    } catch (error: any) {
      console.error('Error obteniendo identidad de People Chain (no crítico):', error.message || error)
      // No lanzamos el error, simplemente dejamos peopleChainIdentity como null
      peopleChainIdentity = {
        hasIdentity: false,
        error: 'No se pudo obtener la identidad',
      }
    }

    return res.json(serializeBigInt({
      hasWallet: true,
      address: user.polkadotAddress,
      chain: user.polkadotChain || 'POLKADOT',
      balance,
      peopleChainIdentity,
      // Mantener compatibilidad con el campo anterior
      peopleChainIdentityName: user.peopleChainIdentity,
    }))
  } catch (error: any) {
    console.error('Error obteniendo información de wallet:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener información',
    })
  }
})

/**
 * POST /api/polkadot/payments/create
 * Crea un pago pendiente que será procesado con Polkadot
 */
router.post('/payments/create', authenticate, async (req, res) => {
  try {
    const { tripId, amount, currency, assetId } = req.body
    const userId = req.user!.id

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Monto válido es requerido',
      })
    }

    // Calcular comisiones
    const fees = polkadotPaymentService.calculateFees(amount, 15)

    const payment = await polkadotPaymentService.createPayment(
      userId,
      tripId || null,
      amount,
      currency || 'DOT',
      assetId
    )

    return res.json({
      payment: {
        ...payment,
        fee: fees.platformFee,
        netAmount: fees.netAmount,
      },
      fees,
    })
  } catch (error: any) {
    console.error('Error creando pago:', error)
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Error al crear pago',
    })
  }
})

/**
 * POST /api/polkadot/payments/process
 * Procesa un pago después de recibir el hash de transacción
 */
router.post('/payments/process', authenticate, async (req, res) => {
  try {
    const { paymentId, txHash, chain, blockNumber } = req.body

    if (!paymentId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ID de pago es requerido',
      })
    }

    if (!txHash || typeof txHash !== 'string' || txHash.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Hash de transacción es requerido',
      })
    }

    // Verificar que el pago pertenece al usuario
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { userId: true },
    })

    if (!payment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Pago no encontrado',
      })
    }

    if (payment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes permiso para procesar este pago',
      })
    }

    const processedPayment = await polkadotPaymentService.processPayment(
      paymentId,
      txHash,
      (chain || 'POLKADOT') as any,
      blockNumber
    )

    return res.json({
      payment: processedPayment,
      message: 'Pago procesado exitosamente',
    })
  } catch (error: any) {
    console.error('Error procesando pago:', error)
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Error al procesar pago',
    })
  }
})

/**
 * GET /api/polkadot/payments/balance
 * Obtiene el balance disponible del usuario para pagos
 */
router.get('/payments/balance', authenticate, async (req, res) => {
  try {
    const { assetId } = req.query
    const userId = req.user!.id

    const balance = await polkadotPaymentService.getUserBalance(
      userId,
      assetId ? (typeof assetId === 'string' ? assetId : Number(assetId)) : undefined
    )

    return res.json({
      balance: balance.toString(),
      assetId: assetId || null,
    })
  } catch (error: any) {
    console.error('Error obteniendo balance:', error)
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Error al obtener balance',
    })
  }
})

/**
 * POST /api/polkadot/payments/:paymentId/generate-extrinsic
 * Genera una extrínseca de pago sin firmar para que el pasajero la firme
 */
router.post('/payments/:paymentId/generate-extrinsic', authenticate, async (req, res) => {
  try {
    console.log('🚀 [GENERATE-EXTRINSIC] Iniciando generación de extrínseca')
    const { paymentId } = req.params
    const userId = req.user!.id

    console.log('🚀 [GENERATE-EXTRINSIC] Parámetros:', { paymentId, userId })

    // Verificar que el pago pertenece al usuario
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      console.log('❌ [GENERATE-EXTRINSIC] Pago no encontrado:', paymentId)
      return res.status(404).json({
        error: 'Not Found',
        message: 'Pago no encontrado',
      })
    }

    console.log('✅ [GENERATE-EXTRINSIC] Pago encontrado:', {
      id: payment.id,
      status: payment.status,
      userId: payment.userId,
    })

    if (payment.userId !== userId) {
      console.log('❌ [GENERATE-EXTRINSIC] Usuario no autorizado:', { paymentUserId: payment.userId, requestUserId: userId })
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes permiso para generar esta extrínseca',
      })
    }

    // Obtener la dirección del pasajero
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { polkadotAddress: true },
    })

    if (!user || !user.polkadotAddress) {
      console.log('❌ [GENERATE-EXTRINSIC] Usuario sin dirección Polkadot:', { userId, hasAddress: !!user?.polkadotAddress })
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No tienes una dirección de Polkadot vinculada',
      })
    }

    console.log('✅ [GENERATE-EXTRINSIC] Usuario válido, llamando a generatePaymentExtrinsic')
    console.log('   - paymentId:', paymentId)
    console.log('   - passengerAddress:', user.polkadotAddress)

    // Agregar timeout para la generación de extrínseca (45 segundos)
    const extrinsicPromise = polkadotPaymentService.generatePaymentExtrinsic(
      paymentId,
      user.polkadotAddress
    )

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout: La generación de la extrínseca tardó más de 45 segundos'))
      }, 45000) // 45 segundos
    })

    console.log('⏳ [GENERATE-EXTRINSIC] Esperando resultado de generatePaymentExtrinsic...')
    const extrinsicData = await Promise.race([extrinsicPromise, timeoutPromise])

    console.log('✅ [GENERATE-EXTRINSIC] Extrínseca generada exitosamente:', {
      method: extrinsicData.method,
      isBatch: extrinsicData.isBatch,
      chain: extrinsicData.chain,
    })

    return res.json(serializeBigInt({
      paymentId,
      ...extrinsicData,
    }))
  } catch (error: any) {
    console.error('❌ [GENERATE-EXTRINSIC] Error generando extrínseca de pago:', error)
    console.error('   - Error message:', error.message)
    console.error('   - Error stack:', error.stack)
    const statusCode = error.message?.includes('Timeout') ? 504 : 500
    return res.status(statusCode).json({
      error: statusCode === 504 ? 'Gateway Timeout' : 'Internal Server Error',
      message: error.message || 'Error al generar extrínseca de pago',
    })
  }
})

/**
 * GET /api/polkadot/payments/:paymentId/qr-code
 * Obtiene el código QR para un pago específico
 */
router.get('/payments/:paymentId/qr-code', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params
    const userId = req.user!.id

    // Verificar que el pago existe y pertenece al usuario o al conductor del viaje
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        trip: {
          include: {
            driver: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Pago no encontrado',
      })
    }

    // Verificar que el usuario es el pasajero o el conductor
    const isPassenger = payment.userId === userId
    const isDriver = payment.trip?.driver?.id === userId

    if (!isPassenger && !isDriver) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes permiso para ver este código QR',
      })
    }

    // Verificar que el pago está pendiente
    if (payment.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Solo se puede generar QR para pagos pendientes',
      })
    }

    // Generar el QR code
    const qrCode = await generatePaymentQrCode(paymentId)

    return res.json({
      success: true,
      qrCode,
      paymentId,
    })
  } catch (error: any) {
    console.error('Error generando QR de pago:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al generar código QR',
    })
  }
})

/**
 * GET /api/polkadot/payments
 * Obtiene pagos del usuario autenticado (opcionalmente filtrados por tripId y status)
 */
router.get('/payments', authenticate, async (req, res) => {
  try {
    const { tripId, status } = req.query
    const userId = req.user!.id

    const where: any = { userId }
    if (tripId) {
      where.tripId = tripId
    }
    if (status) {
      where.status = status
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return res.json(payments)
  } catch (error: any) {
    console.error('Error obteniendo pagos:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener pagos',
    })
  }
})

/**
 * GET /api/polkadot/payments/:paymentId
 * Obtiene información de un pago específico
 */
router.get('/payments/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params
    const userId = req.user!.id

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Pago no encontrado',
      })
    }

    if (payment.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes permiso para ver este pago',
      })
    }

    return res.json({ payment })
  } catch (error: any) {
    console.error('Error obteniendo pago:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener pago',
    })
  }
})

/**
 * GET /api/polkadot/payments/convert
 * Convierte un monto de moneda local a la moneda de pago configurada
 * No requiere autenticación ya que es solo una conversión de moneda
 */
router.get('/payments/convert', async (req, res) => {
  try {
    const { amount, fromCurrency } = req.query

    if (!amount || !fromCurrency) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'amount y fromCurrency son requeridos',
      })
    }

    const amountNum = parseFloat(amount as string)
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'amount debe ser un número positivo',
      })
    }

    const converted = await polkadotPaymentService.convertToPaymentCurrency(
      amountNum,
      fromCurrency as string
    )

    // Calcular fee del 10%
    const fees = polkadotPaymentService.calculateFees(converted.amount, 10)

    return res.json({
      originalAmount: amountNum,
      originalCurrency: fromCurrency,
      convertedAmount: converted.amount,
      convertedCurrency: converted.currency,
      decimals: converted.decimals,
      assetId: converted.assetId,
      chain: converted.chain,
      platformFee: fees.platformFee,
      platformFeePercent: 10,
      netAmount: fees.netAmount,
      totalAmount: fees.total,
    })
  } catch (error: any) {
    console.error('Error convirtiendo moneda:', error)
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Error al convertir moneda',
    })
  }
})

/**
 * POST /api/polkadot/verify-address
 * Verifica si una dirección de wallet es válida
 */
router.post('/verify-address', async (req, res) => {
  try {
    const { address, chain } = req.body

    if (!address) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Dirección es requerida',
      })
    }

    const polkadotService = getPolkadotService()
    const isValid = await polkadotService.isValidAddress(
      address,
      (chain || 'POLKADOT') as any
    )

    return res.json({
      valid: isValid,
      address,
      chain: chain || 'POLKADOT',
    })
  } catch (error: any) {
    console.error('Error verificando dirección:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al verificar dirección',
    })
  }
})

/**
 * GET /api/polkadot/test/connection
 * Prueba la conexión a una chain específica (para testing)
 */
router.get(
  '/test/connection',
  authenticate,
  async (req, res) => {
    try {
      const { chain } = req.query
      if (!chain || typeof chain !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'El parámetro chain es requerido',
        })
      }

      // Validar que la chain existe
      if (!POLKADOT_CHAINS[chain as keyof typeof POLKADOT_CHAINS]) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `La chain ${chain} no está disponible. Chains disponibles: ${Object.keys(POLKADOT_CHAINS).join(', ')}`,
        })
      }

      const polkadotService = getPolkadotService()
      
      // Agregar timeout para la conexión completa (incluyendo query)
      const connectionPromise = (async () => {
        const client = await polkadotService.getClient(chain as ChainName)
        // Hacer una query simple para verificar la conexión
        const blockNumber = await client.query.system.number()
        return { client, blockNumber }
      })()

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout: La conexión y query a ${chain} tardó más de 45 segundos. El endpoint puede no estar disponible.`))
        }, 45000) // 45 segundos
      })

      const { blockNumber } = await Promise.race([connectionPromise, timeoutPromise])
      
      return res.json({
        success: true,
        chain,
        blockNumber: blockNumber?.toString() || 'N/A',
      })
    } catch (error: any) {
      console.error('Error probando conexión:', error)
      const isTimeout = error.message?.includes('Timeout')
      return res.status(isTimeout ? 504 : 500).json({
        error: isTimeout ? 'Gateway Timeout' : 'Error probando conexión',
        message: error.message || 'Error desconocido',
        chain: req.query.chain,
      })
    }
  }
)

/**
 * GET /api/polkadot/test/balance
 * Obtiene el balance de una dirección (para testing)
 */
router.get(
  '/test/balance',
  authenticate,
  async (req, res) => {
    try {
      const { address, chain, assetId } = req.query
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'El parámetro address es requerido',
        })
      }

      const chainName = (chain as ChainName) || 'POLKADOT'
      const polkadotService = getPolkadotService()
      
      let balance: bigint
      if (assetId) {
        balance = await polkadotService.getAssetBalance(address, parseInt(assetId as string), chainName)
      } else {
        balance = await polkadotService.getBalance(address, chainName)
      }
      
      return res.json({
        success: true,
        address,
        chain: chainName,
        assetId: assetId ? parseInt(assetId as string) : null,
        balance: balance.toString(),
      })
    } catch (error: any) {
      console.error('Error obteniendo balance:', error)
      return res.status(500).json({
        error: 'Error obteniendo balance',
        message: error.message || 'Error desconocido',
      })
    }
  }
)

export default router

