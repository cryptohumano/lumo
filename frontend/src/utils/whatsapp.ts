/**
 * Utilidades para generar links de WhatsApp
 */

/**
 * Genera un link de WhatsApp para enviar un mensaje a un número
 * @param phoneNumber Número de teléfono con prefijo internacional (ej: +56912345678)
 * @param message Mensaje a enviar
 * @returns URL de WhatsApp
 */
export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  // Remover espacios y caracteres especiales, pero mantener el +
  const cleanPhone = phoneNumber.trim().replace(/\s+/g, '')
  
  // Validar que tenga prefijo internacional
  if (!cleanPhone.startsWith('+')) {
    throw new Error('El número debe incluir el prefijo internacional (ej: +56912345678)')
  }

  // Codificar el mensaje para URL
  const encodedMessage = encodeURIComponent(message)
  
  // Generar link de WhatsApp Web/App
  // Formato: https://wa.me/[número]?text=[mensaje]
  const phoneOnly = cleanPhone.replace(/[^0-9+]/g, '') // Solo números y +
  return `https://wa.me/${phoneOnly}?text=${encodedMessage}`
}

/**
 * Genera un mensaje de resumen de viaje completado
 */
export function generateTripSummaryMessage(trip: {
  tripNumber: string
  originAddress: string
  destinationAddress: string
  distanceText: string
  durationText: string
  totalPrice: number
  currency: string
  passengers?: number
  driverName?: string
  vehicleInfo?: string
}): string {
  const lines = [
    `🚗 *Viaje Completado - ${trip.tripNumber}*`,
    '',
    `📍 *Origen:*`,
    trip.originAddress,
    '',
    `🎯 *Destino:*`,
    trip.destinationAddress,
    '',
    `📏 *Distancia:* ${trip.distanceText}`,
    `⏱️ *Duración:* ${trip.durationText}`,
    `💰 *Precio:* ${trip.totalPrice.toLocaleString()} ${trip.currency}`,
  ]

  if (trip.passengers && trip.passengers > 1) {
    lines.push(`👥 *Pasajeros:* ${trip.passengers}`)
  }

  if (trip.driverName) {
    lines.push('')
    lines.push(`👨‍✈️ *Conductor:* ${trip.driverName}`)
  }

  if (trip.vehicleInfo) {
    lines.push(`🚙 *Vehículo:* ${trip.vehicleInfo}`)
  }

  lines.push('')
  lines.push('Gracias por usar Lumo! 🌟')

  return lines.join('\n')
}

/**
 * Genera un mensaje de llegada al origen para contactar al pasajero
 */
export function generateArrivalMessage(trip: {
  tripNumber: string
  originAddress: string
  driverName?: string
  vehicleInfo?: string
}): string {
  const lines = [
    `🚗 *Lumo - Viaje ${trip.tripNumber}*`,
    '',
    `Hola! 👋`,
    '',
    `Soy ${trip.driverName || 'tu conductor'}, he llegado al punto de origen:`,
    `📍 ${trip.originAddress}`,
    '',
  ]

  if (trip.vehicleInfo) {
    lines.push(`🚙 Vehículo: ${trip.vehicleInfo}`)
    lines.push('')
  }

  lines.push('Estoy listo para iniciar el viaje. Te espero! 🚀')

  return lines.join('\n')
}

/**
 * Abre WhatsApp en una nueva ventana/pestaña
 */
export function openWhatsApp(phoneNumber: string, message: string): void {
  const link = generateWhatsAppLink(phoneNumber, message)
  window.open(link, '_blank', 'noopener,noreferrer')
}

