import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, DollarSign, Navigation, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { Trip } from '@/types'
import { TripStatus } from '@/types'

export default function DriverDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { formatConvertedAmount, formatAmount, format, convertSync } = useCurrency()
  const [availableTripsCount, setAvailableTripsCount] = useState(0)
  const [activeTrips, setActiveTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    pendingTrips: 0,
    totalEarnings: 0,
  })
  const [formattedEarnings, setFormattedEarnings] = useState('$0')
  const [formattedTripPrices, setFormattedTripPrices] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    loadData()
    
    // Refrescar cada 30 segundos para ver nuevos viajes
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [user, navigate])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Cargar viajes disponibles
      const availableTrips = await api.getAvailableTrips({ limit: 1 })
      setAvailableTripsCount(availableTrips.total)

      // Cargar viajes activos del conductor
      const activeTripsData = await api.getDriverTrips({
        status: ['CONFIRMED', 'IN_PROGRESS'],
        limit: 5,
      })
      setActiveTrips(activeTripsData.trips)

      // Cargar estadísticas
      const allTrips = await api.getDriverTrips({ limit: 1000 })
      const completed = allTrips.trips.filter(t => t.status === TripStatus.COMPLETED)
      const pending = allTrips.trips.filter(t => t.status === TripStatus.PENDING)
      const earnings = completed.reduce((sum, trip) => sum + trip.totalPrice, 0)

      setStats({
        totalTrips: allTrips.total,
        completedTrips: completed.length,
        pendingTrips: pending.length,
        totalEarnings: earnings,
      })

      // Formatear ganancias
      const earningsFormatted = await formatConvertedAmount(earnings, 'CLP')
      setFormattedEarnings(earningsFormatted)

      // Formatear precios de viajes activos (sin símbolo, con ticker)
      const prices: Record<string, string> = {}
      for (const trip of activeTripsData.trips) {
        const formatted = await formatConvertedAmount(trip.totalPrice, trip.currency)
        prices[trip.id] = formatted
      }
      setFormattedTripPrices(prices)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error(t('driver.loadError') || 'Error al cargar datos')
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

  if (isLoading) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('driver.dashboard') || 'Panel de Conductor'}</h1>
        <p className="text-muted-foreground">
          {t('driver.dashboardDescription') || 'Gestiona tus viajes y encuentra nuevas solicitudes'}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('driver.availableTrips') || 'Viajes Disponibles'}
            </CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTripsCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('driver.newRequests') || 'Nuevas solicitudes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('driver.activeTrips') || 'Viajes Activos'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTrips.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('driver.inProgress') || 'En progreso'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('driver.completedTrips') || 'Completados'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTrips}</div>
            <p className="text-xs text-muted-foreground">
              {t('driver.totalCompleted') || 'Total completados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('driver.totalEarnings') || 'Ganancias Totales'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formattedEarnings}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('driver.fromCompletedTrips') || 'De viajes completados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('driver.findTrips') || 'Buscar Viajes'}</CardTitle>
            <CardDescription>
              {t('driver.findTripsDescription') || 'Ver viajes disponibles y aceptar solicitudes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/driver/trips/available')} className="w-full">
              <Navigation className="h-4 w-4 mr-2" />
              {t('driver.viewAvailableTrips') || 'Ver Viajes Disponibles'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('driver.myTrips') || 'Mis Viajes'}</CardTitle>
            <CardDescription>
              {t('driver.myTripsDescription') || 'Gestiona tus viajes asignados y activos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/driver/trips')} 
              variant="outline" 
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {t('driver.viewMyTrips') || 'Ver Mis Viajes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('driver.vehicles.title') || 'Mis Vehículos'}</CardTitle>
            <CardDescription>
              {t('driver.vehicles.description') || 'Gestiona tus vehículos registrados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/driver/vehicles')} 
              variant="outline" 
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {t('driver.vehicles.manage') || 'Gestionar Vehículos'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Viajes activos */}
      {activeTrips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('driver.activeTrips') || 'Viajes Activos'}</CardTitle>
            <CardDescription>
              {t('driver.activeTripsDescription') || 'Viajes que estás realizando actualmente'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => navigate(`/driver/trips/${trip.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{trip.tripNumber}</span>
                      {getStatusBadge(trip.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{trip.originAddress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{trip.destinationAddress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{trip.durationText}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formattedTripPrices[trip.id] || formatAmount(trip.totalPrice, trip.currency)}
                    </div>
                    {trip.passenger && (
                      <div className="text-sm text-muted-foreground">
                        {trip.passenger.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {activeTrips.length >= 5 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/driver/trips')}
              >
                {t('driver.viewAllTrips') || 'Ver Todos los Viajes'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerta si hay viajes disponibles */}
      {availableTripsCount > 0 && (
        <Card className="mt-4 border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  {t('driver.newTripsAvailable') || '¡Nuevos viajes disponibles!'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('driver.newTripsAvailableDescription', { count: availableTripsCount }) || 
                    `Hay ${availableTripsCount} viaje(s) disponible(s) para aceptar`}
                </p>
              </div>
              <Button onClick={() => navigate('/driver/trips/available')}>
                {t('driver.viewNow') || 'Ver Ahora'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

