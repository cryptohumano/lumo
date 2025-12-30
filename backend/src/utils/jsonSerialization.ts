/**
 * Utilidades para serialización JSON que maneja BigInt
 */

/**
 * Convierte un objeto que puede contener BigInt a un formato serializable
 * Convierte todos los BigInt a string
 */
export function serializeBigInt<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'bigint') {
    return obj.toString()
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item))
  }

  if (typeof obj === 'object') {
    const serialized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value)
    }
    return serialized
  }

  return obj
}







