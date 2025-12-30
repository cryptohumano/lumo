/**
 * Servicio para escuchar eventos de emergencias en la blockchain de Polkadot
 * 
 * Este servicio se suscribe a eventos System::Remarked y filtra solo emergencias
 * basándose en la estructura de datos (campo 'v' = 1 y campos requeridos)
 */

import { DedotClient, WsProvider } from 'dedot'
import type { ChainName } from '../services/polkadotService'

export interface EmergencyOnChainEvent {
  emergencyId: string
  reporter: string
  emergencyType: string
  severity: string
  latitude: number
  longitude: number
  timestamp: number
  title?: string
  description?: string
  numberOfPeople?: number
  address?: string
  city?: string
  country?: string
  blockNumber: string
  blockHash: string
  txHash: string
}

export interface EmergencyListenerCallbacks {
  onEmergencyDetected: (emergency: EmergencyOnChainEvent) => Promise<void> | void
  onError?: (error: Error) => void
}

/**
 * Servicio para escuchar emergencias en la blockchain
 */
export class EmergencyBlockchainListener {
  private client: DedotClient<any> | null = null
  private unsubscribe: (() => void) | null = null
  private isListening = false
  private lastBlockNumber: number | null = null
  private chain: ChainName
  private callbacks: EmergencyListenerCallbacks
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 5000 // 5 segundos
  private reconnectTimer: NodeJS.Timeout | null = null
  private isReconnecting = false

  constructor(chain: ChainName, callbacks: EmergencyListenerCallbacks) {
    this.chain = chain
    this.callbacks = callbacks
  }

  /**
   * Convierte código numérico a tipo de emergencia
   */
  private getEmergencyTypeFromCode(code: number): string {
    const types: Record<number, string> = {
      1: 'ACCIDENT',
      2: 'MEDICAL',
      3: 'FIRE',
      4: 'CRIME',
      5: 'SECURITY_THREAT',
      6: 'MOUNTAIN_RESCUE',
      7: 'WATER_RESCUE',
      8: 'OTHER',
    }
    return types[code] || 'OTHER'
  }

  /**
   * Convierte código numérico a severidad
   */
  private getSeverityFromCode(code: number): string {
    const severities: Record<number, string> = {
      1: 'LOW',
      2: 'MEDIUM',
      3: 'HIGH',
      4: 'CRITICAL',
    }
    return severities[code] || 'HIGH'
  }

  /**
   * Obtiene el endpoint de la chain
   */
  private getChainEndpoint(chain: ChainName): string {
    const endpoints: Record<ChainName, string> = {
      POLKADOT: 'wss://rpc.polkadot.io',
      KUSAMA: 'wss://kusama-rpc.polkadot.io',
      ASSET_HUB: 'wss://polkadot-asset-hub-rpc.polkadot.io',
      PEOPLE_CHAIN: 'wss://polkadot-people-rpc.polkadot.io',
      ASSET_HUB_KUSAMA: 'wss://kusama-asset-hub-rpc.polkadot.io',
      PASET_HUB: 'wss://sys.ibp.network/asset-hub-paseo',
      WESTEND: 'wss://westend-rpc.polkadot.io',
      WESTEND_ASSET_HUB: 'wss://westend-asset-hub-rpc.polkadot.io',
    }
    return endpoints[chain] || endpoints.PASET_HUB
  }

  /**
   * Inicia la escucha de eventos de emergencia
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.warn('⚠️ Ya se está escuchando eventos de emergencia')
      return
    }

    try {
      console.log(`🔊 Iniciando listener de emergencias en ${this.chain}...`)
      
      // Conectar a la blockchain
      const provider = new WsProvider(this.getChainEndpoint(this.chain))
      this.client = await DedotClient.new(provider)

      console.log(`✅ Conectado a ${this.chain}`)

      // Suscribirse a bloques finalizados
      this.unsubscribe = await this.client.rpc.chain.subscribeFinalizedHeads(
        async (header: any) => {
          await this.processBlock(header)
          // Resetear contador de reconexión si recibimos bloques
          this.reconnectAttempts = 0
        }
      )

      this.isListening = true
      this.reconnectAttempts = 0
      console.log(`✅ Escuchando eventos de emergencia en ${this.chain}`)
      
      // Configurar manejo de errores de conexión
      this.setupConnectionHandlers()
    } catch (error: any) {
      console.error('❌ Error iniciando listener de emergencias:', error)
      this.callbacks.onError?.(new Error(`Error iniciando listener: ${error.message}`))
      // Intentar reconectar automáticamente
      this.scheduleReconnect()
      throw error
    }
  }

  /**
   * Configura handlers para detectar pérdida de conexión
   */
  private setupConnectionHandlers(): void {
    if (!this.client) return

    // Detectar cuando se pierde la conexión
    // Dedot puede emitir eventos de error o desconexión
    // Por ahora, monitoreamos si el cliente sigue activo
    const checkConnection = setInterval(() => {
      if (!this.isListening || !this.client) {
        clearInterval(checkConnection)
        return
      }

      // Si no hemos recibido bloques en 60 segundos, puede haber un problema
      // (esto es una heurística simple, se puede mejorar)
    }, 60000)
  }

  /**
   * Programa una reconexión automática
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Máximo de intentos de reconexión alcanzado (${this.maxReconnectAttempts})`)
      return
    }

    this.isReconnecting = true
    this.reconnectAttempts++

    const delay = this.reconnectDelay * this.reconnectAttempts // Backoff exponencial

    console.log(`🔄 Programando reconexión en ${delay / 1000} segundos (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    this.reconnectTimer = setTimeout(async () => {
      try {
        this.isListening = false
        if (this.unsubscribe) {
          this.unsubscribe()
          this.unsubscribe = null
        }
        if (this.client) {
          await this.client.disconnect()
          this.client = null
        }

        console.log(`🔄 Intentando reconectar (intento ${this.reconnectAttempts})...`)
        await this.start()
        this.isReconnecting = false
        console.log('✅ Reconexión exitosa')
      } catch (error: any) {
        console.error(`❌ Error en reconexión (intento ${this.reconnectAttempts}):`, error.message)
        this.isReconnecting = false
        // Intentar de nuevo
        this.scheduleReconnect()
      }
    }, delay)
  }

  /**
   * Procesa un bloque y busca eventos de emergencia
   */
  private async processBlock(header: any): Promise<void> {
    try {
      const blockNumber = parseInt(header.number.toString())

      // Solo procesar bloques nuevos
      if (this.lastBlockNumber !== null && blockNumber <= this.lastBlockNumber) {
        return
      }
      this.lastBlockNumber = blockNumber

      const blockHash = header.hash
      
      // Obtener eventos del bloque
      const events = await this.client!.query.system.events.at(blockHash)

      // Buscar eventos System::Remarked
      for (const record of events) {
        const { event } = record

        if (this.client!.events.system.Remarked.is(event)) {
          await this.processRemarkedEvent(event, blockNumber, blockHash)
        }
      }
    } catch (error: any) {
      console.error(`❌ Error procesando bloque ${header.number}:`, error)
      this.callbacks.onError?.(new Error(`Error procesando bloque: ${error.message}`))
      
      // Si el error es de conexión, intentar reconectar
      const errorMessage = error.message?.toLowerCase() || ''
      if (
        errorMessage.includes('connection') ||
        errorMessage.includes('disconnect') ||
        errorMessage.includes('websocket') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout')
      ) {
        console.warn('⚠️ Error de conexión detectado, programando reconexión...')
        this.scheduleReconnect()
      }
    }
  }

  /**
   * Procesa un evento System::Remarked y verifica si es una emergencia
   */
  private async processRemarkedEvent(
    event: any,
    blockNumber: number,
    blockHash: any
  ): Promise<void> {
    try {
      const eventData = event.data
      // eventData es un array: [accountId, data]
      const accountId = eventData[0]
      const data = eventData[1] as Uint8Array

      // Decodificar datos
      const decoded = new TextDecoder().decode(data)
      const emergencyData = JSON.parse(decoded)

      // Validar que sea una emergencia
      // Debe tener:
      // - v: 1 (versión)
      // - t: tipo de emergencia (código numérico)
      // - s: severidad (código numérico)
      // - lat: latitud (i32 * 1e6)
      // - lng: longitud (i32 * 1e6)
      // - ts: timestamp (u64 en segundos)
      if (
        emergencyData.v === 1 &&
        emergencyData.t &&
        emergencyData.s &&
        emergencyData.lat &&
        emergencyData.lng &&
        emergencyData.ts
      ) {
        // Es una emergencia válida
        const emergency: EmergencyOnChainEvent = {
          emergencyId: emergencyData.id || `emergency-${blockNumber}-${Date.now()}`,
          reporter: accountId.toString(),
          emergencyType: this.getEmergencyTypeFromCode(emergencyData.t),
          severity: this.getSeverityFromCode(emergencyData.s),
          latitude: emergencyData.lat / 1e6,
          longitude: emergencyData.lng / 1e6,
          timestamp: emergencyData.ts * 1000, // Convertir a milisegundos
          title: emergencyData.m?.t,
          description: emergencyData.m?.d,
          numberOfPeople: emergencyData.m?.n,
          address: emergencyData.m?.a,
          city: emergencyData.m?.c,
          country: emergencyData.m?.co,
          blockNumber: blockNumber.toString(),
          blockHash: blockHash.toString(),
          txHash: blockHash.toString(), // En Polkadot, el blockHash puede usarse como txHash
        }

        console.log(`🚨 Emergencia detectada en bloque ${blockNumber}:`, {
          id: emergency.emergencyId,
          type: emergency.emergencyType,
          severity: emergency.severity,
          location: `${emergency.latitude}, ${emergency.longitude}`,
        })

        // Notificar al callback
        await this.callbacks.onEmergencyDetected(emergency)
      }
    } catch (error) {
      // No es una emergencia o datos inválidos, ignorar silenciosamente
      // (puede ser otro tipo de remark)
    }
  }

  /**
   * Detiene la escucha de eventos
   */
  stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    
    if (this.client) {
      this.client.disconnect().catch(() => {
        // Ignorar errores al desconectar
      })
      this.client = null
    }
    
    this.isListening = false
    this.isReconnecting = false
    console.log('🛑 Listener de emergencias detenido')
  }

  /**
   * Verifica si está escuchando
   */
  getIsListening(): boolean {
    return this.isListening
  }

  /**
   * Obtiene el último bloque procesado
   */
  getLastBlockNumber(): number | null {
    return this.lastBlockNumber
  }
}

/**
 * Crea y configura un listener de emergencias
 * 
 * @example
 * ```typescript
 * const listener = createEmergencyListener('PASET_HUB', {
 *   onEmergencyDetected: async (emergency) => {
 *     // Guardar en base de datos
 *     await prisma.emergency.create({
 *       data: {
 *         emergencyType: emergency.emergencyType,
 *         severity: emergency.severity,
 *         latitude: emergency.latitude,
 *         longitude: emergency.longitude,
 *         // ... otros campos
 *         onChainTxHash: emergency.txHash,
 *         onChainBlockNumber: emergency.blockNumber,
 *       }
 *     })
 *     
 *     // Notificar a servicios de emergencia
 *     await notifyEmergencyServices(emergency)
 *   },
 *   onError: (error) => {
 *     console.error('Error en listener:', error)
 *   }
 * })
 * 
 * await listener.start()
 * ```
 */
export function createEmergencyListener(
  chain: ChainName,
  callbacks: EmergencyListenerCallbacks
): EmergencyBlockchainListener {
  return new EmergencyBlockchainListener(chain, callbacks)
}

