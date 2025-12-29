/**
 * Página de seguimiento de viaje para el pasajero
 * Muestra el mapa con la ruta del viaje
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Clock, Navigation, User, Phone, Map as MapIcon } from 'lucide-react'
import { toast } from 'sonner'
import { TripTrackingMap } from '@/components/maps/TripTrackingMap'
import { useCurrency } from '@/hooks/useCurrency'
import type { Trip } from '@/types'

export default function PassengerTripTracking() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { formatConverted } = useCurrency()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formattedPrice, setFormattedPrice] = useState<string>('')

  useEffect(() => {
    if (!user || !id) {
      navigate('/passenger/dashboard')
      return
    }

    loadTrip()

    // Actualizar viaje cada 30 segundos
    const tripInterval = setInterval(() => {
      loadTrip()
    }, 30000)

    return () => {
      clearInterval(tripInterval)
    }
  }, [user, id, navigate])

  const loadTrip = async () => {
    if (!id) return

    try {
      const data = await api.getTrip(id)
      setTrip(data)

      if (data) {
        const formatted = await formatConverted(data.totalPrice, data.currency)
        setFormattedPrice(formatted)
      }
    } catch (error) {
      console.error('Error loading trip:', error)
      toast.error(t('passenger.loadError') || 'Error al cargar el viaje')
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

  if (isLoading || !trip) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('common.loading') || 'Cargando...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/passenger/trips/${id}`)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back') || 'Volver'}
      </Button>

      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">{trip.tripNumber}</h1>
            <p className="text-muted-foreground">
              {t('passenger.tripTracking') || 'Seguimiento de viaje'}
            </p>
          </div>
          {getStatusBadge(trip.status)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mapa - Ocupa 2 columnas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('passenger.route') || 'Ruta'}</CardTitle>
              <CardDescription>
                {t('passenger.routeDescription') || 'Sigue el progreso de tu viaje'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TripTrackingMap
                trip={trip}
                showCurrentLocation={false}
                height="500px"
              />
            </CardContent>
          </Card>
        </div>

        {/* Información del viaje */}
        <div className="space-y-6">
          {/* Detalles del viaje */}
          <Card>
            <CardHeader>
              <CardTitle>{t('passenger.tripDetails') || 'Detalles del Viaje'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{t('passenger.origin') || 'Origen'}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{trip.originAddress}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">{t('passenger.destination') || 'Destino'}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{trip.destinationAddress}</p>
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
                  <span className="text-muted-foreground">{t('passenger.payment') || 'Pago'}</span>
                  <span className="font-semibold text-primary">{formattedPrice}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del conductor */}
          {trip.driver && (
            <Card>
              <CardHeader>
                <CardTitle>{t('passenger.driverInfo') || 'Conductor'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
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
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-1">{t('passenger.vehicle') || 'Vehículo'}</p>
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
        </div>
      </div>
    </div>
  )
}

