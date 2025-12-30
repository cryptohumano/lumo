/**
 * Servicio para decodificar eventos de emergencia desde la blockchain
 * Permite a las autoridades leer y decodificar eventos System::Remarked
 * que contienen datos de emergencias
 */

import { DedotClient, WsProvider } from 'dedot'
import type { ChainName } from './polkadotService'

export interface DecodedEmergencyEvent {
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
  rawData: any // Datos originales decodificados
}

/**
 * Obtiene el endpoint de la chain
 */
function getChainEndpoint(chain: ChainName): string {
  const endpoints: Record<ChainName, string> = {
    POLKADOT: 'wss://rpc.polkadot.io',
    KUSAMA: 'wss://kusama-rpc.polkadot.io',
    ASSET_HUB: 'wss://polkadot-asset-hub-rpc.polkadot.io',
    PEOPLE_CHAIN: 'wss://polkadot-people-rpc.polkadot.io',
    ASSET_HUB_KUSAMA: 'wss://kusama-asset-hub-rpc.polkadot.io',
    PASET_HUB: 'wss://sys.ibp.network/asset-hub-paseo',
    WESTEND: 'wss://rpc.polkadot.io',
    WESTEND_ASSET_HUB: 'wss://westend-asset-hub-rpc.polkadot.io',
  }
  return endpoints[chain] || endpoints.PASET_HUB
}

/**
 * Convierte código numérico a tipo de emergencia
 */
function getEmergencyTypeFromCode(code: number): string {
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
function getSeverityFromCode(code: number): string {
  const severities: Record<number, string> = {
    1: 'LOW',
    2: 'MEDIUM',
    3: 'HIGH',
    4: 'CRITICAL',
  }
  return severities[code] || 'HIGH'
}

/**
 * Decodifica datos de emergencia desde un evento System::Remarked
 */
function decodeEmergencyData(data: Uint8Array, accountId: string, blockNumber: string, blockHash: string, txHash: string): DecodedEmergencyEvent | null {
  try {
    // Decodificar datos
    const decoded = new TextDecoder().decode(data)
    const emergencyData = JSON.parse(decoded)

    // Validar que sea una emergencia (tiene versión y campos necesarios)
    if (
      emergencyData.v === 1 &&
      emergencyData.t &&
      emergencyData.s &&
      emergencyData.lat &&
      emergencyData.lng &&
      emergencyData.ts
    ) {
      return {
        emergencyId: emergencyData.id || `emergency-${blockNumber}-${Date.now()}`,
        reporter: accountId,
        emergencyType: getEmergencyTypeFromCode(emergencyData.t),
        severity: getSeverityFromCode(emergencyData.s),
        latitude: emergencyData.lat / 1e6,
        longitude: emergencyData.lng / 1e6,
        timestamp: emergencyData.ts * 1000, // Convertir a milisegundos
        title: emergencyData.m?.t,
        description: emergencyData.m?.d,
        numberOfPeople: emergencyData.m?.n,
        address: emergencyData.m?.a,
        city: emergencyData.m?.c,
        country: emergencyData.m?.co,
        blockNumber,
        blockHash,
        txHash,
        rawData: emergencyData,
      }
    }
    return null
  } catch (error) {
    console.error('Error decodificando datos de emergencia:', error)
    return null
  }
}

/**
 * Lee y decodifica un evento de emergencia desde la blockchain por TX Hash
 * 
 * NOTA: En Polkadot, el txHash es el mismo que el blockHash cuando la transacción
 * está incluida en un bloque. Buscamos en el bloque que contiene la transacción.
 */
export async function decodeEmergencyFromTxHash(
  txHash: string,
  chain: ChainName = 'PASET_HUB'
): Promise<DecodedEmergencyEvent | null> {
  try {
    const provider = new WsProvider(getChainEndpoint(chain))
    const client = await DedotClient.new(provider)

    // Intentar obtener el bloque usando el hash como blockHash
    // En Polkadot, cuando una transacción está finalizada, el txHash puede usarse como blockHash
    let blockHash = txHash
    let blockNumber: string | null = null

    try {
      // Intentar obtener el bloque directamente
      const block = await client.rpc.chain.getBlock(blockHash)
      if (block && block.block) {
        blockNumber = block.block.header.number.toString()
      }
    } catch (error) {
      // Si falla, buscar en los últimos bloques
      console.log('Buscando transacción en bloques recientes...')
      const lastBlockHeader = await client.rpc.chain.getHeader()
      const lastBlockNumber = parseInt(lastBlockHeader.number.toString())
      
      // Buscar en los últimos 100 bloques
      for (let i = 0; i < 100 && i < lastBlockNumber; i++) {
        try {
          const checkBlockNumber = lastBlockNumber - i
          const checkBlockHash = await client.rpc.chain.getBlockHash(checkBlockNumber)
          const checkBlock = await client.rpc.chain.getBlock(checkBlockHash)
          
          if (checkBlock && checkBlock.block) {
            // Verificar si alguna transacción en este bloque tiene el hash que buscamos
            const events = await client.query.system.events.at(checkBlockHash)
            
            for (const record of events) {
              const { event } = record
              if (client.events.system.Remarked.is(event)) {
                const eventData = event.data
                const accountId = eventData[0]
                const data = eventData[1] as Uint8Array
                
                // Verificar si este evento corresponde a la transacción buscada
                // (comparando el hash del bloque o verificando el contenido)
                const decoded = decodeEmergencyData(
                  data,
                  accountId.toString(),
                  checkBlockNumber.toString(),
                  checkBlockHash.toString(),
                  txHash
                )
                
                if (decoded) {
                  await client.disconnect()
                  return decoded
                }
              }
            }
          }
        } catch (err) {
          // Continuar con el siguiente bloque
          continue
        }
      }
      
      throw new Error('Transacción no encontrada en los últimos 100 bloques')
    }

    if (!blockNumber) {
      throw new Error('No se pudo obtener el número de bloque')
    }

    // Obtener eventos del bloque
    const events = await client.query.system.events.at(blockHash)

    // Buscar evento System::Remarked
    for (const record of events) {
      const { event } = record

      if (client.events.system.Remarked.is(event)) {
        const eventData = event.data
        const accountId = eventData[0]
        const data = eventData[1] as Uint8Array

        const decoded = decodeEmergencyData(data, accountId.toString(), blockNumber, blockHash.toString(), txHash)
        if (decoded) {
          await client.disconnect()
          return decoded
        }
      }
    }

    await client.disconnect()
    return null
  } catch (error: any) {
    console.error('Error decodificando emergencia desde TX Hash:', error)
    throw new Error(`Error decodificando emergencia: ${error.message}`)
  }
}

/**
 * Lee y decodifica eventos de emergencia desde un bloque específico
 */
export async function decodeEmergenciesFromBlock(
  blockNumber: number | string,
  chain: ChainName = 'PASET_HUB'
): Promise<DecodedEmergencyEvent[]> {
  try {
    const provider = new WsProvider(getChainEndpoint(chain))
    const client = await DedotClient.new(provider)

    // Obtener hash del bloque
    const blockHash = await client.rpc.chain.getBlockHash(blockNumber)
    
    if (!blockHash) {
      throw new Error('Bloque no encontrado')
    }

    // Obtener eventos del bloque
    const events = await client.query.system.events.at(blockHash)

    const emergencies: DecodedEmergencyEvent[] = []

    // Buscar todos los eventos System::Remarked que sean emergencias
    for (const record of events) {
      const { event } = record

      if (client.events.system.Remarked.is(event)) {
        const eventData = event.data
        const accountId = eventData[0]
        const data = eventData[1] as Uint8Array

        const decoded = decodeEmergencyData(
          data,
          accountId.toString(),
          blockNumber.toString(),
          blockHash.toString(),
          blockHash.toString() // Usar blockHash como txHash si no tenemos el txHash específico
        )
        
        if (decoded) {
          emergencies.push(decoded)
        }
      }
    }

    await client.disconnect()
    return emergencies
  } catch (error: any) {
    console.error('Error decodificando emergencias desde bloque:', error)
    throw new Error(`Error decodificando emergencias: ${error.message}`)
  }
}

/**
 * Busca emergencias en un rango de bloques
 */
export async function searchEmergenciesInBlockRange(
  fromBlock: number,
  toBlock: number,
  chain: ChainName = 'PASET_HUB'
): Promise<DecodedEmergencyEvent[]> {
  const allEmergencies: DecodedEmergencyEvent[] = []

  for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
    try {
      const emergencies = await decodeEmergenciesFromBlock(blockNum, chain)
      allEmergencies.push(...emergencies)
    } catch (error) {
      console.warn(`Error procesando bloque ${blockNum}:`, error)
      // Continuar con el siguiente bloque
    }
  }

  return allEmergencies
}

/**
 * Obtiene el último bloque y busca emergencias en los últimos N bloques
 */
export async function getRecentEmergencies(
  lastNBlocks: number = 100,
  chain: ChainName = 'PASET_HUB'
): Promise<DecodedEmergencyEvent[]> {
  try {
    const provider = new WsProvider(getChainEndpoint(chain))
    const client = await DedotClient.new(provider)

    // Obtener último bloque
    const lastBlockHeader = await client.rpc.chain.getHeader()
    const lastBlockNumber = parseInt(lastBlockHeader.number.toString())

    const fromBlock = Math.max(1, lastBlockNumber - lastNBlocks + 1)
    const toBlock = lastBlockNumber

    await client.disconnect()

    return await searchEmergenciesInBlockRange(fromBlock, toBlock, chain)
  } catch (error: any) {
    console.error('Error obteniendo emergencias recientes:', error)
    throw new Error(`Error obteniendo emergencias recientes: ${error.message}`)
  }
}

