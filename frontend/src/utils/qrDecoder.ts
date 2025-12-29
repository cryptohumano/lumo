/**
 * Utilidades para decodificar códigos QR
 * El QR generado por el backend contiene un JSON con: { tripId, pin, type: 'TRIP_START', timestamp }
 */

/**
 * Decodifica el contenido JSON de un QR code
 * El QR puede venir como:
 * 1. JSON string directo (si se pega el contenido)
 * 2. Data URL de imagen (necesita librería de decodificación)
 * 
 * @param qrInput El input del QR (puede ser JSON string o data URL)
 * @returns El objeto decodificado o null si no se puede decodificar
 */
export function decodeQrCode(qrInput: string): { tripId: string; pin: string; type: string; timestamp: number } | null {
  if (!qrInput || !qrInput.trim()) {
    return null
  }

  // Si es un JSON string directo, parsearlo
  if (qrInput.trim().startsWith('{')) {
    try {
      const data = JSON.parse(qrInput.trim())
      if (data.type === 'TRIP_START' && data.tripId && data.pin) {
        return data
      }
    } catch (error) {
      console.error('Error parsing QR JSON:', error)
      return null
    }
  }

  // Si es un data URL (imagen base64), necesitaríamos una librería para decodificarlo
  // Por ahora, retornamos null y el usuario puede pegar el JSON directamente
  // En el futuro, se puede usar html5-qrcode o jsqr para escanear la imagen
  
  return null
}

/**
 * Extrae el JSON del QR si viene como data URL
 * Nota: Esto requiere una librería de decodificación de QR
 * Por ahora, el usuario debe pegar el JSON directamente
 */
export async function decodeQrFromImage(dataUrl: string): Promise<string | null> {
  // TODO: Implementar con html5-qrcode o jsqr
  // Por ahora, retornamos null
  console.warn('Decodificación de QR desde imagen no implementada. Pega el JSON directamente.')
  return null
}

