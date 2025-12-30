/**
 * Presets predefinidos para pagos con Asset Hub
 * Incluye Asset IDs conocidos y configuraciones listas para usar
 */

import type { ChainName } from '../services/polkadotService'

export interface PaymentPreset {
  id: string
  name: string
  chain: ChainName
  endpoint: string
  currency: string
  assetId: number | null // null para tokens nativos (DOT, KSM)
  decimals: number
  isTestnet: boolean
  description: string
  verified: boolean // Si el Asset ID está verificado
}

/**
 * Presets predefinidos para pagos
 */
export const PAYMENT_PRESETS: PaymentPreset[] = [
  // === ASSET HUB (Polkadot Mainnet) ===
  {
    id: 'asset-hub-dot',
    name: 'DOT en Asset Hub (Polkadot)',
    chain: 'ASSET_HUB',
    endpoint: 'wss://polkadot-asset-hub-rpc.polkadot.io',
    currency: 'DOT',
    assetId: null, // Token nativo
    decimals: 10,
    isTestnet: false,
    description: 'DOT nativo en Asset Hub de Polkadot (mainnet)',
    verified: true,
  },
  {
    id: 'asset-hub-usdt',
    name: 'USDT en Asset Hub (Polkadot)',
    chain: 'ASSET_HUB',
    endpoint: 'wss://polkadot-asset-hub-rpc.polkadot.io',
    currency: 'USDT',
    assetId: 1984, // Verificado
    decimals: 6,
    isTestnet: false,
    description: 'USDT (Tether USD) en Asset Hub de Polkadot - Asset ID: 1984',
    verified: true,
  },
  // USDC pendiente de verificar
  // {
  //   id: 'asset-hub-usdc',
  //   name: 'USDC en Asset Hub (Polkadot)',
  //   chain: 'ASSET_HUB',
  //   endpoint: 'wss://polkadot-asset-hub-rpc.polkadot.io',
  //   currency: 'USDC',
  //   assetId: TBD,
  //   decimals: 6,
  //   isTestnet: false,
  //   description: 'USDC (USD Coin) en Asset Hub de Polkadot',
  //   verified: false,
  // },

  // === ASSET HUB KUSAMA ===
  {
    id: 'asset-hub-kusama-ksm',
    name: 'KSM en Asset Hub (Kusama)',
    chain: 'ASSET_HUB_KUSAMA',
    endpoint: 'wss://kusama-asset-hub-rpc.polkadot.io',
    currency: 'KSM',
    assetId: null, // Token nativo
    decimals: 12,
    isTestnet: false,
    description: 'KSM nativo en Asset Hub de Kusama (mainnet)',
    verified: true,
  },
  // USDT/USDC en Kusama pendiente de verificar

  // === PASET HUB (Testnet - Asset Hub de Paseo) ===
  {
    id: 'paset-hub-dot',
    name: 'DOT en Asset Hub de Paseo (Testnet)',
    chain: 'PASET_HUB',
    endpoint: 'wss://sys.ibp.network/asset-hub-paseo',
    currency: 'DOT',
    assetId: null, // Token nativo
    decimals: 10,
    isTestnet: true,
    description: 'DOT nativo en Asset Hub de Paseo (testnet oficial) - Solo para desarrollo',
    verified: true,
  },
  {
    id: 'paset-hub-pas',
    name: 'PAS en Asset Hub de Paseo (Testnet)',
    chain: 'PASET_HUB',
    endpoint: 'wss://sys.ibp.network/asset-hub-paseo',
    currency: 'PAS',
    assetId: null, // PAS es el token nativo en Asset Hub de Paseo
    decimals: 10,
    isTestnet: true,
    description: 'PAS (token nativo) en Asset Hub de Paseo (testnet oficial) - Sin conversión',
    verified: true,
  },
  {
    id: 'paset-hub-usdc',
    name: 'USDC en Asset Hub de Paseo (Testnet)',
    chain: 'PASET_HUB',
    endpoint: 'wss://sys.ibp.network/asset-hub-paseo',
    currency: 'USDC',
    assetId: 1337, // Asset ID de USDC en Paseo Asset Hub
    decimals: 6,
    isTestnet: true,
    description: 'USDC (USD Coin) en Asset Hub de Paseo (testnet oficial) - Asset ID: 1337 - Existential Deposit: 70000',
    verified: true,
  },
  // Assets en testnet pendiente de verificar
]

/**
 * Obtiene un preset por ID
 */
export function getPresetById(presetId: string): PaymentPreset | undefined {
  return PAYMENT_PRESETS.find((p) => p.id === presetId)
}

/**
 * Obtiene presets por chain
 */
export function getPresetsByChain(chain: ChainName): PaymentPreset[] {
  return PAYMENT_PRESETS.filter((p) => p.chain === chain)
}

/**
 * Obtiene presets por moneda
 */
export function getPresetsByCurrency(currency: string): PaymentPreset[] {
  return PAYMENT_PRESETS.filter((p) => p.currency === currency)
}

/**
 * Obtiene el preset recomendado para producción
 */
export function getRecommendedPreset(): PaymentPreset {
  // En desarrollo, usar PASET_HUB con PAS
  if (process.env.NODE_ENV !== 'production') {
    const devPreset = PAYMENT_PRESETS.find((p) => p.id === 'paset-hub-pas')
    if (devPreset) return devPreset
  }
  // En producción, USDT en Asset Hub (Polkadot)
  return PAYMENT_PRESETS.find((p) => p.id === 'asset-hub-usdt') || PAYMENT_PRESETS[0]
}

/**
 * Obtiene presets verificados (con Asset IDs confirmados)
 */
export function getVerifiedPresets(): PaymentPreset[] {
  return PAYMENT_PRESETS.filter((p) => p.verified)
}

