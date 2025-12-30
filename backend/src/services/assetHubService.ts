import { getPolkadotService } from './polkadotService'
import type { ChainName } from './polkadotService'

export interface AssetInfo {
  assetId: string | number
  name: string
  symbol: string
  decimals: number
  minBalance: bigint
  supply: bigint
  accounts: number
  status: 'Live' | 'Frozen' | 'Destroying'
}

/**
 * Servicio para interactuar con Asset Hub y PassetHub
 * Proporciona métodos para consultar información de assets, balances, etc.
 */
export class AssetHubService {
  /**
   * Obtiene información de un asset en Asset Hub o PassetHub
   */
  async getAssetInfo(
    assetId: string | number,
    chain: ChainName = 'ASSET_HUB'
  ): Promise<AssetInfo | null> {
    const polkadotService = getPolkadotService()
    const client = await polkadotService.getClient(chain)
    
    try {
      // Obtener información del asset
      const asset = await client.query.assets.asset(assetId)
      const metadata = await client.query.assets.metadata(assetId)
      
      if (!asset || !metadata) {
        return null
      }
      
      // Decodificar nombre y símbolo (vienen en hex)
      const decodeHex = (hex: string): string => {
        try {
          const cleanHex = hex.replace(/^0x/, '')
          return Buffer.from(cleanHex, 'hex').toString('utf8').replace(/\0/g, '').trim()
        } catch {
          return hex
        }
      }
      
      return {
        assetId,
        name: metadata.name ? decodeHex(metadata.name) : 'Unknown',
        symbol: metadata.symbol ? decodeHex(metadata.symbol) : 'Unknown',
        decimals: metadata.decimals || 0,
        minBalance: metadata.minBalance || 0n,
        supply: asset.supply || 0n,
        accounts: asset.accounts || 0,
        status: asset.status || 'Live',
      }
    } catch (error) {
      console.error(`Error obteniendo información de asset ${assetId} en ${chain}:`, error)
      return null
    }
  }

  /**
   * Obtiene el balance de un asset para una dirección
   */
  async getAssetBalance(
    address: string,
    assetId: string | number,
    chain: ChainName = 'ASSET_HUB'
  ): Promise<bigint> {
    const polkadotService = getPolkadotService()
    return await polkadotService.getAssetBalance(address, assetId, chain)
  }

  /**
   * Verifica si una dirección tiene suficiente balance de un asset
   */
  async hasSufficientBalance(
    address: string,
    assetId: string | number,
    amount: bigint,
    chain: ChainName = 'ASSET_HUB'
  ): Promise<boolean> {
    const balance = await this.getAssetBalance(address, assetId, chain)
    return balance >= amount
  }

  /**
   * Obtiene el balance de DOT/KSM (token nativo) necesario para fees
   */
  async getNativeBalance(
    address: string,
    chain: ChainName = 'ASSET_HUB'
  ): Promise<bigint> {
    const polkadotService = getPolkadotService()
    return await polkadotService.getBalance(address, chain)
  }

  /**
   * Verifica si una dirección tiene suficiente balance nativo para pagar fees
   */
  async hasSufficientNativeBalance(
    address: string,
    minBalance: bigint,
    chain: ChainName = 'ASSET_HUB'
  ): Promise<boolean> {
    const balance = await this.getNativeBalance(address, chain)
    return balance >= minBalance
  }
}

// Instancia singleton
let assetHubServiceInstance: AssetHubService | null = null

export function getAssetHubService(): AssetHubService {
  if (!assetHubServiceInstance) {
    assetHubServiceInstance = new AssetHubService()
  }
  return assetHubServiceInstance
}




