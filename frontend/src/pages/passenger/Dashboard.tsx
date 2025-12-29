import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, DollarSign, Navigation } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import { TripStartCodeCard } from '@/components/trips/TripStartCodeCard'

import type { Trip } from '@/types'

export default function PassengerDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { formatConvertedAmount, formatAmount } = useCurrency()
  const [activeTrips, setActiveTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [convertedPrices, setConvertedPrices] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    loadActiveTrips()
  }, [user, navigate])

  const loadActiveTrips = async () => {
    try {
      setIsLoading(true)
      const tripsData = await api.getTrips('IN_PROGRESS,PENDING,CONFIRMED')
      setActiveTrips(Array.isArray(tripsData) ? tripsData : [])
      
      // Convertir precios a la moneda preferida del usuario
      const prices: Record<string, string> = {}
      const tripsArray = Array.isArray(tripsData) ? tripsData : []
      for (const trip of tripsArray) {
        const formatted = await formatConvertedAmount(trip.totalPrice, trip.currency)
        prices[trip.id] = formatted
      }
      setConvertedPrices(prices)
    } catch (error) {
      console.error('Error loading trips:', error)
      toast.error(t('passenger.loadError') || 'Error al cargar viajes')
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('passenger.dashboard') || 'Panel de Pasajero'}</h1>
        <p className="text-muted-foreground">
          {t('passenger.dashboardDescription') || 'Gestiona tus viajes y experiencias'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              {t('passenger.requestTrip')}
            </CardTitle>
            <CardDescription>
              {t('passenger.requestTripDescription') || 'Solicita un viaje ahora'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/passenger/request-trip')}
            >
              {t('passenger.requestTrip')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('passenger.activeTrips')}
            </CardTitle>
            <CardDescription>
              {activeTrips.length} {t('passenger.activeTripsCount') || 'viajes activos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/passenger/trips')}
            >
              {t('passenger.viewTrips') || 'Ver Viajes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('passenger.favorites')}
            </CardTitle>
            <CardDescription>
              {t('passenger.savedLocations') || 'Ubicaciones guardadas'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/passenger/favorites')}
            >
              {t('passenger.viewFavorites') || 'Ver Favoritos'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : activeTrips.length > 0 ? (
        <div>
          {/* Mostrar PIN/QR destacado para viajes confirmados */}
          {activeTrips
            .filter(trip => trip.status === 'CONFIRMED' && trip.startPin)
            .map(trip => (
              <TripStartCodeCard key={trip.id} trip={trip} />
            ))}

          <h2 className="text-2xl font-semibold mb-4">{t('passenger.activeTrips')}</h2>
          <div className="space-y-4">
            {activeTrips.map((trip) => (
              <Card key={trip.id} className="overflow-hidden">
                <CardHeader className="pb-3 px-4 pt-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base md:text-lg truncate">{trip.tripNumber}</CardTitle>
                    <div className="flex-shrink-0">{getStatusBadge(trip.status)}</div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium line-clamp-2 break-words">{trip.originAddress}</p>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 break-words">{trip.destinationAddress}</p>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-xs md:text-sm text-muted-foreground">
                      <span>{trip.distanceText}</span>
                      <span className="hidden md:inline">•</span>
                      <span>{trip.durationText}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 gap-2">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="font-semibold text-sm md:text-base truncate">
                            {convertedPrices[trip.id] || formatAmount(trip.totalPrice, trip.currency)}
                          </span>
                        </div>
                        {convertedPrices[trip.id] && trip.currency !== user?.preferredCurrency && (
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {formatAmount(trip.totalPrice, trip.currency)}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/passenger/trips/${trip.id}`)}
                        className="text-xs md:text-sm h-8 md:h-9 px-3 md:px-4 w-full md:w-auto"
                      >
                        {t('common.view') || 'Ver'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {t('passenger.noActiveTrips') || 'No tienes viajes activos'}
            </p>
            <Button onClick={() => navigate('/passenger/request-trip')}>
              {t('passenger.requestTrip')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

