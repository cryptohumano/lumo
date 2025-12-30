/**
 * Utilidades para seguridad de inicio de viaje
 * Genera PIN y QR codes para verificación
 */

import QRCode from 'qrcode'

/**
 * Genera un PIN aleatorio de 4 dígitos
 */
export function generateStartPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/**
 * Genera un código QR para iniciar el viaje
 * El QR contiene: tripId + PIN + timestamp
 */
export async function generateStartQrCode(tripId: string, pin: string): Promise<string> {
  const qrData = JSON.stringify({
    tripId,
    pin,
    type: 'TRIP_START',
    timestamp: Date.now(),
  })
  
  // Generar QR como data URL (imagen base64)
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 1,
  })
  
  return qrCodeDataUrl
}

/**
 * Valida un PIN de inicio de viaje
 */
export function validateStartPin(pin: string, expectedPin: string): boolean {
  return pin === expectedPin
}

/**
 * Valida y decodifica un código QR de inicio de viaje
 */
export function validateStartQrCode(qrData: string, expectedTripId: string, expectedPin: string): boolean {
  try {
    const data = JSON.parse(qrData)
    
    // Verificar que el QR es válido y corresponde al viaje
    if (data.type !== 'TRIP_START') return false
    if (data.tripId !== expectedTripId) return false
    if (data.pin !== expectedPin) return false
    
    // Verificar que el QR no sea muy antiguo (máximo 1 hora)
    const qrAge = Date.now() - data.timestamp
    const maxAge = 60 * 60 * 1000 // 1 hora
    if (qrAge > maxAge) return false
    
    return true
  } catch (error) {
    return false
  }
}

/**
 * Genera un código QR para el pago
 * El QR contiene: paymentId + timestamp
 */
export async function generatePaymentQrCode(paymentId: string): Promise<string> {
  const qrData = JSON.stringify({
    paymentId,
    type: 'PAYMENT',
    timestamp: Date.now(),
  })
  
  // Generar QR como data URL (imagen base64)
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 1,
  })
  
  return qrCodeDataUrl
}

/**
 * Valida y decodifica un código QR de pago
 */
export function validatePaymentQrCode(qrData: string): { paymentId: string; valid: boolean } {
  try {
    const data = JSON.parse(qrData)
    
    // Verificar que el QR es válido
    if (data.type !== 'PAYMENT') {
      return { paymentId: '', valid: false }
    }
    if (!data.paymentId) {
      return { paymentId: '', valid: false }
    }
    
    // Verificar que el QR no sea muy antiguo (máximo 24 horas)
    const qrAge = Date.now() - data.timestamp
    const maxAge = 24 * 60 * 60 * 1000 // 24 horas
    if (qrAge > maxAge) {
      return { paymentId: '', valid: false }
    }
    
    return { paymentId: data.paymentId, valid: true }
  } catch (error) {
    return { paymentId: '', valid: false }
  }
}

/**
 * Calcula la distancia entre dos coordenadas (Haversine)
 * Retorna la distancia en metros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distancia en metros
}

/**
 * Verifica si el conductor está cerca del origen del viaje
 * @param driverLat Latitud del conductor
 * @param driverLon Longitud del conductor
 * @param originLat Latitud del origen
 * @param originLon Longitud del origen
 * @param maxDistanceMeters Distancia máxima permitida en metros (default: 100m)
 */
export function isDriverNearOrigin(
  driverLat: number,
  driverLon: number,
  originLat: number,
  originLon: number,
  maxDistanceMeters: number = 100
): boolean {
  const distance = calculateDistance(driverLat, driverLon, originLat, originLon)
  return distance <= maxDistanceMeters
}













