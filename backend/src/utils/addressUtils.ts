import { decodeAddress, encodeAddress } from '@polkadot/util-crypto'

/**
 * Convierte una dirección SS58 a formato Polkadot (prefix 0)
 * Esto es necesario porque People Chain usa direcciones con prefix 0
 * 
 * @param address Dirección en cualquier formato SS58
 * @returns Dirección en formato Polkadot (prefix 0)
 */
export function toPolkadotAddress(address: string): string {
  try {
    // Decodificar la dirección para obtener la clave pública (sin importar el prefix)
    const publicKey = decodeAddress(address, false)
    
    // Re-encodificar con prefix 0 (Polkadot)
    return encodeAddress(publicKey, 0)
  } catch (error: any) {
    console.error(`Error convirtiendo dirección a formato Polkadot: ${address}`, error.message)
    throw new Error(`Dirección inválida: ${address}`)
  }
}

/**
 * Verifica si una dirección está en formato Polkadot (prefix 0)
 * 
 * @param address Dirección a verificar
 * @returns true si está en formato Polkadot
 */
export function isPolkadotFormat(address: string): boolean {
  try {
    const publicKey = decodeAddress(address, false)
    const polkadotAddress = encodeAddress(publicKey, 0)
    return address === polkadotAddress
  } catch {
    return false
  }
}







