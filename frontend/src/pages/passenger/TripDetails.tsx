import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, Clock, DollarSign, User, Phone, ArrowLeft, Key, QrCode, Copy, Map as MapIcon } from 'lucide-react'
import type { Trip } from '@/types'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/contexts/AuthContext'

export default function TripDetails() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { formatConvertedAmount, formatAmount } = useCurrency()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [convertedPrice, setConvertedPrice] = useState<string>('')

  useEffect(() => {
    if (id) {
      loadTrip(id)
    }
  }, [id])

  const loadTrip = async (tripId: string) => {
    try {
      setIsLoading(true)
      const data = await api.getTrip(tripId)
      setTrip(data)
      
      // Convertir precio a la moneda preferida del usuario
      if (data) {
        const formatted = await formatConvertedAmount(data.totalPrice, data.currency)
        setConvertedPrice(formatted)
      }
    } catch (error) {
      console.error('Error loading trip:', error)
      toast.error(t('passenger.loadError') || 'Error al cargar el viaje')
      navigate('/passenger/trips')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING: { label: t('trip.status.pending') || 'Pendiente', variant: 'outline' },
      CONFIRMED: { label: t('trip.status.confirmed') || 'Confirmado', variant: 'default' },
      IN_PROGRESS: { label: t('trip.status.inProgress') || 'En Progreso', variant: 'default' },
      COMPLETED: { label: t('trip.status.completed') || 'Completado', variant: 'secondary' },
      CANCELLED: { label: t('trip.status.cancelled') || 'Cancelado', variant: 'destructive' },
    }
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">{t('common.loading')}</div>
      </div>
    )
  }

  if (!trip) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/passenger/trips')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back')}
      </Button>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{trip.tripNumber}</h1>
            <p className="text-muted-foreground">
              {t('passenger.tripDetails') || 'Detalles del viaje'}
            </p>
          </div>
          {getStatusBadge(trip.status)}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información de la ruta */}
        <Card>
          <CardHeader>
            <CardTitle>{t('passenger.route') || 'Ruta'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-1 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('passenger.origin')}</p>
                  <p className="text-sm text-muted-foreground">{trip.originAddress}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-1 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('passenger.destination')}</p>
                  <p className="text-sm text-muted-foreground">{trip.destinationAddress}</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('passenger.distance') || 'Distancia'}</span>
                <span className="font-medium">{trip.distanceText}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('passenger.duration') || 'Duración'}</span>
                <span className="font-medium">{trip.durationText}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('passenger.passengers') || 'Pasajeros'}</span>
                <span className="font-medium">{trip.passengers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PIN y QR para iniciar viaje */}
        {trip.status === 'CONFIRMED' && trip.startPin && (
          <Card className="md:col-span-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('passenger.startTripCode') || 'Código para Iniciar Viaje'}
              </CardTitle>
              <CardDescription>
                {t('passenger.startTripCodeDescription') || 'Comparte este código con el conductor para iniciar el viaje'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* PIN */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('passenger.pin') || 'PIN'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold tracking-widest">{trip.startPin}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(trip.startPin || '')
                        toast.success(t('passenger.pinCopied') || 'PIN copiado')
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {trip.startPinExpiresAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('passenger.expiresAt') || 'Expira'} {new Date(trip.startPinExpiresAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* QR Code */}
                {trip.startQrCode && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('passenger.qrCode') || 'Código QR'}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <img
                        src={trip.startQrCode}
                        alt="QR Code"
                        className="w-32 h-32 border rounded"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {t('passenger.showQrToDriver') || 'Muestra este código al conductor'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información del conductor y vehículo */}
        {trip.driver && (
          <Card>
            <CardHeader>
              <CardTitle>{t('passenger.driverInfo') || 'Información del Conductor'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={trip.driver.avatar || undefined} />
                  <AvatarFallback>
                    {trip.driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{trip.driver.name}</p>
                  {trip.driver.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {trip.driver.phone}
                    </p>
                  )}
                </div>
              </div>
              {trip.vehicle && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">{t('passenger.vehicle') || 'Vehículo'}</p>
                  <p className="text-sm text-muted-foreground">
                    {trip.vehicle.make} {trip.vehicle.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('passenger.licensePlate') || 'Placa'}: {trip.vehicle.licensePlate}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Precio y pagos */}
        <Card>
          <CardHeader>
            <CardTitle>{t('passenger.payment') || 'Pago'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">
                  {convertedPrice || formatAmount(trip.totalPrice, trip.currency)}
                </span>
                {convertedPrice && trip.currency !== user?.preferredCurrency && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatAmount(trip.totalPrice, trip.currency)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fechas */}
        <Card>
          <CardHeader>
            <CardTitle>{t('passenger.timeline') || 'Cronología'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trip.scheduledAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('passenger.scheduledAt') || 'Programado'}</span>
                <span>{formatDate(trip.scheduledAt)}</span>
              </div>
            )}
            {trip.startedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('passenger.startedAt') || 'Iniciado'}</span>
                <span>{formatDate(trip.startedAt)}</span>
              </div>
            )}
            {trip.completedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('passenger.completedAt') || 'Completado'}</span>
                <span>{formatDate(trip.completedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones */}
      <div className="mt-6 flex gap-4 flex-wrap">
        {(trip.status === 'CONFIRMED' || trip.status === 'IN_PROGRESS') && (
          <Button
            variant="default"
            onClick={() => navigate(`/passenger/trips/${trip.id}/track`)}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            {t('passenger.trackTrip') || 'Ver Ruta'}
          </Button>
        )}
        {trip.status === 'PENDING' && (
          <Button
            variant="destructive"
            onClick={async () => {
              try {
                await api.cancelTrip(trip.id)
                toast.success(t('passenger.tripCancelled') || 'Viaje cancelado')
                navigate('/passenger/trips')
              } catch (error: any) {
                toast.error(error.message || t('passenger.cancelError') || 'Error al cancelar')
              }
            }}
          >
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </div>
  )
}

