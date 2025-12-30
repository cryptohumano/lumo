import { DedotClient, WsProvider } from 'dedot'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
// Tipos de ChainApi para mejor autocompletado y type safety
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

export type ChainName = keyof typeof POLKADOT_CHAINS

/**
 * Servicio para interactuar con Polkadot desde el frontend
 */
export class PolkadotService {
  private clients: Map<ChainName, DedotClient<any>> = new Map()

  /**
   * Verifica si un cliente está conectado
   */
  private isClientConnected(client: DedotClient<any>): boolean {
    try {
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
    }

    try {
      console.log(`🔌 Conectando a ${chain} (${POLKADOT_CHAINS[chain]})...`)
      const startTime = Date.now()
      const provider = new WsProvider(POLKADOT_CHAINS[chain])
      
      // Agregar timeout para la conexión (30 segundos máximo)
      const connectionPromise = (async () => {
        // Usar tipos específicos según la chain para mejor autocompletado
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

      const client = await Promise.race([connectionPromise, timeoutPromise])
      const connectionTime = Date.now() - startTime
      
      console.log(`✅ Conectado a ${chain} en ${connectionTime}ms`)
      this.clients.set(chain, client)
      return client
    } catch (error: any) {
      console.error(`❌ Error creando cliente para ${chain}:`, error)
      const errorMessage = error.message || error.toString() || 'Error desconocido'
      throw new Error(`No se pudo conectar a ${chain}: ${errorMessage}`)
    }
  }

  /**
   * Conecta a una wallet de Polkadot
   */
  async connectWallet(): Promise<InjectedAccountWithMeta[]> {
    const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp')
    
    // Silenciar errores de extensiones no relacionadas (MetaMask, Sporran, etc.)
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    console.error = (...args: any[]) => {
      const message = args[0]?.message || args[0] || ''
      if (
        typeof message === 'string' &&
        (message.includes('MetaMask') || 
         message.includes('Sporran') || 
         message.includes('Could not establish connection') ||
         message.includes('Receiving end does not exist') ||
         message.includes('Failed to connect'))
      ) {
        // Ignorar estos errores
        return
      }
      originalConsoleError(...args)
    }
    console.warn = (...args: any[]) => {
      const message = args[0]?.message || args[0] || ''
      if (
        typeof message === 'string' &&
        (message.includes('MetaMask') || 
         message.includes('Sporran') || 
         message.includes('Could not establish connection') ||
         message.includes('Receiving end does not exist'))
      ) {
        // Ignorar estos warnings
        return
      }
      originalConsoleWarn(...args)
    }
    
    try {
      // Habilitar extensión
      // web3Enable puede lanzar errores de otras extensiones (MetaMask, Sporran, etc.)
      // pero estos no afectan la funcionalidad de Polkadot
      const extensions = await web3Enable('Lumo')
      
      if (extensions.length === 0) {
        throw new Error('No se encontró extensión de wallet de Polkadot. Por favor instala Polkadot.js Extension o Talisman.')
      }

      // Obtener cuentas
      const accounts = await web3Accounts()
      
      if (accounts.length === 0) {
        throw new Error('No se encontraron cuentas en la wallet. Por favor crea una cuenta primero.')
      }

      return accounts
    } catch (error: any) {
      // Si el error es sobre otras extensiones (MetaMask, Sporran, etc.), ignorarlo
      // y reintentar solo con Polkadot
      if (error.message?.includes('MetaMask') || 
          error.message?.includes('Sporran') ||
          error.message?.includes('Could not establish connection') ||
          error.message?.includes('Receiving end does not exist')) {
        // Reintentar solo obtener cuentas
        try {
          const accounts = await web3Accounts()
          if (accounts.length === 0) {
            throw new Error('No se encontraron cuentas en la wallet. Por favor crea una cuenta primero.')
          }
          return accounts
        } catch (retryError: any) {
          throw new Error('No se encontró extensión de wallet de Polkadot. Por favor instala Polkadot.js Extension o Talisman.')
        }
      }
      // Si es otro tipo de error, lanzarlo
      throw error
    } finally {
      // Restaurar console.error y console.warn
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  }

  /**
   * Firma un mensaje con una wallet
   * Nota: Polkadot.js extension automáticamente agrega el prefijo <Bytes>...</Bytes>
   * al mensaje antes de firmarlo, por lo que no necesitamos hacerlo manualmente
   */
  async signMessage(
    address: string,
    message: string
  ): Promise<string> {
    const { web3FromAddress } = await import('@polkadot/extension-dapp')
    
    const injector = await web3FromAddress(address)
    
    if (!injector.signer) {
      throw new Error('No se pudo obtener el signer de la wallet')
    }

    // Firmar mensaje usando signRaw
    // Polkadot.js extension automáticamente:
    // 1. Agrega el prefijo <Bytes>...</Bytes> al mensaje
    // 2. Convierte el mensaje a bytes
    // 3. Firma los bytes
    const signature = await injector.signer.signRaw({
      address,
      data: message, // El mensaje como string, la extensión lo procesará
      type: 'bytes', // Indicar que es bytes
    })

    // La firma viene en formato hex (con o sin prefijo 0x)
    // Asegurarnos de que siempre tenga el formato correcto
    let sigHex = signature.signature
    if (!sigHex.startsWith('0x')) {
      sigHex = '0x' + sigHex
    }

    return sigHex
  }

  /**
   * Transfiere tokens
   */
  async transfer(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    chain: ChainName = 'POLKADOT',
    assetId?: string | number
  ): Promise<string> {
    const client = await this.getClient(chain)
    const { web3FromAddress } = await import('@polkadot/extension-dapp')
    
    const injector = await web3FromAddress(fromAddress)
    
    if (!injector.signer) {
      throw new Error('No se pudo obtener el signer de la wallet')
    }

    let txHash: string

    if (assetId && chain.includes('ASSET_HUB')) {
      // Transferencia de asset en Asset Hub
      const tx = client.tx.assets.transfer(assetId, toAddress, amount)
      txHash = await tx.signAndSend(fromAddress, { signer: injector.signer })
    } else {
      // Transferencia de token nativo (DOT, KSM, etc.)
      const tx = client.tx.balances.transferKeepAlive(toAddress, amount)
      txHash = await tx.signAndSend(fromAddress, { signer: injector.signer })
    }

    return txHash
  }

  /**
   * Obtiene el balance de una cuenta
   */
  async getBalance(
    address: string,
    chain: ChainName = 'POLKADOT'
  ): Promise<bigint> {
    try {
      console.log(`📊 Consultando balance de ${address} en ${chain}...`)
      const client = await this.getClient(chain)
      const queryStartTime = Date.now()
      const accountInfo = await client.query.system.account(address)
      const queryTime = Date.now() - queryStartTime
      
      const balance = accountInfo?.data?.free || 0n
      console.log(`✅ Balance obtenido en ${queryTime}ms: ${balance.toString()}`)
      return balance
    } catch (error: any) {
      console.error(`❌ Error obteniendo balance para ${address} en ${chain}:`, error)
      const errorMessage = error.message || error.toString() || 'Error desconocido'
      throw new Error(`Error al obtener balance: ${errorMessage}`)
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
          console.error(`Error obteniendo balance de asset ${assetId} para ${address}:`, error2)
          throw new Error(`No se pudo obtener el balance del asset: ${error2.message || 'Error desconocido'}`)
        }
      }
    } catch (error: any) {
      console.error(`Error obteniendo balance de asset ${assetId} para ${address}:`, error)
      throw error
    }
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
}

// Instancia singleton
let polkadotServiceInstance: PolkadotService | null = null

export function getPolkadotService(): PolkadotService {
  if (!polkadotServiceInstance) {
    polkadotServiceInstance = new PolkadotService()
  }
  return polkadotServiceInstance
}

