import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Claves de configuración del sistema
 */
export const CONFIG_KEYS = {
  POLKADOT_NETWORK: 'polkadot.network', // Red de Polkadot seleccionada para pagos (ASSET_HUB, ASSET_HUB_KUSAMA, PASET_HUB)
  POLKADOT_ASSET_USDT_ID: 'polkadot.asset.usdt.id', // Asset ID de USDT
  POLKADOT_ASSET_USDC_ID: 'polkadot.asset.usdc.id', // Asset ID de USDC
  POLKADOT_PAYMENT_CHAIN: 'polkadot.payment.chain', // Chain específica para pagos (ASSET_HUB, ASSET_HUB_KUSAMA, PASET_HUB)
  POLKADOT_PAYMENT_PRESET: 'polkadot.payment.preset', // Preset seleccionado para pagos (ej: 'asset-hub-usdt')
  POLKADOT_PAYMENT_CUSTOM: 'polkadot.payment.custom', // Configuración personalizada (JSON con chain, assetId, currency, etc.)
  POLKADOT_PLATFORM_ADDRESS: 'polkadot.platform.address', // Dirección de wallet de la plataforma para recibir comisiones
  POLKADOT_PLATFORM_FEE_PERCENTAGE: 'polkadot.platform.fee.percentage', // Porcentaje de comisión de la plataforma (ej: 15)
  // Validaciones de distancia
  VALIDATION_DISTANCE_START_TRIP: 'validation.distance.start_trip', // Desactivar validación de distancia para iniciar viaje (true/false)
  VALIDATION_DISTANCE_END_TRIP: 'validation.distance.end_trip', // Desactivar validación de distancia para completar viaje (true/false)
} as const

export type ConfigKey = typeof CONFIG_KEYS[keyof typeof CONFIG_KEYS]

/**
 * Servicio para gestionar configuraciones del sistema
 */
export class SystemConfigService {
  /**
   * Obtiene el valor de una configuración
   */
  async getConfig(key: ConfigKey): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    })
    return config?.value || null
  }

  /**
   * Establece el valor de una configuración
   */
  async setConfig(
    key: ConfigKey,
    value: string | null,
    description?: string,
    updatedBy?: string
  ): Promise<void> {
    // Si value es null, eliminar la configuración en lugar de crear/actualizar con null
    if (value === null) {
      await prisma.systemConfig.deleteMany({
        where: { key },
      })
      return
    }

    await prisma.systemConfig.upsert({
      where: { key },
      update: {
        value,
        description,
        updatedBy,
        updatedAt: new Date(),
      },
      create: {
        key,
        value,
        description,
        updatedBy,
        category: key.split('.')[0], // Primera parte de la clave como categoría
      },
    })
  }

  /**
   * Obtiene todas las configuraciones de una categoría
   */
  async getConfigsByCategory(category: string): Promise<Record<string, string>> {
    const configs = await prisma.systemConfig.findMany({
      where: { category },
    })

    const result: Record<string, string> = {}
    for (const config of configs) {
      result[config.key] = config.value
    }
    return result
  }

  /**
   * Obtiene todas las configuraciones de Polkadot
   */
  async getPolkadotConfigs(): Promise<{
    network: string | null
    paymentChain: string | null
    paymentPreset: string | null
    paymentCustom: any | null
    usdtAssetId: string | null
    usdcAssetId: string | null
    platformAddress: string | null
    platformFeePercentage: string | null
  }> {
    const [network, paymentChain, paymentPreset, paymentCustom, usdtAssetId, usdcAssetId, platformAddress, platformFeePercentage] = await Promise.all([
      this.getConfig(CONFIG_KEYS.POLKADOT_NETWORK),
      this.getConfig(CONFIG_KEYS.POLKADOT_PAYMENT_CHAIN),
      this.getConfig(CONFIG_KEYS.POLKADOT_PAYMENT_PRESET),
      this.getConfig(CONFIG_KEYS.POLKADOT_PAYMENT_CUSTOM),
      this.getConfig(CONFIG_KEYS.POLKADOT_ASSET_USDT_ID),
      this.getConfig(CONFIG_KEYS.POLKADOT_ASSET_USDC_ID),
      this.getConfig(CONFIG_KEYS.POLKADOT_PLATFORM_ADDRESS),
      this.getConfig(CONFIG_KEYS.POLKADOT_PLATFORM_FEE_PERCENTAGE),
    ])

    // Parsear paymentCustom si existe
    let parsedCustom = null
    if (paymentCustom) {
      try {
        parsedCustom = JSON.parse(paymentCustom)
      } catch {
        parsedCustom = null
      }
    }

    // Si no hay configuración, usar valores por defecto para desarrollo
    const defaultChain = process.env.NODE_ENV === 'production' ? null : 'PASET_HUB'
    const defaultPreset = process.env.NODE_ENV === 'production' ? null : 'paset-hub-pas'
    const defaultFeePercentage = process.env.NODE_ENV === 'production' ? null : '8'

    return {
      network: network || defaultChain,
      paymentChain: paymentChain || network || defaultChain, // Si no hay paymentChain, usar network o default
      paymentPreset: paymentPreset || defaultPreset,
      paymentCustom: parsedCustom,
      usdtAssetId,
      usdcAssetId,
      platformAddress,
      platformFeePercentage: platformFeePercentage || defaultFeePercentage,
    }
  }

  /**
   * Establece las configuraciones de Polkadot
   */
  async setPolkadotConfigs(
    configs: {
      network?: string
      paymentChain?: string
      paymentPreset?: string
      paymentCustom?: any
      usdtAssetId?: string
      usdcAssetId?: string
      platformAddress?: string | null
      platformFeePercentage?: string | number | null
    },
    updatedBy?: string
  ): Promise<void> {
    const updates: Promise<void>[] = []

    if (configs.network !== undefined) {
      updates.push(
        this.setConfig(
          CONFIG_KEYS.POLKADOT_NETWORK,
          configs.network,
          'Red de Polkadot seleccionada para operaciones de la plataforma',
          updatedBy
        )
      )
    }

    if (configs.paymentChain !== undefined) {
      updates.push(
        this.setConfig(
          CONFIG_KEYS.POLKADOT_PAYMENT_CHAIN,
          configs.paymentChain,
          'Chain de Polkadot seleccionada para procesar pagos (ASSET_HUB, ASSET_HUB_KUSAMA, PASET_HUB)',
          updatedBy
        )
      )
    }

    if (configs.paymentPreset !== undefined) {
      updates.push(
        this.setConfig(
          CONFIG_KEYS.POLKADOT_PAYMENT_PRESET,
          configs.paymentPreset,
          'Preset seleccionado para pagos (preset predefinido)',
          updatedBy
        )
      )
    }

    if (configs.paymentCustom !== undefined) {
      updates.push(
        this.setConfig(
          CONFIG_KEYS.POLKADOT_PAYMENT_CUSTOM,
          JSON.stringify(configs.paymentCustom),
          'Configuración personalizada de pagos (custom asset/chain)',
          updatedBy
        )
      )
    }

    if (configs.usdtAssetId !== undefined) {
      updates.push(
        this.setConfig(
          CONFIG_KEYS.POLKADOT_ASSET_USDT_ID,
          configs.usdtAssetId,
          'Asset ID de USDT en la red seleccionada',
          updatedBy
        )
      )
    }

    if (configs.usdcAssetId !== undefined) {
      updates.push(
        this.setConfig(
          CONFIG_KEYS.POLKADOT_ASSET_USDC_ID,
          configs.usdcAssetId,
          'Asset ID de USDC en la red seleccionada',
          updatedBy
        )
      )
    }

    if (configs.platformAddress !== undefined) {
      updates.push(
        this.setConfig(
          CONFIG_KEYS.POLKADOT_PLATFORM_ADDRESS,
          configs.platformAddress || null,
          'Dirección de wallet de la plataforma para recibir comisiones de pagos',
          updatedBy
        )
      )
    }

    if (configs.platformFeePercentage !== undefined) {
      updates.push(
        this.setConfig(
          CONFIG_KEYS.POLKADOT_PLATFORM_FEE_PERCENTAGE,
          configs.platformFeePercentage ? String(configs.platformFeePercentage) : null,
          'Porcentaje de comisión de la plataforma (ej: 8 para 8%)',
          updatedBy
        )
      )
    }

    await Promise.all(updates)
  }

  /**
   * Elimina una configuración
   */
  async deleteConfig(key: ConfigKey): Promise<void> {
    await prisma.systemConfig.delete({
      where: { key },
    })
  }

  /**
   * Verifica si una validación está desactivada
   * Retorna true si la validación está desactivada (config = 'true')
   */
  async isValidationDisabled(key: ConfigKey): Promise<boolean> {
    const value = await this.getConfig(key)
    return value === 'true'
  }

  /**
   * Obtiene todas las configuraciones de validaciones
   */
  async getValidationConfigs(): Promise<{
    distanceStartTrip: boolean
    distanceEndTrip: boolean
  }> {
    const [distanceStartTrip, distanceEndTrip] = await Promise.all([
      this.isValidationDisabled(CONFIG_KEYS.VALIDATION_DISTANCE_START_TRIP),
      this.isValidationDisabled(CONFIG_KEYS.VALIDATION_DISTANCE_END_TRIP),
    ])

    return {
      distanceStartTrip,
      distanceEndTrip,
    }
  }
}

// Instancia singleton
let systemConfigServiceInstance: SystemConfigService | null = null

export function getSystemConfigService(): SystemConfigService {
  if (!systemConfigServiceInstance) {
    systemConfigServiceInstance = new SystemConfigService()
  }
  return systemConfigServiceInstance
}

