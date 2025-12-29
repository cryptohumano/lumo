/**
 * Tarjeta destacada para mostrar PIN y QR de inicio de viaje
 * Se muestra prominentemente cuando el pasajero tiene un viaje confirmado
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Key, QrCode, Copy, Share2, MessageCircle, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import type { Trip } from '@/types'

interface TripStartCodeCardProps {
  trip: Trip
  onTripUpdate?: (updatedTrip: Trip) => void
}

export function TripStartCodeCard({ trip, onTripUpdate }: TripStartCodeCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [copiedPin, setCopiedPin] = useState(false)
  const [copiedQr, setCopiedQr] = useState(false)
  const [isRenewing, setIsRenewing] = useState(false)
  const [currentTrip, setCurrentTrip] = useState(trip)

  if (!currentTrip.startPin || currentTrip.status !== 'CONFIRMED') {
    return null
  }

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(currentTrip.startPin || '')
      setCopiedPin(true)
      toast.success(t('passenger.pinCopied') || 'PIN copiado al portapapeles')
      setTimeout(() => setCopiedPin(false), 2000)
    } catch (error) {
      toast.error(t('passenger.copyError') || 'Error al copiar')
    }
  }

  const handleSharePin = () => {
    const message = `${t('passenger.sharePinMessage') || 'Mi PIN para iniciar el viaje'}: ${currentTrip.startPin}\n${t('passenger.sharePinTrip') || 'Viaje'}: ${currentTrip.tripNumber}`
    
    // Intentar compartir nativo (si está disponible)
    if (navigator.share) {
      navigator.share({
        title: t('passenger.startTripCode') || 'Código para Iniciar Viaje',
        text: message,
      }).catch(() => {
        // Si el usuario cancela, no hacer nada
      })
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(message)
      toast.success(t('passenger.pinCopied') || 'PIN copiado')
    }
  }

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `${t('passenger.sharePinMessage') || 'Mi PIN para iniciar el viaje'}: ${trip.startPin}\n${t('passenger.sharePinTrip') || 'Viaje'}: ${trip.tripNumber}`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  const handleShareSMS = () => {
    const message = encodeURIComponent(
      `${t('passenger.sharePinMessage') || 'Mi PIN para iniciar el viaje'}: ${currentTrip.startPin}\n${t('passenger.sharePinTrip') || 'Viaje'}: ${currentTrip.tripNumber}`
    )
    window.open(`sms:?body=${message}`, '_blank')
  }

  const handleRenewPin = async () => {
    try {
      setIsRenewing(true)
      const result = await api.renewStartPin(currentTrip.id)
      
      // Actualizar el trip localmente
      const updatedTrip = {
        ...currentTrip,
        startPin: result.startPin,
        startPinExpiresAt: result.startPinExpiresAt,
        startQrCode: result.startQrCode,
      }
      setCurrentTrip(updatedTrip)
      
      // Notificar al componente padre si existe el callback
      if (onTripUpdate) {
        onTripUpdate(updatedTrip as Trip)
      }
      
      toast.success(t('passenger.pinRenewed') || 'PIN renovado exitosamente. El conductor ha sido notificado.')
    } catch (error: any) {
      console.error('Error renewing PIN:', error)
      toast.error(error.message || t('passenger.pinRenewError') || 'Error al renovar el PIN')
    } finally {
      setIsRenewing(false)
    }
  }

  const isExpired = currentTrip.startPinExpiresAt && new Date(currentTrip.startPinExpiresAt) < new Date()
  
  // Verificar si está cerca de expirar (menos de 30 minutos)
  const isNearExpiry = currentTrip.startPinExpiresAt && 
    new Date(currentTrip.startPinExpiresAt).getTime() - new Date().getTime() < 30 * 60 * 1000

  return (
    <Card className="border-primary/50 bg-primary/5 mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">
              {t('passenger.startTripCode') || 'Código para Iniciar Viaje'}
            </CardTitle>
          </div>
          <Badge variant="default" className="bg-primary">
            {currentTrip.tripNumber}
          </Badge>
        </div>
        <CardDescription>
          {t('passenger.startTripCodeDescription') || 'Comparte este código con el conductor para iniciar el viaje'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alerta si está expirado o cerca de expirar */}
        {isExpired && (
          <div className="flex items-center justify-between gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{t('passenger.pinExpired') || 'El PIN ha expirado.'}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRenewPin}
              disabled={isRenewing}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${isRenewing ? 'animate-spin' : ''}`} />
              {t('passenger.renewPin') || 'Renovar PIN'}
            </Button>
          </div>
        )}
        {!isExpired && isNearExpiry && (
          <div className="flex items-center justify-between gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{t('passenger.pinExpiringSoon') || 'El PIN expirará pronto.'}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRenewPin}
              disabled={isRenewing}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${isRenewing ? 'animate-spin' : ''}`} />
              {t('passenger.renewPin') || 'Renovar PIN'}
            </Button>
          </div>
        )}

        {/* PIN y QR */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* PIN */}
          <div className="p-4 border-2 border-primary/20 rounded-lg bg-background">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('passenger.pin') || 'PIN'}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPin}
                className="h-8 w-8 p-0"
              >
                <Copy className={`h-4 w-4 ${copiedPin ? 'text-green-600' : ''}`} />
              </Button>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold tracking-widest mb-2 text-primary">
                {currentTrip.startPin}
              </div>
              {currentTrip.startPinExpiresAt && !isExpired && (
                <p className="text-xs text-muted-foreground">
                  {t('passenger.expiresAt') || 'Expira'} {new Date(currentTrip.startPinExpiresAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* QR Code */}
          {currentTrip.startQrCode && (
            <div className="p-4 border-2 border-primary/20 rounded-lg bg-background">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('passenger.qrCode') || 'Código QR'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Descargar QR como imagen
                    const link = document.createElement('a')
                    link.href = currentTrip.startQrCode || ''
                    link.download = `qr-${currentTrip.tripNumber}.png`
                    link.click()
                    toast.success(t('passenger.qrDownloaded') || 'QR descargado')
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center">
                <img
                  src={currentTrip.startQrCode}
                  alt="QR Code"
                  className="w-32 h-32 border-2 border-primary/20 rounded"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {t('passenger.showQrToDriver') || 'Muestra este código al conductor'}
              </p>
            </div>
          )}
        </div>

        {/* Botones de compartir */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSharePin}
            className="flex-1 min-w-[120px]"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {t('passenger.share') || 'Compartir'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="flex-1 min-w-[120px]"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareSMS}
            className="flex-1 min-w-[120px]"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            SMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/passenger/trips/${currentTrip.id}`)}
            className="flex-1 min-w-[120px]"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('common.view') || 'Ver Detalles'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

