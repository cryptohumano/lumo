/**
 * Servicio para monitorear el estado de la blockchain en tiempo real
 * Muestra bloque actual, tiempo, altura, validadores y detecta remarks de emergencia
 */

import type { ChainName } from './polkadotService'
import { getPolkadotService } from './polkadotService'

export interface BlockchainMonitorData {
  blockNumber: number
  blockHash: string
  blockTime: number // Timestamp en milisegundos
  timestamp: Date
  validators: string[]
  validatorCount: number
  emergencyRemarks: EmergencyRemark[]
  isConnected: boolean
  lastUpdate: Date
}

export interface EmergencyRemark {
  blockNumber: number
  blockHash: string
  reporter: string
  timestamp: number
  emergencyId?: string
  emergencyType?: string
  severity?: string
  rawData: any
}

export interface BlockchainMonitorCallbacks {
  onUpdate: (data: BlockchainMonitorData) => void
  onEmergencyDetected?: (remark: EmergencyRemark) => void
  onError?: (error: Error) => void
}

export class BlockchainMonitor {
  private client: DedotClient<any> | null = null
  private unsubscribe: (() => void) | null = null
  private pollingInterval: NodeJS.Timeout | null = null
  private chain: ChainName
  private callbacks: BlockchainMonitorCallbacks
  private isMonitoring = false
  private lastBlockNumber: number | null = null
  private recentEmergencyRemarks: EmergencyRemark[] = []
  private maxRecentRemarks = 50 // Mantener solo los últimos 50 remarks
  private pollingDelay = 6000 // 6 segundos entre polls

  constructor(chain: ChainName, callbacks: BlockchainMonitorCallbacks) {
    this.chain = chain
    this.callbacks = callbacks
  }

  /**
   * Inicia el monitoreo de la blockchain
   */
  async start(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('⚠️ El monitor ya está activo')
      return
    }

    try {
      console.log(`🔊 Iniciando monitor de blockchain en ${this.chain}...`)
      
      // Usar el servicio de Polkadot para obtener el cliente (reutiliza conexiones)
      const polkadotService = getPolkadotService()
      this.client = await polkadotService.getClient(this.chain)

      console.log(`✅ Conectado a ${this.chain} para monitoreo`)

      // Intentar usar subscribeFinalizedHeads si está disponible
      try {
        if (this.client?.rpc?.chain?.subscribeFinalizedHeads && typeof this.client.rpc.chain.subscribeFinalizedHeads === 'function') {
          // Suscribirse a bloques finalizados
          this.unsubscribe = await this.client.rpc.chain.subscribeFinalizedHeads(
            async (header: any) => {
              await this.processBlock(header)
            }
          )
          console.log(`✅ Suscripción a bloques finalizados activa`)
        } else {
          throw new Error('subscribeFinalizedHeads no disponible')
        }
      } catch (subscribeError: any) {
        // Si no está disponible, usar polling como fallback
        console.warn('⚠️ subscribeFinalizedHeads no disponible, usando polling:', subscribeError.message)
        this.startPolling()
      }

      // Procesar el bloque actual inmediatamente
      await this.pollLatestBlock()

      this.isMonitoring = true
      console.log(`✅ Monitor de blockchain activo en ${this.chain}`)
    } catch (error: any) {
      console.error('❌ Error iniciando monitor de blockchain:', error)
      this.callbacks.onError?.(new Error(`Error iniciando monitor: ${error.message}`))
      throw error
    }
  }

  /**
   * Inicia el polling de bloques (fallback si subscribeFinalizedHeads no está disponible)
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollLatestBlock()
      } catch (error: any) {
        console.error('Error en polling de bloques:', error)
        this.callbacks.onError?.(new Error(`Error en polling: ${error.message}`))
      }
    }, this.pollingDelay)
  }

  /**
   * Obtiene y procesa el último bloque finalizado
   * NOTA: En el frontend, los métodos RPC como getBlockHash y getBlock no están disponibles.
   * Usamos solo query.system.number() para obtener información básica del bloque.
   * Para obtener eventos, el backend debe hacerlo (emergencyBlockchainListener).
   */
  private async pollLatestBlock(): Promise<void> {
    if (!this.client) return

    try {
      // Obtener el número del último bloque usando query.system.number()
      const blockNumber = await this.client.query.system.number()
      if (!blockNumber) {
        console.warn('No se pudo obtener el número del último bloque')
        return
      }

      const blockNumberInt = parseInt(blockNumber.toString())

      // Solo procesar bloques nuevos
      if (this.lastBlockNumber !== null && blockNumberInt <= this.lastBlockNumber) {
        return
      }
      this.lastBlockNumber = blockNumberInt

      // Intentar obtener validadores (esto puede funcionar)
      let validators: string[] = []
      try {
        const sessionValidators = await this.client.query.session.validators()
        if (sessionValidators && Array.isArray(sessionValidators)) {
          validators = sessionValidators.map((v: any) => v.toString())
        }
      } catch (error) {
        try {
          const stakingValidators = await this.client.query.staking?.validators?.()
          if (stakingValidators && Array.isArray(stakingValidators)) {
            validators = stakingValidators.map((v: any) => v.toString())
          }
        } catch (error2) {
          // Ignorar, dejar array vacío
        }
      }

      // Obtener timestamp actual (aproximado)
      let blockTime = Date.now()
      try {
        const timestamp = await this.client.query.timestamp.now()
        if (timestamp) {
          const ts = parseInt(timestamp.toString())
          blockTime = ts < 946684800000 ? ts * 1000 : ts
        }
      } catch (error) {
        // Usar Date.now() como fallback
      }

      // Actualizar datos del monitor (sin eventos, ya que no podemos obtenerlos sin RPC)
      // Los eventos se obtienen desde el backend que tiene acceso completo a RPC
      this.callbacks.onUpdate({
        blockNumber: blockNumberInt,
        blockHash: '', // No disponible sin RPC en frontend
        blockTime,
        timestamp: new Date(blockTime),
        validators,
        validatorCount: validators.length,
        emergencyRemarks: this.recentEmergencyRemarks, // Mantener los que ya tenemos
        isConnected: true,
        lastUpdate: new Date(),
      })
    } catch (error: any) {
      console.error('Error obteniendo último bloque:', error)
      // No lanzar el error, solo loguearlo para que el polling continúe
      this.callbacks.onError?.(new Error(`Error obteniendo último bloque: ${error.message}`))
    }
  }

  /**
   * Procesa un bloque y actualiza la información
   */
  private async processBlock(header: any): Promise<void> {
    try {
      const blockNumber = parseInt(header.number.toString())
      // El hash puede estar en header.hash o necesitamos obtenerlo
      let blockHash = header.hash
      
      // Si no hay hash, obtenerlo del número de bloque
      if (!blockHash) {
        blockHash = await this.client!.rpc.chain.getBlockHash(blockNumber)
      }

      // Solo procesar bloques nuevos
      if (this.lastBlockNumber !== null && blockNumber <= this.lastBlockNumber) {
        return
      }
      this.lastBlockNumber = blockNumber

      // Obtener información del bloque
      const block = await this.client!.rpc.chain.getBlock(blockHash)
      
      // Obtener eventos del bloque
      const events = await this.client!.query.system.events.at(blockHash)

      // Buscar validadores
      let validators: string[] = []
      try {
        // Intentar obtener validadores del pallet de session
        const sessionValidators = await this.client!.query.session.validators()
        if (sessionValidators && Array.isArray(sessionValidators)) {
          validators = sessionValidators.map((v: any) => v.toString())
        }
      } catch (error) {
        // Si no hay pallet de session, intentar obtener de otros pallets
        try {
          // Algunas chains usan otros pallets para validadores
          const stakingValidators = await this.client!.query.staking?.validators?.()
          if (stakingValidators && Array.isArray(stakingValidators)) {
            validators = stakingValidators.map((v: any) => v.toString())
          }
        } catch (error2) {
          // Si no se pueden obtener validadores, dejar array vacío
          console.warn('No se pudo obtener validadores:', error2)
        }
      }

      // Buscar eventos System::Remarked que sean emergencias
      const emergencyRemarksInBlock: EmergencyRemark[] = []
      
      for (const record of events) {
        const { event } = record

        if (this.client!.events.system.Remarked.is(event)) {
          const remark = await this.processRemarkedEvent(event, blockNumber, blockHash)
          if (remark) {
            emergencyRemarksInBlock.push(remark)
            this.recentEmergencyRemarks.unshift(remark)
            // Mantener solo los últimos N remarks
            if (this.recentEmergencyRemarks.length > this.maxRecentRemarks) {
              this.recentEmergencyRemarks = this.recentEmergencyRemarks.slice(0, this.maxRecentRemarks)
            }
            // Notificar callback
            this.callbacks.onEmergencyDetected?.(remark)
          }
        }
      }

      // Obtener timestamp del bloque
      let blockTime = Date.now()
      try {
        // Intentar obtener el timestamp del pallet Timestamp
        const timestamp = await this.client!.query.timestamp.now()
        if (timestamp) {
          // El timestamp viene en milisegundos en algunas chains, en otras en segundos
          const ts = parseInt(timestamp.toString())
          // Si es menor que un timestamp razonable (año 2000), asumir que está en segundos
          blockTime = ts < 946684800000 ? ts * 1000 : ts
        }
      } catch (error) {
        // Si no hay pallet de timestamp, buscar en los extrinsics del bloque
        try {
          const timestampExtrinsic = block.block?.extrinsics?.find((ext: any) => 
            ext.method?.pallet === 'Timestamp' || ext.method?.section === 'set'
          )
          if (timestampExtrinsic) {
            const ts = parseInt(timestampExtrinsic.method?.args?.[0]?.toString() || Date.now().toString())
            blockTime = ts < 946684800000 ? ts * 1000 : ts
          }
        } catch (error2) {
          // Usar tiempo actual como fallback
          blockTime = Date.now()
        }
      }

      // Construir datos de monitoreo
      const monitorData: BlockchainMonitorData = {
        blockNumber,
        blockHash: blockHash.toString(),
        blockTime,
        timestamp: new Date(blockTime),
        validators,
        validatorCount: validators.length,
        emergencyRemarks: this.recentEmergencyRemarks.slice(0, 10), // Mostrar solo los últimos 10
        isConnected: true,
        lastUpdate: new Date(),
      }

      // Notificar actualización
      this.callbacks.onUpdate(monitorData)
    } catch (error: any) {
      console.error(`❌ Error procesando bloque ${header.number}:`, error)
      this.callbacks.onError?.(new Error(`Error procesando bloque: ${error.message}`))
    }
  }

  /**
   * Procesa un evento System::Remarked y verifica si es una emergencia
   */
  private async processRemarkedEvent(
    event: any,
    blockNumber: number,
    blockHash: any
  ): Promise<EmergencyRemark | null> {
    try {
      const eventData = event.data
      // eventData es un array: [accountId, data]
      const accountId = eventData[0]
      const data = eventData[1] as Uint8Array

      // Decodificar datos
      const decoded = new TextDecoder().decode(data)
      const emergencyData = JSON.parse(decoded)

      // Validar que sea una emergencia (nuestro remark)
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
        // Es una emergencia válida (nuestro remark)
        return {
          blockNumber,
          blockHash: blockHash.toString(),
          reporter: accountId.toString(),
          timestamp: emergencyData.ts * 1000, // Convertir a milisegundos
          emergencyId: emergencyData.id,
          emergencyType: this.getEmergencyTypeFromCode(emergencyData.t),
          severity: this.getSeverityFromCode(emergencyData.s),
          rawData: emergencyData,
        }
      }
      return null
    } catch (error) {
      // No es una emergencia o datos inválidos, ignorar silenciosamente
      return null
    }
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
   * Detiene el monitoreo
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    
    // No desconectar el cliente ya que es compartido por el servicio de Polkadot
    // Solo limpiar la referencia
    this.client = null
    
    this.isMonitoring = false
    console.log('🛑 Monitor de blockchain detenido')
  }

  /**
   * Verifica si está monitoreando
   */
  getIsMonitoring(): boolean {
    return this.isMonitoring
  }
}

/**
 * Crea un monitor de blockchain
 */
export function createBlockchainMonitor(
  chain: ChainName,
  callbacks: BlockchainMonitorCallbacks
): BlockchainMonitor {
  return new BlockchainMonitor(chain, callbacks)
}

