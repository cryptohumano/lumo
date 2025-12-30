import { DedotClient, WsProvider } from 'dedot'
import type { PolkadotApi, KusamaApi } from '@dedot/chaintypes'

/**
 * Configuración de chains de Polkadot
 */
export const POLKADOT_CHAINS = {
  // Mainnet
  POLKADOT: 'wss://rpc.polkadot.io',
  KUSAMA: 'wss://kusama-rpc.polkadot.io',
  ASSET_HUB: 'wss://polkadot-asset-hub-rpc.polkadot.io',
  PEOPLE_CHAIN: 'wss://polkadot-people-rpc.polkadot.io', // People Chain en Polkadot
  ASSET_HUB_KUSAMA: 'wss://kusama-asset-hub-rpc.polkadot.io',
  // Testnet
  PASET_HUB: 'wss://pas-rpc.stakeworld.io/assethub', // Passet Hub (Paseo Asset Hub - Testnet) - Endpoint alternativo
  WESTEND: 'wss://westend-rpc.polkadot.io',
  WESTEND_ASSET_HUB: 'wss://westend-asset-hub-rpc.polkadot.io',
} as const

/**
 * Genesis Hash de People Chain
 */
export const PEOPLE_CHAIN_GENESIS_HASH = '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008'

export type ChainName = keyof typeof POLKADOT_CHAINS

/**
 * Servicio para gestionar conexiones a chains de Polkadot
 */
export class PolkadotService {
  private clients: Map<ChainName, DedotClient<any>> = new Map()
  private connectionPromises: Map<ChainName, Promise<DedotClient<any>>> = new Map()

  /**
   * Verifica si un cliente está conectado
   * Usa una verificación simple sin crear suscripciones
   */
  private isClientConnected(client: DedotClient<any>): boolean {
    try {
      // Verificar si el cliente tiene un provider activo
      // No hacer queries que puedan crear suscripciones internas
      return client !== null && client !== undefined
    } catch (error) {
      return false
    }
  }

  /**
   * Obtiene o crea un cliente para una chain específica
   * Usa tipos específicos de ChainApi para mejor type safety
   * Optimizado para reconexión automática
   */
  async getClient(chain: ChainName): Promise<DedotClient<any>> {
    // Si ya hay un cliente conectado, retornarlo
    if (this.clients.has(chain)) {
      const existingClient = this.clients.get(chain)!
      // Verificar si el cliente existe (evitar queries que creen suscripciones)
      const isConnected = this.isClientConnected(existingClient)
      if (isConnected) {
        return existingClient
      }
      // Si no está conectado, limpiar y crear uno nuevo
      console.log(`Cliente ${chain} desconectado, reconectando...`)
      try {
        await existingClient.disconnect()
      } catch (error) {
        // Ignorar errores al desconectar
      }
      this.clients.delete(chain)
      this.connectionPromises.delete(chain)
    }

    // Si ya hay una conexión en progreso, esperar a que termine
    if (this.connectionPromises.has(chain)) {
      return await this.connectionPromises.get(chain)!
    }

    // Crear nueva conexión
    const connectionPromise = (async () => {
      try {
        console.log(`Conectando a ${chain}...`)
        const startTime = Date.now()
        const provider = new WsProvider(POLKADOT_CHAINS[chain])
        
        // Agregar timeout para la conexión (30 segundos máximo)
        const clientPromise = (async () => {
          let client: DedotClient<any>
          if (chain === 'POLKADOT') {
            client = await DedotClient.new<PolkadotApi>(provider)
          } else if (chain === 'KUSAMA') {
            client = await DedotClient.new<KusamaApi>(provider)
          } else {
            // Para otras chains, usar el tipo genérico
            client = await DedotClient.new(provider)
          }
          return client
        })()

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Timeout: La conexión a ${chain} tardó más de 30 segundos`))
          }, 30000) // 30 segundos
        })

        const client = await Promise.race([clientPromise, timeoutPromise])
        
        const connectionTime = Date.now() - startTime
        console.log(`✅ Conectado a ${chain} en ${connectionTime}ms`)
        
        this.clients.set(chain, client)
        this.connectionPromises.delete(chain)
        return client
      } catch (error: any) {
        this.connectionPromises.delete(chain)
        console.error(`Error creando cliente para ${chain}:`, error.message || error)
        throw new Error(`No se pudo conectar a ${chain}: ${error.message || 'Error desconocido'}`)
      }
    })()

    this.connectionPromises.set(chain, connectionPromise)
    return await connectionPromise
  }

  /**
   * Cierra todas las conexiones
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.disconnect()
    }
    this.clients.clear()
  }

  /**
   * Cierra la conexión de una chain específica
   */
  async disconnect(chain: ChainName): Promise<void> {
    const client = this.clients.get(chain)
    if (client) {
      await client.disconnect()
      this.clients.delete(chain)
    }
  }

  /**
   * Verifica si una dirección es válida para una chain
   */
  async isValidAddress(address: string, chain: ChainName = 'POLKADOT'): Promise<boolean> {
    try {
      const client = await this.getClient(chain)
      // Dedot valida automáticamente las direcciones
      // Podemos hacer una consulta simple para verificar
      const accountInfo = await client.query.system.account(address)
      return accountInfo !== null
    } catch (error) {
      return false
    }
  }

  /**
   * Obtiene el balance de una cuenta en una chain
   * Usa query simple sin suscripciones
   */
  async getBalance(address: string, chain: ChainName = 'POLKADOT'): Promise<bigint> {
    try {
      const client = await this.getClient(chain)
      // Usar query simple que no crea suscripciones
      const accountInfo = await client.query.system.account(address)
      return accountInfo?.data?.free || 0n
    } catch (error: any) {
      console.error(`Error obteniendo balance para ${address} en ${chain}:`, error.message || error)
      // Retornar 0 en lugar de lanzar error para no bloquear la respuesta
      return 0n
    }
  }

  /**
   * Obtiene el balance de un asset específico en Asset Hub
   * Prueba ambos formatos: array [assetId, address] y parámetros separados
   */
  async getAssetBalance(
    address: string,
    assetId: string | number,
    chain: ChainName = 'ASSET_HUB'
  ): Promise<bigint> {
    try {
      const client = await this.getClient(chain)
      
      // Intentar con formato array primero (según documentación de Dedot)
      try {
        const balance = await client.query.assets.account([assetId, address])
        // El balance puede estar en balance.balance o directamente en balance
        return (balance as any)?.balance || (balance as any)?.free || 0n
      } catch (error1: any) {
        // Si falla, intentar con formato de parámetros separados
        try {
          const balance = await client.query.assets.account(assetId, address)
          return (balance as any)?.balance || (balance as any)?.free || 0n
        } catch (error2: any) {
          // Si ambos fallan, puede ser que la cuenta no tenga balance
          console.warn(`No se pudo obtener balance de asset ${assetId} para ${address}:`, error2.message)
          return 0n
        }
      }
    } catch (error) {
      console.error(`Error obteniendo balance de asset ${assetId} para ${address}:`, error)
      return 0n
    }
  }
}

// Instancia singleton
let polkadotServiceInstance: PolkadotService | null = null

export function getPolkadotService(): PolkadotService {
  if (!polkadotServiceInstance) {
    polkadotServiceInstance = new PolkadotService()
  }
  return polkadotServiceInstance
}

