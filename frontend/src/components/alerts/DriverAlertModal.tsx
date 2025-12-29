/**
 * Modal de alerta para conductores
 * Muestra alertas de viajes disponibles con countdown de 1 minuto
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { X, Clock, MapPin, Navigation, Users, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { DriverAlert } from '@/types'

interface DriverAlertModalProps {
  alert: DriverAlert
  onAccept: (alertId: string, vehicleId?: string) => Promise<void>
  onReject: (alertId: string, reason?: string) => Promise<void>
  onClose: () => void
}

export function DriverAlertModal({ alert, onAccept, onReject, onClose }: DriverAlertModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { formatConverted } = useCurrency()
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isExpired, setIsExpired] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [formattedPrice, setFormattedPrice] = useState<string>('')

  useEffect(() => {
    // Calcular tiempo restante
    const calculateTimeRemaining = () => {
      const now = new Date().getTime()
      const expiresAt = new Date(alert.expiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
      
      setTimeRemaining(remaining)
      setIsExpired(remaining === 0)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [alert.expiresAt])

  useEffect(() => {
    // Formatear precio
    const formatPrice = async () => {
      if (alert.trip) {
        const formatted = await formatConverted(alert.trip.totalPrice, alert.trip.currency)
        setFormattedPrice(formatted)
      }
    }
    formatPrice()
  }, [alert.trip, formatConverted])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAccept = async () => {
    try {
      setIsProcessing(true)
      await onAccept(alert.id)
      toast.success(t('driver.alertAccepted') || 'Viaje aceptado exitosamente')
      onClose()
      navigate(`/driver/trips/${alert.tripId}`)
    } catch (error: any) {
      console.error('Error accepting trip:', error)
      toast.error(error.message || t('driver.acceptError') || 'Error al aceptar viaje')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    try {
      setIsProcessing(true)
      await onReject(alert.id)
      toast.success(t('driver.alertRejected') || 'Viaje rechazado')
      onClose()
    } catch (error: any) {
      console.error('Error rejecting trip:', error)
      toast.error(error.message || t('driver.rejectError') || 'Error al rechazar viaje')
    } finally {
      setIsProcessing(false)
    }
  }

  const getTimeColor = () => {
    if (isExpired) return 'text-destructive'
    if (timeRemaining < 15) return 'text-orange-500'
    if (timeRemaining < 30) return 'text-yellow-500'
    return 'text-primary'
  }

  if (isExpired) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {t('driver.alertExpired') || 'Alerta Expirada'}
            </DialogTitle>
            <DialogDescription>
              {t('driver.alertExpiredDescription') || 'El tiempo límite para aceptar este viaje ha expirado.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>{t('common.close') || 'Cerrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('driver.newTripAlert') || 'Nuevo Viaje Disponible'}</span>
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${getTimeColor()}`} />
              <span className={`font-mono text-lg ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription>
            {t('driver.alertDescription') || 'Tienes 1 minuto para aceptar o rechazar este viaje'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del viaje */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-500 mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('driver.origin') || 'Origen'}
                  </div>
                  <div className="font-medium">{alert.trip.originAddress}</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Navigation className="h-4 w-4 text-red-500 mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('driver.destination') || 'Destino'}
                  </div>
                  <div className="font-medium">{alert.trip.destinationAddress}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detalles del viaje */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                {t('driver.distance') || 'Distancia'}
              </div>
              <div className="font-semibold">{alert.trip.distanceText}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                {t('driver.duration') || 'Duración'}
              </div>
              <div className="font-semibold">{alert.trip.durationText}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                <Users className="h-3 w-3 inline mr-1" />
                {t('driver.passengers') || 'Pasajeros'}
              </div>
              <div className="font-semibold">{alert.trip.passengers}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3 inline mr-1" />
                {t('driver.price') || 'Precio'}
              </div>
              <div className="font-semibold text-primary">
                {formattedPrice || `${alert.trip.currency} ${alert.trip.totalPrice.toFixed(2)}`}
              </div>
            </div>
          </div>

          {/* Información del pasajero */}
          {alert.trip.passenger && (
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-1">
                {t('driver.passenger') || 'Pasajero'}
              </div>
              <div className="font-medium">{alert.trip.passenger.name}</div>
              {alert.trip.passenger.phone && (
                <div className="text-sm text-muted-foreground">{alert.trip.passenger.phone}</div>
              )}
            </div>
          )}

          {/* Viaje de ida y vuelta */}
          {alert.trip.isRoundTrip && (
            <Badge variant="secondary" className="w-fit">
              {t('driver.roundTrip') || 'Viaje de ida y vuelta'}
            </Badge>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing || isExpired}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {t('driver.reject') || 'Rechazar'}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isProcessing || isExpired}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('driver.accept') || 'Aceptar Viaje'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

