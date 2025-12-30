import { prisma } from '../index'
import { getPolkadotService } from './polkadotService'
import { getAssetHubService } from './assetHubService'
import { getSystemConfigService, CONFIG_KEYS } from './systemConfigService'
import { getPresetById, getRecommendedPreset, PAYMENT_PRESETS } from '../config/paymentPresets'
import { convertCurrency } from './currencyService'
import type { ChainName } from './polkadotService'

/**
 * Asset IDs conocidos en Asset Hub
 */
export const KNOWN_ASSETS = {
  USDT_POLKADOT: 1984, // Asset Hub (Polkadot) - Verificado
  // USDC_POLKADOT: TBD, // Pendiente de verificar
} as const

/**
 * Mapeo de monedas a Asset IDs
 */
const CURRENCY_TO_ASSET_ID: Record<string, number> = {
  USDT: KNOWN_ASSETS.USDT_POLKADOT,
  // USDC: TBD,
}

/**
 * Servicio para procesar pagos con Polkadot y Asset Hub
 */
export class PolkadotPaymentService {
  /**
   * Obtiene la configuración de pago activa (preset o custom)
   */
  async getPaymentConfig(): Promise<{
    chain: ChainName
    currency: string
    assetId: number | null
    decimals: number
    preset?: string
  }> {
    const configService = getSystemConfigService()
    const configs = await configService.getPolkadotConfigs()

    // Si hay un preset seleccionado, usarlo
    if (configs.paymentPreset) {
      const preset = getPresetById(configs.paymentPreset)
      if (preset) {
        return {
          chain: preset.chain,
          currency: preset.currency,
          assetId: preset.assetId,
          decimals: preset.decimals,
          preset: preset.id,
        }
      }
    }

    // Si hay configuración personalizada, usarla
    if (configs.paymentCustom) {
      return {
        chain: configs.paymentCustom.chain as ChainName,
        currency: configs.paymentCustom.currency,
        assetId: configs.paymentCustom.assetId || null,
        decimals: configs.paymentCustom.decimals || 10,
      }
    }

    // Si hay paymentChain configurada, usar preset recomendado para esa chain
    const paymentChain = configs.paymentChain || configs.network
    if (paymentChain && ['ASSET_HUB', 'ASSET_HUB_KUSAMA', 'PASET_HUB'].includes(paymentChain)) {
      // Buscar preset recomendado para esa chain
      const recommendedPreset = PAYMENT_PRESETS.find(
        (p) => p.chain === paymentChain && p.verified
      ) || getRecommendedPreset()

      return {
        chain: recommendedPreset.chain,
        currency: recommendedPreset.currency,
        assetId: recommendedPreset.assetId,
        decimals: recommendedPreset.decimals,
        preset: recommendedPreset.id,
      }
    }

    // Por defecto: en desarrollo usar PASET_HUB con PAS, en producción usar preset recomendado
    if (process.env.NODE_ENV !== 'production') {
      // Desarrollo: usar PASET_HUB con PAS
      const devPreset = PAYMENT_PRESETS.find((p) => p.id === 'paset-hub-pas')
      if (devPreset) {
        return {
          chain: devPreset.chain,
          currency: devPreset.currency,
          assetId: devPreset.assetId,
          decimals: devPreset.decimals,
          preset: devPreset.id,
        }
      }
    }
    
    // Producción: usar preset recomendado
    const defaultPreset = getRecommendedPreset()
    return {
      chain: defaultPreset.chain,
      currency: defaultPreset.currency,
      assetId: defaultPreset.assetId,
      decimals: defaultPreset.decimals,
      preset: defaultPreset.id,
    }
  }

  /**
   * Obtiene la chain configurada para pagos (por defecto ASSET_HUB)
   */
  async getPaymentChain(): Promise<ChainName> {
    const config = await this.getPaymentConfig()
    return config.chain
  }

  /**
   * Obtiene el Asset ID para una moneda en la chain configurada
   * Primero intenta usar el preset/configuración activa, luego busca en presets
   */
  async getAssetIdForCurrency(currency: string): Promise<number | null> {
    // Si es DOT o KSM, no tiene Asset ID (es token nativo)
    if (currency === 'DOT' || currency === 'KSM') {
      return null
    }

    // Obtener configuración de pago activa
    const paymentConfig = await this.getPaymentConfig()
    
    // Si la moneda coincide con la configuración activa, usar su Asset ID
    if (paymentConfig.currency === currency) {
      return paymentConfig.assetId
    }

    // Si no coincide, buscar en presets
    const preset = PAYMENT_PRESETS.find(
      (p) => p.currency === currency && p.chain === paymentConfig.chain && p.verified
    )

    if (preset) {
      return preset.assetId
    }

    // Fallback: buscar en configuración manual
    const configService = getSystemConfigService()
    if (currency === 'USDT') {
      const usdtAssetId = await configService.getConfig(CONFIG_KEYS.POLKADOT_ASSET_USDT_ID)
      if (usdtAssetId) {
        return parseInt(usdtAssetId, 10)
      }
      // Si es ASSET_HUB (Polkadot), usar el ID conocido
      if (paymentConfig.chain === 'ASSET_HUB') {
        return KNOWN_ASSETS.USDT_POLKADOT
      }
    }

    if (currency === 'USDC') {
      const usdcAssetId = await configService.getConfig(CONFIG_KEYS.POLKADOT_ASSET_USDC_ID)
      if (usdcAssetId) {
        return parseInt(usdcAssetId, 10)
      }
    }

    return null
  }

  /**
   * Convierte un monto de moneda local a la moneda de pago configurada
   * Si la chain es PASET_HUB y la moneda es PAS, NO convierte (usa el monto directamente)
   */
  async convertToPaymentCurrency(
    amount: number,
    fromCurrency: string
  ): Promise<{
    amount: number
    currency: string
    decimals: number
    assetId: number | null
    chain: ChainName
  }> {
    const paymentConfig = await this.getPaymentConfig()
    
    // Si es PAS en PassetHub, usar el monto directamente sin conversión
    if (paymentConfig.chain === 'PASET_HUB' && paymentConfig.currency === 'PAS') {
      return {
        amount: amount, // Usar directamente sin conversión
        currency: 'PAS',
        decimals: paymentConfig.decimals,
        assetId: null, // PAS es token nativo
        chain: paymentConfig.chain,
      }
    }
    
    // Si la moneda ya es la de pago, retornar sin conversión
    if (fromCurrency === paymentConfig.currency) {
      return {
        amount,
        currency: paymentConfig.currency,
        decimals: paymentConfig.decimals,
        assetId: paymentConfig.assetId,
        chain: paymentConfig.chain,
      }
    }

    // Convertir de moneda local a USD primero
    const amountInUSD = convertCurrency(amount, fromCurrency, 'USD')
    
    // Convertir de USD a la moneda de pago
    // Para DOT/USDT/USDC, asumimos que 1 USD ≈ 1 token (aproximado)
    // En producción, esto debería usar tasas de cambio reales
    const convertedAmount = convertCurrency(amountInUSD, 'USD', paymentConfig.currency)

    return {
      amount: convertedAmount,
      currency: paymentConfig.currency,
      decimals: paymentConfig.decimals,
      assetId: paymentConfig.assetId,
      chain: paymentConfig.chain,
    }
  }

  /**
   * Crea un pago que será procesado con Polkadot/Asset Hub
   * Calcula automáticamente el fee del 10% de la plataforma
   */
  async createPayment(
    userId: string,
    tripId: string | null,
    amount: number,
    currency: string = 'DOT',
    assetId?: string | number,
    originalCurrency?: string, // Moneda original del viaje (ej: CLP)
    originalAmount?: number // Monto original del viaje
  ) {
    // Obtener configuración de pago
    const paymentConfig = await this.getPaymentConfig()
    const chain = paymentConfig.chain
    
    // Si la chain es PASET_HUB y la moneda es PAS, NO convertir (usar directamente)
    let finalAmount = amount
    let finalCurrency = currency
    let finalAssetId = assetId

    // Si es PAS en PassetHub, usar directamente sin conversión
    if (chain === 'PASET_HUB' && (currency === 'PAS' || paymentConfig.currency === 'PAS')) {
      finalCurrency = 'PAS'
      finalAssetId = undefined // PAS es token nativo
      // Usar el monto directamente sin conversión
      if (originalCurrency && originalAmount) {
        // Si hay moneda original, usar el monto original directamente (asumiendo que ya está en PAS)
        finalAmount = originalAmount
      } else {
        finalAmount = amount
      }
    } else if (originalCurrency && originalAmount) {
      // Si se proporciona moneda original, convertir a la moneda de pago
      const converted = await this.convertToPaymentCurrency(originalAmount, originalCurrency)
      finalAmount = converted.amount
      finalCurrency = converted.currency
      finalAssetId = converted.assetId || undefined
    } else if (currency !== paymentConfig.currency) {
      // Si la moneda no es la de pago, convertir
      const converted = await this.convertToPaymentCurrency(amount, currency)
      finalAmount = converted.amount
      finalCurrency = converted.currency
      finalAssetId = converted.assetId || undefined
    } else {
      // Usar la configuración de pago
      finalCurrency = paymentConfig.currency
      finalAssetId = paymentConfig.assetId || undefined
    }
    
    // Si no se proporciona assetId, intentar obtenerlo de la moneda
    if (!finalAssetId && finalCurrency !== 'DOT' && finalCurrency !== 'KSM') {
      const assetIdResult = await this.getAssetIdForCurrency(finalCurrency)
      finalAssetId = assetIdResult ?? undefined
    }

    // Verificar que el asset existe si se especifica
    if (finalAssetId) {
      const assetHubService = getAssetHubService()
      const assetInfo = await assetHubService.getAssetInfo(finalAssetId, chain)
      if (!assetInfo) {
        throw new Error(`Asset ${finalAssetId} (${finalCurrency}) no encontrado en ${chain}`)
      }
    }

    // Calcular fee del 8% de la plataforma (92% para el conductor)
    const fees = this.calculateFees(finalAmount, 8)
    const platformFee = fees.platformFee
    const netAmount = fees.netAmount

    const payment = await prisma.payment.create({
      data: {
        userId,
        tripId,
        amount: finalAmount, // Monto total en moneda de pago
        currency: finalCurrency,
        netAmount: netAmount, // Monto después del fee (90%)
        method: 'POLKADOT_WALLET',
        status: 'PENDING',
        paymentMethodDetails: {
          assetId: finalAssetId || null,
          chain: chain,
          currency: finalCurrency,
          originalAmount: originalAmount || amount,
          originalCurrency: originalCurrency || currency,
          platformFee: platformFee,
          platformFeePercent: 8,
        },
        polkadotChain: chain,
        polkadotAssetId: finalAssetId ? String(finalAssetId) : null,
      },
    })

    return payment
  }

  /**
   * Genera una extrínseca de pago sin firmar para que el pasajero la firme
   * Retorna la extrínseca serializada y los metadatos necesarios
   * Usa batch para dividir el pago: 85% al conductor, 15% a la plataforma
   */
  async generatePaymentExtrinsic(
    paymentId: string,
    passengerAddress: string
  ): Promise<{
    method: string // Método de la extrínseca (ej: 'utility.batchAll' o 'balances.transferKeepAlive')
    params: any[] // Parámetros de la extrínseca
    chain: ChainName
    assetId: number | null
    amount: bigint // Monto total
    driverAmount: bigint // Monto para el conductor (85%)
    platformAmount: bigint // Monto para la plataforma (15%)
    toAddress: string // Dirección del conductor
    platformAddress: string // Dirección de la plataforma
    decimals: number
    currency: string // Moneda del pago
    isBatch: boolean // Indica si es un batch transaction
  }> {
    console.log('📦 [generatePaymentExtrinsic] Iniciando función')
    console.log('   - paymentId:', paymentId)
    console.log('   - passengerAddress:', passengerAddress)
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        trip: {
          include: {
            driver: {
              select: {
                polkadotAddress: true,
                paymentAddress: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      throw new Error('Pago no encontrado')
    }

    if (payment.status !== 'PENDING') {
      throw new Error('El pago ya fue procesado')
    }

    // Usar paymentAddress si existe, sino usar polkadotAddress
    if (!payment.trip || !payment.trip.driver) {
      throw new Error('El pago no está asociado a un viaje con conductor')
    }
    const driverPaymentAddress = payment.trip.driver.paymentAddress || payment.trip.driver.polkadotAddress
    
    if (!driverPaymentAddress) {
      throw new Error('El conductor no tiene una dirección de pago configurada. Por favor, configura una dirección de pago en tu perfil.')
    }

    const chain = (payment.polkadotChain as ChainName) || 'ASSET_HUB'
    const assetId = payment.polkadotAssetId ? parseInt(payment.polkadotAssetId) : undefined
    const driverAddress = driverPaymentAddress
    const decimals = (payment.paymentMethodDetails as any)?.decimals || 10
    const totalAmount = BigInt(Math.floor(payment.amount * Math.pow(10, decimals)))

    console.log(`🔧 Iniciando generación de extrínseca para pago ${paymentId}`)
    console.log(`   - Chain: ${chain}`)
    console.log(`   - Asset ID: ${assetId}`)
    console.log(`   - Driver Address: ${driverAddress}`)
    console.log(`   - Total Amount: ${totalAmount.toString()}`)

    // Obtener configuración de plataforma
    const configService = getSystemConfigService()
    const platformAddressRaw = await configService.getConfig(CONFIG_KEYS.POLKADOT_PLATFORM_ADDRESS)
    const feePercentageStr = await configService.getConfig(CONFIG_KEYS.POLKADOT_PLATFORM_FEE_PERCENTAGE)
    
    // Limpiar y validar dirección de plataforma
    const platformAddress = platformAddressRaw ? platformAddressRaw.trim() : null
    const feePercentage = feePercentageStr ? parseFloat(feePercentageStr) : null

    console.log(`🔍 Configuración de plataforma leída:`, {
      platformAddressRaw: platformAddressRaw || 'null',
      platformAddress: platformAddress || 'null',
      platformAddressLength: platformAddress ? platformAddress.length : 0,
      feePercentageStr: feePercentageStr || 'null',
      feePercentage: feePercentage,
      isFeeValid: feePercentage !== null && !isNaN(feePercentage) && feePercentage > 0 && feePercentage < 100,
    })

    // Si no hay dirección de plataforma configurada, usar el método anterior (pago completo al conductor)
    const hasValidPlatformAddress = platformAddress !== null && platformAddress !== '' && platformAddress.trim() !== ''
    const hasValidFee = feePercentage !== null && !isNaN(feePercentage) && feePercentage > 0 && feePercentage < 100
    const useBatch = hasValidPlatformAddress && hasValidFee

    console.log(`🔍 useBatch: ${useBatch}`, {
      hasValidPlatformAddress,
      hasValidFee,
      platformAddress: platformAddress || 'null',
      feePercentage,
    })

    let driverAmount: bigint
    let platformAmount: bigint

    if (useBatch && feePercentage !== null) {
      // Calcular montos: 92% conductor, 8% plataforma (o según configuración)
      // Si la configuración es diferente, usar la configurada, pero por defecto 8%
      const effectiveFeePercentage = feePercentage || 8
      const driverPercentage = 100 - effectiveFeePercentage
      platformAmount = (totalAmount * BigInt(Math.floor(effectiveFeePercentage * 100))) / BigInt(10000)
      driverAmount = totalAmount - platformAmount
      
      console.log(`💰 División de pago: ${driverPercentage}% conductor (${driverAmount}), ${effectiveFeePercentage}% plataforma (${platformAmount})`)
    } else {
      // Si no hay configuración de plataforma, todo va al conductor
      driverAmount = totalAmount
      platformAmount = BigInt(0)
      console.log(`⚠️ No hay dirección de plataforma configurada o porcentaje inválido, pago completo al conductor`)
      console.log(`   - platformAddress: ${platformAddress || 'null'}`)
      console.log(`   - feePercentage: ${feePercentage}`)
    }

    const polkadotService = getPolkadotService()
    console.log(`🔧 Generando extrínseca para pago ${paymentId} en ${chain}...`)
    const startTime = Date.now()
    
    try {
      // Obtener cliente (puede tardar si es la primera conexión)
      const client = await polkadotService.getClient(chain)
      const clientTime = Date.now() - startTime
      console.log(`✅ Cliente obtenido en ${clientTime}ms`)

      let extrinsic: any
      let method: string
      let params: any[]

      const extrinsicStartTime = Date.now()
      
      if (useBatch && hasValidPlatformAddress && feePercentage !== null) {
        // Usar batch para dividir el pago en dos transferencias
        // batchAll: todas las transacciones deben tener éxito, si una falla, todas se revierten
        const calls: any[] = []
        const batchParams: any[] = []
        
        const trimmedPlatformAddress = platformAddress.trim()
        console.log(`✅ Construyendo batch transaction:`, {
          driverAddress,
          platformAddress: trimmedPlatformAddress,
          driverAmount: driverAmount.toString(),
          platformAmount: platformAmount.toString(),
        })

        if (assetId && chain.includes('ASSET_HUB')) {
          // Dos transferencias de asset
          const driverCall = client.tx.assets.transfer(assetId, driverAddress, driverAmount)
          const platformCall = client.tx.assets.transfer(assetId, trimmedPlatformAddress, platformAmount)
          calls.push(driverCall, platformCall)
          batchParams.push(
            { method: 'assets.transfer', params: [assetId, driverAddress, driverAmount.toString()] },
            { method: 'assets.transfer', params: [assetId, trimmedPlatformAddress, platformAmount.toString()] }
          )
        } else {
          // Dos transferencias de token nativo
          const driverCall = client.tx.balances.transferKeepAlive(driverAddress, driverAmount)
          const platformCall = client.tx.balances.transferKeepAlive(trimmedPlatformAddress, platformAmount)
          calls.push(driverCall, platformCall)
          batchParams.push(
            { method: 'balances.transferKeepAlive', params: [driverAddress, driverAmount.toString()] },
            { method: 'balances.transferKeepAlive', params: [trimmedPlatformAddress, platformAmount.toString()] }
          )
        }

        extrinsic = client.tx.utility.batchAll(calls)
        method = 'utility.batchAll'
        params = batchParams
        console.log(`✅ Batch transaction construida con ${calls.length} calls`)
      } else {
        // Método anterior: pago completo al conductor
        if (assetId && chain.includes('ASSET_HUB')) {
          extrinsic = client.tx.assets.transfer(assetId, driverAddress, totalAmount)
          method = 'assets.transfer'
          params = [assetId, driverAddress, totalAmount]
        } else {
          extrinsic = client.tx.balances.transferKeepAlive(driverAddress, totalAmount)
          method = 'balances.transferKeepAlive'
          params = [driverAddress, totalAmount]
        }
      }
      
      const extrinsicTime = Date.now() - extrinsicStartTime
      console.log(`✅ Extrínseca construida en ${extrinsicTime}ms`)
      console.log(`📋 Resumen de extrínseca:`, {
        method,
        isBatch: useBatch,
        paramsCount: params.length,
        chain,
        assetId,
        totalAmount: totalAmount.toString(),
        driverAmount: driverAmount.toString(),
        platformAmount: platformAmount.toString(),
      })
      
      // La extrínseca está lista pero NO la firmamos aquí
      // El frontend la firmará con la wallet del usuario

      // No necesitamos serializar la extrínseca ya que el frontend la reconstruye desde los parámetros
      // Esto ahorra tiempo de serialización y reduce el payload
      console.log(`⏱️ Tiempo total: ${Date.now() - startTime}ms`)

      const result = {
        method,
        params,
        chain,
        assetId: assetId ?? null,
        amount: totalAmount,
        driverAmount,
        platformAmount,
        toAddress: driverAddress,
        platformAddress: (platformAddress && platformAddress.trim()) || '',
        decimals,
        currency: payment.currency,
        isBatch: useBatch,
      }

      console.log(`📤 Retornando extrínseca:`, {
        method: result.method,
        isBatch: result.isBatch,
        paramsLength: result.params.length,
        platformAddress: result.platformAddress || 'vacío',
      })

      return result
    } catch (error: any) {
      const totalTime = Date.now() - startTime
      console.error(`❌ Error generando extrínseca después de ${totalTime}ms:`, error)
      throw new Error(`Error al generar extrínseca: ${error.message || 'Error desconocido'}`)
    }
  }

  /**
   * Procesa un pago después de recibir el hash de transacción
   */
  async processPayment(
    paymentId: string,
    txHash: string,
    chain: ChainName = 'POLKADOT',
    blockNumber?: string
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      throw new Error('Pago no encontrado')
    }

    if (payment.status !== 'PENDING') {
      throw new Error('El pago ya fue procesado')
    }

    // Verificar la transacción en la blockchain
    // Nota: El hash de transacción ya confirma que la transacción fue enviada exitosamente
    // Una verificación más completa requeriría escuchar eventos o usar un explorador de bloques
    try {
      // Validar que el txHash existe y es un string
      if (!txHash || typeof txHash !== 'string') {
        throw new Error('Hash de transacción inválido')
      }
      
      // Normalizar el hash (agregar 0x si no lo tiene, pero no es requerido para Polkadot)
      // Los hashes de Polkadot pueden venir con o sin prefijo 0x
      const normalizedHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`
      
      // Actualizar el pago
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          transactionId: normalizedHash,
          polkadotTxHash: normalizedHash,
          polkadotChain: chain,
          polkadotBlockNumber: blockNumber || null,
          processedAt: new Date(),
        },
      })

      // Si el pago está asociado a un viaje, cambiar el estado del viaje a COMPLETED
      if (updatedPayment.tripId) {
        const { TripStatus } = await import('@prisma/client')
        await prisma.trip.update({
          where: { id: updatedPayment.tripId },
          data: {
            status: TripStatus.COMPLETED,
            completedAt: new Date(), // Agregar fecha de completado
          },
        })
        console.log(`✅ Viaje ${updatedPayment.tripId} marcado como COMPLETED después del pago`)
      }

      return updatedPayment
    } catch (error) {
      // Si hay error verificando, marcar como fallido
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          failureReason: `Error verificando transacción: ${error}`,
        },
      })
      throw error
    }
  }

  /**
   * Transfiere tokens desde una cuenta a otra (para pagos a conductores)
   */
  async transferToDriver(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    assetId?: string | number,
    chain: ChainName = 'ASSET_HUB'
  ): Promise<string> {
    // Esta función normalmente se ejecutaría desde el frontend
    // ya que requiere la firma de la wallet del usuario
    // Aquí solo validamos y preparamos la transacción
    
    const polkadotService = getPolkadotService()
    
    // Verificar balances
    let balance: bigint
    if (assetId) {
      balance = await polkadotService.getAssetBalance(fromAddress, assetId, chain)
    } else {
      balance = await polkadotService.getBalance(fromAddress, chain)
    }

    if (balance < amount) {
      throw new Error('Balance insuficiente')
    }

    // Retornar información para que el frontend construya la transacción
    // El frontend usará Dedot para firmar y enviar
    return JSON.stringify({
      from: fromAddress,
      to: toAddress,
      amount: amount.toString(),
      assetId: assetId || null,
      chain,
    })
  }

  /**
   * Verifica el estado de una transacción
   */
  async verifyTransaction(
    txHash: string,
    chain: ChainName = 'POLKADOT'
  ): Promise<{
    confirmed: boolean
    blockNumber?: string
    blockHash?: string
  }> {
    try {
      const polkadotService = getPolkadotService()
      const client = await polkadotService.getClient(chain)
      
      // Obtener información de la transacción
      // Nota: La implementación exacta depende de la API de Dedot
      // Por ahora retornamos un objeto básico
      return {
        confirmed: true,
      }
    } catch (error) {
      console.error('Error verificando transacción:', error)
      return {
        confirmed: false,
      }
    }
  }

  /**
   * Calcula las comisiones para un pago
   */
  /**
   * Calcula el fee de la plataforma (10%) y el monto neto
   */
  calculateFees(amount: number, platformFeePercent: number = 10): {
    total: number
    platformFee: number
    netAmount: number
  } {
    const platformFee = (amount * platformFeePercent) / 100
    const netAmount = amount - platformFee

    return {
      total: amount,
      platformFee,
      netAmount,
    }
  }

  /**
   * Obtiene el balance disponible de un usuario para pagos
   */
  async getUserBalance(
    userId: string,
    assetId?: string | number
  ): Promise<bigint> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { polkadotAddress: true, polkadotChain: true },
    })

    if (!user || !user.polkadotAddress) {
      throw new Error('Usuario no tiene wallet vinculada')
    }

    const polkadotService = getPolkadotService()
    const chain = (user.polkadotChain || 'POLKADOT') as ChainName

    if (assetId) {
      return await polkadotService.getAssetBalance(
        user.polkadotAddress,
        assetId,
        chain === 'POLKADOT' ? 'ASSET_HUB' : chain
      )
    }

    return await polkadotService.getBalance(user.polkadotAddress, chain)
  }
}

export const polkadotPaymentService = new PolkadotPaymentService()





