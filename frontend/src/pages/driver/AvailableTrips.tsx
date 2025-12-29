import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Clock, Users, ArrowLeft, AlertCircle, CheckCircle, XCircle, Navigation, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { Trip } from '@/types'
import { VehicleType } from '@/types'

export default function AvailableTrips() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { formatConvertedAmount, formatAmount, format, convertSync } = useCurrency()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('ANY')
  const [isAccepting, setIsAccepting] = useState(false)
  const [formattedPrices, setFormattedPrices] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string | null>>({})

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isImmediateTrip = (trip: Trip) => {
    if (!trip.scheduledAt) return true // Viaje sin fecha = inmediato
    const scheduledTime = new Date(trip.scheduledAt).getTime()
    const now = Date.now()
    const tenMinutes = 10 * 60 * 1000
    return scheduledTime - now <= tenMinutes && scheduledTime >= now
  }

  const getTimeUntilTrip = (trip: Trip) => {
    if (!trip.scheduledAt) return null
    const scheduledTime = new Date(trip.scheduledAt).getTime()
    const now = Date.now()
    const diff = scheduledTime - now
    
    if (diff < 0) return null // Ya pasó
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    loadTrips()
    
    // Refrescar cada 10 segundos para ver nuevos viajes
    const interval = setInterval(loadTrips, 10000)
    return () => clearInterval(interval)
  }, [user, navigate, page, vehicleTypeFilter])

  // Actualizar contador de tiempo cada segundo
  useEffect(() => {
    if (trips.length === 0) return

    const interval = setInterval(() => {
      const newTimeRemaining: Record<string, string | null> = {}
      trips.forEach(trip => {
        if (trip.acceptanceDeadline) {
          const now = new Date()
          const deadlineDate = new Date(trip.acceptanceDeadline)
          const diff = deadlineDate.getTime() - now.getTime()
          
          if (diff <= 0) {
            newTimeRemaining[trip.id] = 'EXPIRADO'
          } else {
            const minutes = Math.floor(diff / 60000)
            const seconds = Math.floor((diff % 60000) / 1000)
            newTimeRemaining[trip.id] = `${minutes}:${seconds.toString().padStart(2, '0')}`
          }
        }
      })
      setTimeRemaining(newTimeRemaining)
    }, 1000)
    return () => clearInterval(interval)
  }, [trips])

  const loadTrips = async () => {
    try {
      setIsLoading(true)
      const result = await api.getAvailableTrips({
        page,
        limit: 20,
        vehicleType: vehicleTypeFilter !== 'ANY' ? vehicleTypeFilter : undefined,
      })
      setTrips(result.trips)
      setTotalPages(result.totalPages)

      // Formatear precios de forma asíncrona
      const prices: Record<string, string> = {}
      for (const trip of result.trips) {
        const formatted = await formatConvertedAmount(trip.totalPrice, trip.currency)
        prices[trip.id] = formatted
      }
      setFormattedPrices(prices)
    } catch (error) {
      console.error('Error loading available trips:', error)
      toast.error(t('driver.loadError') || 'Error al cargar viajes disponibles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptTrip = async (trip: Trip) => {
    if (isAccepting) return

    try {
      setIsAccepting(true)
      await api.acceptTrip(trip.id)
      toast.success(t('driver.tripAccepted') || 'Viaje aceptado correctamente')
      loadTrips()
      // Redirigir al dashboard para ver el viaje activo
      setTimeout(() => {
        navigate('/driver/dashboard')
      }, 1000)
    } catch (error: any) {
      console.error('Error accepting trip:', error)
      toast.error(error.message || t('driver.acceptError') || 'Error al aceptar viaje')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleRejectTrip = async (trip: Trip) => {
    try {
      await api.rejectTrip(trip.id)
      toast.success(t('driver.tripRejected') || 'Viaje rechazado')
      loadTrips()
    } catch (error: any) {
      console.error('Error rejecting trip:', error)
      toast.error(error.message || t('driver.rejectError') || 'Error al rechazar viaje')
    }
  }

  const getTimeRemaining = (deadline: string | null | undefined): string | null => {
    if (!deadline) return null
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diff = deadlineDate.getTime() - now.getTime()
    
    if (diff <= 0) return 'EXPIRADO'
    
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    if (minutes < 0 || seconds < 0) return 'EXPIRADO'
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const isExpired = (deadline: string | null | undefined): boolean => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const getVehicleTypeLabel = (type: string | null | undefined): string => {
    if (!type || type === 'ANY') return t('driver.anyVehicle') || 'Cualquier vehículo'
    const labels: Record<string, string> = {
      SEDAN: t('vehicle.sedan') || 'Sedán',
      SUV: t('vehicle.suv') || 'SUV',
      VAN: t('vehicle.van') || 'Van',
      PICKUP: t('vehicle.pickup') || 'Pickup',
      OFF_ROAD: t('vehicle.offRoad') || 'Todo Terreno',
      LUXURY: t('vehicle.luxury') || 'Lujo',
      MOTORCYCLE: t('vehicle.motorcycle') || 'Motocicleta',
      OTHER: t('vehicle.other') || 'Otro',
    }
    return labels[type] || type
  }

  if (isLoading && trips.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('common.loading') || 'Cargando...'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/driver/dashboard')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back') || 'Volver'}
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('driver.availableTrips') || 'Viajes Disponibles'}</h1>
        <p className="text-muted-foreground">
          {t('driver.availableTripsDescription') || 'Acepta o rechaza solicitudes de viaje'}
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('driver.filterByVehicle') || 'Filtrar por vehículo'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">{t('driver.anyVehicle') || 'Cualquier vehículo'}</SelectItem>
                {Object.values(VehicleType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {getVehicleTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de viajes */}
      {trips.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('driver.noTripsAvailable') || 'No hay viajes disponibles'}
              </h3>
              <p className="text-muted-foreground">
                {t('driver.noTripsAvailableDescription') || 'No hay solicitudes de viaje disponibles en este momento'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const currentTimeRemaining = timeRemaining[trip.id] || getTimeRemaining(trip.acceptanceDeadline || undefined)
            const expired = isExpired(trip.acceptanceDeadline || undefined)
            const isAssignedToMe = trip.driverId === user?.id

            return (
              <Card 
                key={trip.id} 
                className={`transition-all overflow-hidden ${expired ? 'opacity-60 border-dashed' : 'hover:shadow-lg'} ${
                  currentTimeRemaining && !expired && currentTimeRemaining !== 'EXPIRADO' && 
                  parseInt(currentTimeRemaining.split(':')[0]) < 2 ? 'border-orange-500' : ''
                }`}
              >
                <CardHeader className="pb-3 px-4 pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm md:text-base truncate">{trip.tripNumber}</span>
                      {isAssignedToMe && (
                        <Badge variant="default" className="text-xs">
                          {t('driver.assignedToYou') || 'Asignado a ti'}
                        </Badge>
                      )}
                      {expired && (
                        <Badge variant="destructive" className="text-xs">
                          {t('driver.expired') || 'Expirado'}
                        </Badge>
                      )}
                    </div>
                    {currentTimeRemaining && !expired && (
                      <div className="flex items-center gap-2 text-xs md:text-sm">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 text-orange-500 flex-shrink-0" />
                        <span className="font-mono font-semibold text-orange-500">
                          {currentTimeRemaining === 'EXPIRADO' ? (
                            <span className="text-red-500">{currentTimeRemaining}</span>
                          ) : (
                            currentTimeRemaining
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-3 md:space-y-4">
                    {/* Información del pasajero */}
                    {trip.passenger && (
                      <div className="flex items-center gap-2 p-2 md:p-3 bg-muted rounded-lg">
                        <Users className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs md:text-sm truncate">{trip.passenger.name}</div>
                          {trip.passenger.phone && (
                            <div className="text-xs md:text-sm text-muted-foreground truncate">{trip.passenger.phone}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Fecha y hora solicitada */}
                    <div className="flex items-center gap-2 p-2 md:p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {trip.scheduledAt ? (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs md:text-sm font-semibold text-blue-900 dark:text-blue-100">
                                {t('driver.scheduledFor') || 'Solicitado para'}: {formatDate(trip.scheduledAt)}
                              </span>
                              {isImmediateTrip(trip) && (
                                <Badge variant="destructive" className="text-[10px] md:text-xs">
                                  {t('driver.immediate') || 'Inmediato'}
                                </Badge>
                              )}
                            </div>
                            {getTimeUntilTrip(trip) && (
                              <div className="text-[10px] md:text-xs text-blue-700 dark:text-blue-300 mt-1">
                                {t('driver.timeUntil') || 'En'}: {getTimeUntilTrip(trip)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm font-semibold text-blue-900 dark:text-blue-100">
                              {t('driver.immediateTrip') || 'Viaje inmediato'}
                            </span>
                            <Badge variant="destructive" className="text-[10px] md:text-xs">
                              {t('driver.urgent') || 'Urgente'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ruta */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 md:gap-3">
                        <MapPin className="h-4 w-4 md:h-5 md:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm text-muted-foreground mb-1">
                            {t('driver.origin') || 'Origen'}
                          </div>
                          <div className="font-medium text-xs md:text-sm line-clamp-2 break-words">{trip.originAddress}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 md:gap-3">
                        <Navigation className="h-4 w-4 md:h-5 md:w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm text-muted-foreground mb-1">
                            {t('driver.destination') || 'Destino'}
                          </div>
                          <div className="font-medium text-xs md:text-sm line-clamp-2 break-words">{trip.destinationAddress}</div>
                        </div>
                      </div>
                    </div>

                    {/* Detalles del viaje */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 pt-3 md:pt-4 border-t">
                      <div>
                        <div className="text-xs md:text-sm text-muted-foreground mb-1">
                          {t('driver.distance') || 'Distancia'}
                        </div>
                        <div className="font-semibold text-xs md:text-sm">{trip.distanceText}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-muted-foreground mb-1">
                          {t('driver.duration') || 'Duración'}
                        </div>
                        <div className="font-semibold text-xs md:text-sm">{trip.durationText}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-muted-foreground mb-1">
                          {t('driver.passengers') || 'Pasajeros'}
                        </div>
                        <div className="font-semibold text-xs md:text-sm">{trip.passengers}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-muted-foreground mb-1">
                          {t('driver.vehicleType') || 'Tipo de vehículo'}
                        </div>
                        <div className="font-semibold text-xs md:text-sm truncate">
                          {getVehicleTypeLabel(trip.preferredVehicleType)}
                        </div>
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="flex items-center justify-between p-3 md:p-4 bg-primary/10 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs md:text-sm text-muted-foreground mb-1">
                          {t('driver.price') || 'Precio'}
                        </div>
                        <div className="text-lg md:text-2xl font-bold truncate">
                          {formattedPrices[trip.id] || formatAmount(trip.totalPrice, trip.currency)}
                        </div>
                        {trip.isRoundTrip && (
                          <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                            {t('driver.roundTrip') || 'Viaje de ida y vuelta'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    {!expired && (
                      <div className="flex gap-2 pt-3 md:pt-4 border-t">
                        <Button
                          onClick={() => handleAcceptTrip(trip)}
                          disabled={isAccepting || expired}
                          className="flex-1 text-xs md:text-sm h-9 md:h-10"
                        >
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          {t('driver.accept') || 'Aceptar'}
                        </Button>
                        <Button
                          onClick={() => handleRejectTrip(trip)}
                          variant="outline"
                          disabled={isAccepting}
                          className="text-xs md:text-sm h-9 md:h-10"
                        >
                          <XCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          {t('driver.reject') || 'Rechazar'}
                        </Button>
                      </div>
                    )}
                    {expired && (
                      <div className="pt-3 md:pt-4 border-t">
                        <div className="text-center text-xs md:text-sm text-muted-foreground">
                          {t('driver.expired') || 'Este viaje ha expirado y ya no está disponible'}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t('common.previous') || 'Anterior'}
          </Button>
          <div className="flex items-center px-4">
            {t('common.page') || 'Página'} {page} {t('common.of') || 'de'} {totalPages}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t('common.next') || 'Siguiente'}
          </Button>
        </div>
      )}
    </div>
  )
}

