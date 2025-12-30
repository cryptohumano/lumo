/**
 * Servicio para reportar emergencias directamente a la blockchain de Polkadot
 * Usa System::remarkWithEvent para almacenar datos críticos de emergencia
 */

import { getPolkadotService } from './polkadotService'
import type { ChainName } from './polkadotService'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

export interface EmergencyOnChainData {
  // Datos críticos que van a la blockchain
  emergencyType: string
  severity: string
  latitude: number  // Se convertirá a i32 * 1e6
  longitude: number // Se convertirá a i32 * 1e6
  timestamp: number // Unix timestamp en ms
  
  // Metadata adicional (comprimida)
  title?: string
  description?: string
  numberOfPeople?: number
  address?: string
  city?: string
  country?: string
}

export interface EmergencyReportResult {
  success: boolean
  txHash?: string
  blockNumber?: string
  error?: string
}

/**
 * Prepara datos optimizados para remarkWithEvent
 * 
 * NOTA: System::remarkWithEvent acepta Vec<u8> (bytes)
 * Usa nombres de campos cortos para reducir el tamaño
 */
function prepareRemarkData(data: any): Uint8Array {
  // Convertir a JSON compacto (sin espacios)
  const jsonString = JSON.stringify(data)
  
  // Verificar tamaño
  const sizeInBytes = new TextEncoder().encode(jsonString).length
  if (sizeInBytes > 32000) {
    console.warn(`⚠️ Datos muy grandes (${sizeInBytes} bytes). Considera reducir el tamaño.`)
  }
  
  return new TextEncoder().encode(jsonString)
}

/**
 * Genera un hash único para la emergencia
 */
function generateEmergencyId(
  reporter: string,
  timestamp: number,
  latitude: number,
  longitude: number
): string {
  const data = `${reporter}-${timestamp}-${latitude}-${longitude}`
  // Usar Web Crypto API para generar hash
  // En producción, esto se puede hacer más robusto
  return btoa(data).slice(0, 32)
}

/**
 * Obtiene información detallada de la transacción antes de enviarla
 * Incluye fee estimado, datos a enviar, y metadata
 */
export async function getEmergencyTransactionInfo(
  account: InjectedAccountWithMeta,
  emergencyData: EmergencyOnChainData,
  chain: ChainName
): Promise<{
  chain: ChainName
  account: string
  fee: bigint | null
  feeFormatted: string
  currency: string
  decimals: number
  dataSize: number
  dataPreview: any
  extrinsic: string
  endpoint: string
}> {
  const polkadotService = getPolkadotService()
  const client = await polkadotService.getClient(chain)

  // Preparar datos
  const criticalData = {
    v: 1,
    id: generateEmergencyId(
      account.address,
      emergencyData.timestamp,
      emergencyData.latitude,
      emergencyData.longitude
    ),
    t: getEmergencyTypeCode(emergencyData.emergencyType),
    s: getSeverityCode(emergencyData.severity),
    lat: Math.round(emergencyData.latitude * 1e6),
    lng: Math.round(emergencyData.longitude * 1e6),
    ts: Math.floor(emergencyData.timestamp / 1000),
    m: {
      t: emergencyData.title?.slice(0, 100),
      d: emergencyData.description?.slice(0, 500),
      n: emergencyData.numberOfPeople || 1,
      a: emergencyData.address?.slice(0, 200),
      c: emergencyData.city,
      co: emergencyData.country,
    },
  }

  const dataBytes = prepareRemarkData(criticalData)
  const extrinsic = client.tx.system.remarkWithEvent(dataBytes)

  // Obtener fee
  let fee: bigint | null = null
  try {
    const paymentInfo = await extrinsic.paymentInfo(account.address)
    fee = paymentInfo.partialFee || null
  } catch (error) {
    console.warn('No se pudo obtener información de pago:', error)
  }

  // Obtener información de la chain (token, decimals, endpoint)
  const chainInfo = getChainInfo(chain)
  
  // Formatear fee
  const feeFormatted = fee 
    ? formatUnits(fee, chainInfo.decimals)
    : 'N/A'

  return {
    chain,
    account: account.address,
    fee,
    feeFormatted,
    currency: chainInfo.currency,
    decimals: chainInfo.decimals,
    dataSize: dataBytes.length,
    dataPreview: criticalData,
    extrinsic: 'System::remarkWithEvent',
    endpoint: chainInfo.endpoint,
  }
}

/**
 * Obtiene información de la chain (token, decimals, endpoint)
 */
function getChainInfo(chain: ChainName): {
  currency: string
  decimals: number
  endpoint: string
} {
  const POLKADOT_CHAINS = {
    POLKADOT: { currency: 'DOT', decimals: 10, endpoint: 'wss://rpc.polkadot.io' },
    KUSAMA: { currency: 'KSM', decimals: 12, endpoint: 'wss://kusama-rpc.polkadot.io' },
    ASSET_HUB: { currency: 'DOT', decimals: 10, endpoint: 'wss://polkadot-asset-hub-rpc.polkadot.io' },
    PEOPLE_CHAIN: { currency: 'DOT', decimals: 10, endpoint: 'wss://polkadot-people-rpc.polkadot.io' },
    ASSET_HUB_KUSAMA: { currency: 'KSM', decimals: 12, endpoint: 'wss://kusama-asset-hub-rpc.polkadot.io' },
    PASET_HUB: { currency: 'PAS', decimals: 10, endpoint: 'wss://sys.ibp.network/asset-hub-paseo' },
    WESTEND: { currency: 'WND', decimals: 12, endpoint: 'wss://westend-rpc.polkadot.io' },
    WESTEND_ASSET_HUB: { currency: 'WND', decimals: 12, endpoint: 'wss://westend-asset-hub-rpc.polkadot.io' },
  }

  return POLKADOT_CHAINS[chain] || { currency: 'DOT', decimals: 10, endpoint: '' }
}

/**
 * Formatea unidades (similar a formatUnits de ethers)
 */
function formatUnits(value: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals)
  const quotient = value / divisor
  const remainder = value % divisor
  const remainderStr = remainder.toString().padStart(decimals, '0')
  return `${quotient}.${remainderStr}`.replace(/\.?0+$/, '')
}

/**
 * Reporta una emergencia directamente a la blockchain de Polkadot
 * 
 * @param account - Cuenta de Polkadot que reporta la emergencia
 * @param emergencyData - Datos de la emergencia
 * @param chain - Cadena a usar (por defecto People Chain o Asset Hub)
 * @returns Hash de la transacción y número de bloque
 */
export async function reportEmergencyOnChain(
  account: InjectedAccountWithMeta,
  emergencyData: EmergencyOnChainData,
  chain: ChainName = 'POLKADOT'
): Promise<EmergencyReportResult> {
  try {
    // 1. Obtener el cliente de Polkadot
    const polkadotService = getPolkadotService()
    const client = await polkadotService.getClient(chain)

    // 2. Preparar datos críticos optimizados para la blockchain
    // Usar nombres de campos cortos para reducir el tamaño
    const criticalData = {
      // Versión del formato (para compatibilidad futura)
      v: 1,
      
      // ID único de emergencia
      id: generateEmergencyId(
        account.address,
        emergencyData.timestamp,
        emergencyData.latitude,
        emergencyData.longitude
      ),
      
      // Tipo y severidad (u8) - nombres cortos
      t: getEmergencyTypeCode(emergencyData.emergencyType),
      s: getSeverityCode(emergencyData.severity),
      
      // Coordenadas en formato i32 (multiplicadas por 1e6 para precisión)
      // Esto permite precisión de ~0.1 metros
      lat: Math.round(emergencyData.latitude * 1e6),
      lng: Math.round(emergencyData.longitude * 1e6),
      
      // Timestamp en segundos (u64)
      ts: Math.floor(emergencyData.timestamp / 1000),
      
      // Metadata adicional (nombres cortos, truncada)
      m: {
        t: emergencyData.title?.slice(0, 100), // Título truncado
        d: emergencyData.description?.slice(0, 500), // Descripción truncada
        n: emergencyData.numberOfPeople || 1,
        a: emergencyData.address?.slice(0, 200), // Dirección truncada
        c: emergencyData.city,
        co: emergencyData.country,
      },
    }

    // 3. Convertir datos a bytes (Vec<u8>)
    // remarkWithEvent acepta: string | HexString | Uint8Array
    // Usamos Uint8Array para máximo control
    const dataBytes = prepareRemarkData(criticalData)

    // 4. Obtener el signer de la wallet
    const { web3FromAddress } = await import('@polkadot/extension-dapp')
    const injector = await web3FromAddress(account.address)

    if (!injector.signer) {
      throw new Error('No se pudo obtener el signer de la wallet')
    }

    // 5. Crear la extrínseca usando System::remarkWithEvent
    // Según Dedot docs: client.tx.system.remarkWithEvent(remark: string | HexString | Uint8Array)
    // Acepta string, HexString o Uint8Array
    const extrinsic = client.tx.system.remarkWithEvent(dataBytes)

    // 6. (Opcional) Obtener información de pago antes de enviar
    let estimatedFee: bigint | null = null
    try {
      const paymentInfo = await extrinsic.paymentInfo(account.address)
      estimatedFee = paymentInfo.partialFee || null
      console.log('💰 Fee estimado:', estimatedFee?.toString() || 'N/A')
    } catch (error) {
      console.warn('No se pudo obtener información de pago:', error)
    }

    // 7. Firmar y enviar la transacción
    console.log('📡 Enviando emergencia a la blockchain...', {
      chain,
      account: account.address,
      dataSize: dataBytes.length,
      estimatedFee: estimatedFee?.toString(),
    })

    let blockHash: string | undefined
    let blockNumber: string | undefined
    let txHash: string | undefined

    // Usar untilFinalized() para obtener el resultado completo
    const result = await extrinsic
      .signAndSend(account.address, {
        signer: injector.signer,
      }, ({ status, events }) => {
        // Monitorear el estado de la transacción
        if (status.type === 'BestChainBlockIncluded') {
          console.log('📦 Transacción incluida en bloque')
          if (status.value) {
            blockHash = status.value.blockHash
            blockNumber = status.value.blockNumber?.toString()
          }
        } else if (status.type === 'Finalized') {
          console.log('✅ Transacción finalizada')
          if (status.value) {
            blockHash = status.value.blockHash
            blockNumber = status.value.blockNumber?.toString()
          }
        }

        // Buscar evento System::Remarked
        if (events) {
          events.forEach((record) => {
            const { event } = record
            if (client.events.system.Remarked.is(event)) {
              console.log('📝 Evento System::Remarked emitido')
              // El evento contiene: [AccountId, Vec<u8>]
              const [accountId, remarkData] = event.data
              console.log('   Reporter:', accountId.toString())
              console.log('   Data size:', (remarkData as Uint8Array).length, 'bytes')
            }
          })
        }
      })
      .untilFinalized()

    // Obtener el hash de la transacción
    if (result.txHash) {
      txHash = typeof result.txHash === 'string' ? result.txHash : result.txHash.toString()
    } else if (blockHash) {
      txHash = blockHash
    }

    if (!txHash) {
      throw new Error('No se pudo obtener el hash de la transacción')
    }

    return {
      success: true,
      txHash,
      blockNumber: blockNumber || undefined,
    }
  } catch (error: any) {
    console.error('❌ Error reportando emergencia a la blockchain:', error)
    return {
      success: false,
      error: error.message || 'Error desconocido al reportar emergencia',
    }
  }
}

/**
 * Convierte el tipo de emergencia a código numérico (u8)
 */
function getEmergencyTypeCode(type: string): number {
  const codes: Record<string, number> = {
    ACCIDENT: 1,
    MEDICAL: 2,
    FIRE: 3,
    CRIME: 4,
    SECURITY_THREAT: 5,
    MOUNTAIN_RESCUE: 6,
    WATER_RESCUE: 7,
    OTHER: 8,
  }
  return codes[type] || 8
}

/**
 * Convierte la severidad a código numérico (u8)
 */
function getSeverityCode(severity: string): number {
  const codes: Record<string, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  }
  return codes[severity] || 3
}

/**
 * Escucha eventos System::Remarked desde la blockchain
 * Filtra solo los que son emergencias (basado en estructura de datos)
 * 
 * NOTA: System::Remarked es un evento genérico que emite cualquier remarkWithEvent
 * Necesitamos filtrar por estructura de datos para identificar emergencias
 * 
 * @param chain - Cadena a escuchar (recomendado: PASET_HUB para testing, PEOPLE_CHAIN para producción)
 * @param callback - Función que se ejecuta cuando se detecta una emergencia
 * @returns Función para cancelar la suscripción
 */
export async function subscribeToEmergencyEvents(
  chain: ChainName,
  callback: (emergency: EmergencyOnChainData & { reporter: string; blockNumber: string }) => void
): Promise<() => void> {
  const polkadotService = getPolkadotService()
  const client = await polkadotService.getClient(chain)

  // Suscribirse a eventos del sistema usando subscribeFinalizedHeads
  // y luego consultar eventos de cada bloque
  let lastBlockNumber: number | null = null

  const unsubscribe = await client.rpc.chain.subscribeFinalizedHeads(async (header) => {
    const blockNumber = parseInt(header.number.toString())
    
    // Solo procesar bloques nuevos
    if (lastBlockNumber !== null && blockNumber <= lastBlockNumber) {
      return
    }
    lastBlockNumber = blockNumber

    try {
      // Obtener eventos del bloque
      const blockHash = header.hash
      const events = await client.query.system.events.at(blockHash)

      events.forEach((record) => {
        const { event } = record

        // Buscar eventos System::Remarked
        // En Dedot, el evento Remarked tiene la estructura: [AccountId, Vec<u8>]
        if (client.events.system.Remarked.is(event)) {
          try {
            const eventData = event.data
            // eventData es un array: [accountId, data]
            const accountId = eventData[0]
            const data = eventData[1] as Uint8Array
            
            // Intentar decodificar los datos
            const decoded = new TextDecoder().decode(data)
            const emergencyData = JSON.parse(decoded)

            // Validar que sea una emergencia (tiene versión y campos necesarios)
            // Usamos campo 'v' (versión) y estructura específica para identificar emergencias
            if (emergencyData.v === 1 && emergencyData.t && emergencyData.lat && emergencyData.lng) {
              callback({
                emergencyType: getEmergencyTypeFromCode(emergencyData.t),
                severity: getSeverityFromCode(emergencyData.s),
                latitude: emergencyData.lat / 1e6,
                longitude: emergencyData.lng / 1e6,
                timestamp: emergencyData.ts * 1000,
                title: emergencyData.m?.t,
                description: emergencyData.m?.d,
                numberOfPeople: emergencyData.m?.n,
                address: emergencyData.m?.a,
                city: emergencyData.m?.c,
                country: emergencyData.m?.co,
                reporter: accountId.toString(),
                blockNumber: blockNumber.toString(),
              })
            }
          } catch (error) {
            // No es una emergencia o datos inválidos, ignorar
            // (puede ser otro tipo de remark)
          }
        }
      })
    } catch (error) {
      console.error('Error procesando eventos del bloque:', error)
    }
  })

  return unsubscribe
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

