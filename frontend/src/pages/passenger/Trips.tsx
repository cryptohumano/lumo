import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Clock, DollarSign, ArrowRight, AlertCircle } from 'lucide-react'
import type { Trip } from '@/types'
import { useCurrency } from '@/hooks/useCurrency'

export default function PassengerTrips() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { formatConvertedAmount, formatAmount } = useCurrency()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [convertedPrices, setConvertedPrices] = useState<Record<string, string>>({})

  useEffect(() => {
    loadTrips()
  }, [activeTab])

  const loadTrips = async () => {
    try {
      setIsLoading(true)
      let statusFilter: string | undefined

      if (activeTab === 'active') {
        statusFilter = 'IN_PROGRESS,PENDING,CONFIRMED'
      } else if (activeTab === 'completed') {
        statusFilter = 'COMPLETED'
      } else if (activeTab === 'cancelled') {
        statusFilter = 'CANCELLED'
      }

      const data = await api.getTrips(statusFilter)
      setTrips(data)
      
      // Convertir precios a la moneda preferida del usuario
      const prices: Record<string, string> = {}
      for (const trip of data) {
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
      PENDING_PAYMENT: { label: t('trip.status.pendingPayment') || 'Pago Pendiente', variant: 'destructive' },
      COMPLETED: { label: t('trip.status.completed') || 'Completado', variant: 'secondary' },
      CANCELLED: { label: t('trip.status.cancelled') || 'Cancelado', variant: 'destructive' },
    }
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString()
  }

  // Verificar si un viaje expiró
  const isTripExpired = (trip: Trip): { expired: boolean; reason: 'time' | 'noResponse' | null } => {
    const now = new Date()
    
    // Si tiene acceptanceDeadline y expiró, es por falta de respuesta
    if (trip.acceptanceDeadline && new Date(trip.acceptanceDeadline) < now) {
      return { expired: true, reason: 'noResponse' }
    }
    
    // Para viajes no programados (inmediatos), verificar si expiraron por tiempo
    // Un viaje inmediato expira después de 30 minutos sin respuesta
    if (!trip.scheduledAt && trip.status === 'PENDING') {
      const createdAt = new Date(trip.createdAt)
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
      if (createdAt < thirtyMinutesAgo) {
        return { expired: true, reason: 'time' }
      }
    }
    
    // Para viajes programados, verificar si la fecha programada ya pasó
    if (trip.scheduledAt && trip.status === 'PENDING') {
      const scheduledTime = new Date(trip.scheduledAt)
      // Si el viaje estaba programado para hace más de 1 hora, considerarlo expirado
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      if (scheduledTime < oneHourAgo) {
        return { expired: true, reason: 'time' }
      }
    }
    
    return { expired: false, reason: null }
  }

  const getExpirationBadge = (trip: Trip) => {
    const expiration = isTripExpired(trip)
    if (!expiration.expired) return null
    
    if (expiration.reason === 'noResponse') {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          {t('trip.expiredNoResponse') || 'Expirado - Sin respuesta'}
        </Badge>
      )
    }
    
    if (expiration.reason === 'time') {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          {t('trip.expiredTime') || 'Expirado - Tiempo agotado'}
        </Badge>
      )
    }
    
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('passenger.myTrips')}</h1>
        <p className="text-muted-foreground">
          {t('passenger.tripsDescription') || 'Gestiona todos tus viajes'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            {t('passenger.activeTrips')}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('passenger.history')}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t('passenger.cancelled')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">{t('common.loading')}</div>
          ) : trips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {t('passenger.noTrips') || 'No hay viajes en esta categoría'}
                </p>
                {activeTab === 'active' && (
                  <Button onClick={() => navigate('/passenger/request-trip')}>
                    {t('passenger.requestTrip')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => (
                <Card 
                  key={trip.id} 
                  className={`hover:shadow-md transition-shadow overflow-hidden ${
                    isTripExpired(trip).expired ? 'opacity-60 border-dashed' : ''
                  }`}
                >
                  <CardHeader className="pb-3 px-4 pt-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base md:text-lg truncate">{trip.tripNumber}</CardTitle>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {getStatusBadge(trip.status)}
                        {getExpirationBadge(trip)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-3 md:space-y-4">
                      {/* Rutas */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4 mt-1 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm font-medium line-clamp-2 break-words">{trip.originAddress}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-2 text-muted-foreground" />
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4 mt-1 text-red-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm font-medium line-clamp-2 break-words">{trip.destinationAddress}</p>
                          </div>
                        </div>
                      </div>

                      {/* Información del viaje */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-xs md:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 md:h-4 md:w-4" />
                          <span>{trip.durationText}</span>
                        </div>
                        <span className="hidden md:inline">•</span>
                        <span>{trip.distanceText}</span>
                      </div>

                      {/* Fechas */}
                      {trip.scheduledAt && (
                        <div className="text-xs md:text-sm text-muted-foreground truncate">
                          {t('passenger.scheduledFor') || 'Programado para'}: {formatDate(trip.scheduledAt)}
                        </div>
                      )}

                      {/* Conductor */}
                      {trip.driver && (
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-xs md:text-sm">
                          <span className="text-muted-foreground">
                            {t('passenger.driver') || 'Conductor'}: 
                          </span>
                          <span className="font-medium truncate">{trip.driver.name}</span>
                        </div>
                      )}

                      {/* Precio y acciones */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 border-t gap-2">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                            <span className="font-semibold text-sm md:text-lg truncate">
                              {convertedPrices[trip.id] || formatAmount(trip.totalPrice, trip.currency)}
                            </span>
                          </div>
                          {convertedPrices[trip.id] && user && trip.currency !== user.preferredCurrency && (
                            <span className="text-[10px] md:text-xs text-muted-foreground">
                              {formatAmount(trip.totalPrice, trip.currency)}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/passenger/trips/${trip.id}`)}
                            className="text-xs md:text-sm h-8 md:h-9 px-2 md:px-4 flex-1 md:flex-initial"
                          >
                            {t('common.view') || 'Ver'}
                          </Button>
                          {trip.status === 'PENDING' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await api.cancelTrip(trip.id)
                                  toast.success(t('passenger.tripCancelled') || 'Viaje cancelado')
                                  loadTrips()
                                } catch (error: any) {
                                  toast.error(error.message || t('passenger.cancelError') || 'Error al cancelar')
                                }
                              }}
                              className="text-xs md:text-sm h-8 md:h-9 px-2 md:px-4 flex-1 md:flex-initial"
                            >
                              {t('common.cancel')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

