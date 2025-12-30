import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, MapPin, DollarSign, User, Phone, ArrowRight, Eye, Car } from 'lucide-react'
import type { Trip } from '@/types'
import { TripStatus } from '@/types'
import { api } from '@/services/api'
import { useCurrency } from '@/hooks/useCurrency'

interface TripsListResponse {
  trips: Trip[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function AdminTrips() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { formatConvertedAmount, formatAmount } = useCurrency()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all')
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false)
  const [convertedPrices, setConvertedPrices] = useState<Record<string, string>>({})
  const [availableDrivers, setAvailableDrivers] = useState<Array<{
    id: string
    name: string
    email: string
    phone?: string | null
    country?: string | null
    vehicles: Array<{ id: string; make: string; model: string; licensePlate: string; type: string }>
  }>>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [driverVehicles, setDriverVehicles] = useState<Array<{
    id: string
    make: string
    model: string
    licensePlate: string
  }>>([])

  const loadTrips = useCallback(async () => {
    try {
      setIsLoading(true)
      const options: any = {
        page,
        limit: 20,
      }
      if (statusFilter !== 'all') {
        options.status = statusFilter
      }
      if (search) {
        options.search = search
      }

      const data: TripsListResponse = await api.getAdminTrips(options)
      setTrips(data.trips)
      setTotalPages(data.totalPages)

      // Convertir precios (sin símbolo, con ticker al final)
      const prices: Record<string, string> = {}
      for (const trip of data.trips) {
        const formatted = await formatConvertedAmount(trip.totalPrice, trip.currency)
        prices[trip.id] = formatted
      }
      setConvertedPrices(prices)
    } catch (error) {
      console.error('Error loading trips:', error)
      toast.error(t('admin.tripsLoadError') || 'Error al cargar viajes')
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter, search, formatConvertedAmount])

  useEffect(() => {
    const currentRole = user?.activeRole || user?.role
    if (!user || currentRole !== 'ADMIN') {
      navigate('/')
      return
    }
    loadTrips()
  }, [user, navigate, loadTrips])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadTrips()
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    setPage(1)
    if (status !== 'all') {
      setSearchParams({ status })
    } else {
      setSearchParams({})
    }
  }

  const handleViewDetails = async (trip: Trip) => {
    try {
      const fullTrip = await api.getAdminTrip(trip.id)
      setSelectedTrip(fullTrip)
      setIsDetailsDialogOpen(true)
    } catch (error) {
      console.error('Error loading trip details:', error)
      toast.error(t('admin.tripLoadError') || 'Error al cargar detalles del viaje')
    }
  }

  const handleOpenAssignDriver = async () => {
    if (!selectedTrip) return
    
    try {
      // Obtener el país del viaje desde originPlace o destinationPlace
      // Primero intentar obtener el viaje completo con los lugares
      const tripWithPlaces = await api.getAdminTrip(selectedTrip.id)
      const tripCountry = tripWithPlaces.originPlace?.country || tripWithPlaces.destinationPlace?.country
      
      // Si no hay país en los lugares, intentar inferirlo desde las coordenadas o usar el país del pasajero
      const country = tripCountry || selectedTrip.passenger?.country
      
      const drivers = await api.getAvailableDrivers(country || undefined)
      setAvailableDrivers(drivers)
      
      // Si ya hay un conductor asignado, pre-seleccionarlo
      if (selectedTrip.driverId) {
        setSelectedDriverId(selectedTrip.driverId)
        // Cargar vehículos del conductor actual
        try {
          const vehicles = await api.getDriverVehicles(selectedTrip.driverId)
          setDriverVehicles(vehicles)
          if (selectedTrip.vehicleId) {
            setSelectedVehicleId(selectedTrip.vehicleId)
          }
        } catch (error) {
          console.error('Error loading current driver vehicles:', error)
        }
      }
      
      setIsAssignDriverDialogOpen(true)
    } catch (error) {
      console.error('Error loading drivers:', error)
      toast.error(t('admin.driversLoadError') || 'Error al cargar conductores')
    }
  }

  const handleDriverChange = async (driverId: string) => {
    setSelectedDriverId(driverId)
    setSelectedVehicleId('')
    if (driverId) {
      try {
        const vehicles = await api.getDriverVehicles(driverId)
        setDriverVehicles(vehicles)
      } catch (error) {
        console.error('Error loading vehicles:', error)
        toast.error(t('admin.vehiclesLoadError') || 'Error al cargar vehículos')
      }
    } else {
      setDriverVehicles([])
    }
  }

  const handleAssignDriver = async () => {
    if (!selectedTrip || !selectedDriverId) return

    try {
      // Convertir "none" o string vacío a undefined para el vehículo
      const vehicleId = selectedVehicleId && selectedVehicleId !== 'none' && selectedVehicleId !== '' ? selectedVehicleId : undefined
      
      // Si ya hay un conductor asignado, permitir reasignación
      const allowReassign = !!selectedTrip.driverId && selectedTrip.driverId !== selectedDriverId
      
      await api.assignDriverToTrip(selectedTrip.id, selectedDriverId, vehicleId, allowReassign)
      toast.success(
        allowReassign 
          ? (t('admin.driverReassigned') || 'Conductor cambiado correctamente')
          : (t('admin.driverAssigned') || 'Conductor asignado correctamente')
      )
      setIsAssignDriverDialogOpen(false)
      setSelectedDriverId('')
      setSelectedVehicleId('')
      loadTrips()
      if (selectedTrip) {
        const updated = await api.getAdminTrip(selectedTrip.id)
        setSelectedTrip(updated)
      }
    } catch (error: any) {
      console.error('Error assigning driver:', error)
      toast.error(error.message || t('admin.driverAssignError') || 'Error al asignar conductor')
    }
  }

  const handleStatusUpdate = async (tripId: string, newStatus: TripStatus) => {
    try {
      await api.updateTripStatus(tripId, newStatus)
      toast.success(t('admin.tripStatusUpdated') || 'Estado del viaje actualizado')
      loadTrips()
      if (selectedTrip?.id === tripId) {
        const updated = await api.getAdminTrip(tripId)
        setSelectedTrip(updated)
      }
    } catch (error: any) {
      console.error('Error updating trip status:', error)
      toast.error(error.message || t('admin.tripStatusUpdateError') || 'Error al actualizar estado')
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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('admin.manageTrips') || 'Gestionar Viajes'}</h1>
        <p className="text-muted-foreground">
          {t('admin.tripsDescription') || 'Ver y gestionar todos los viajes'}
        </p>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t('admin.searchTrips') || 'Buscar por número, dirección, pasajero o conductor...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.allStatuses') || 'Todos'}</SelectItem>
                  <SelectItem value="PENDING">{t('trip.status.pending') || 'Pendiente'}</SelectItem>
                  <SelectItem value="CONFIRMED">{t('trip.status.confirmed') || 'Confirmado'}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('trip.status.inProgress') || 'En Progreso'}</SelectItem>
                  <SelectItem value="COMPLETED">{t('trip.status.completed') || 'Completado'}</SelectItem>
                  <SelectItem value="CANCELLED">{t('trip.status.cancelled') || 'Cancelado'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              {t('common.search') || 'Buscar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabla de viajes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.tripsList') || 'Lista de Viajes'}</CardTitle>
          <CardDescription>
            {trips.length} {t('admin.tripsFound') || 'viajes encontrados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">{t('common.loading') || 'Cargando...'}</div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('admin.noTripsFound') || 'No se encontraron viajes'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">{t('admin.tripNumber') || 'Número'}</TableHead>
                          <TableHead className="min-w-[180px]">{t('passenger.origin') || 'Origen'}</TableHead>
                          <TableHead className="min-w-[180px]">{t('passenger.destination') || 'Destino'}</TableHead>
                          <TableHead className="min-w-[120px]">{t('passenger.driver') || 'Conductor'}</TableHead>
                          <TableHead className="min-w-[100px]">{t('passenger.passengers') || 'Pasajeros'}</TableHead>
                          <TableHead className="min-w-[100px]">{t('admin.price') || 'Precio'}</TableHead>
                          <TableHead className="min-w-[100px]">{t('admin.status') || 'Estado'}</TableHead>
                          <TableHead className="min-w-[140px]">{t('admin.createdAt') || 'Creado'}</TableHead>
                          <TableHead className="text-right min-w-[120px]">{t('admin.actions') || 'Acciones'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                    {trips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">{trip.tripNumber}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{trip.originAddress}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{trip.destinationAddress}</TableCell>
                        <TableCell>
                          {trip.driver ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{trip.driver.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{trip.passengers}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {convertedPrices[trip.id] || formatAmount(trip.totalPrice, trip.currency)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(trip.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(trip.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(trip)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('admin.page') || 'Página'} {page} {t('admin.of') || 'de'} {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t('common.previous') || 'Anterior'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      {t('common.next') || 'Siguiente'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de detalles */}
      {selectedTrip && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTrip.tripNumber}</DialogTitle>
              <DialogDescription>
                {t('admin.tripDetails') || 'Detalles del viaje'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Información de ruta */}
              <div>
                <h3 className="font-semibold mb-2">{t('passenger.route') || 'Ruta'}</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{t('passenger.origin') || 'Origen'}</p>
                      <p className="text-sm text-muted-foreground">{selectedTrip.originAddress}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-2 text-muted-foreground" />
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">{t('passenger.destination') || 'Destino'}</p>
                      <p className="text-sm text-muted-foreground">{selectedTrip.destinationAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                  <span>{selectedTrip.distanceText}</span>
                  <span>•</span>
                  <span>{selectedTrip.durationText}</span>
                </div>
              </div>

              {/* Información de pasajero y conductor */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('passenger.passengers') || 'Pasajero'}</h3>
                  {selectedTrip.passenger ? (
                    <div className="space-y-1">
                      <p className="text-sm">{selectedTrip.passenger.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedTrip.passenger.email}</p>
                      {selectedTrip.passenger.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedTrip.passenger.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('passenger.driver') || 'Conductor'}</h3>
                  {selectedTrip.driver ? (
                    <div className="space-y-1">
                      <p className="text-sm">{selectedTrip.driver.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedTrip.driver.email}</p>
                      {selectedTrip.driver.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedTrip.driver.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('admin.noDriverAssigned') || 'Sin asignar'}</p>
                  )}
                </div>
              </div>

              {/* Información de precio */}
              <div>
                <h3 className="font-semibold mb-2">{t('passenger.payment') || 'Pago'}</h3>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-2xl font-bold">
                    {convertedPrices[selectedTrip.id] || formatAmount(selectedTrip.totalPrice, selectedTrip.currency)}
                  </span>
                </div>
              </div>

              {/* Estado y fechas */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('admin.status') || 'Estado'}</h3>
                  {getStatusBadge(selectedTrip.status)}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('admin.createdAt') || 'Creado'}</h3>
                  <p className="text-sm">{formatDate(selectedTrip.createdAt)}</p>
                </div>
              </div>

              {/* Asignar conductor */}
              {!selectedTrip.driver && selectedTrip.status === 'PENDING' && (
                <div>
                  <h3 className="font-semibold mb-2">{t('admin.assignDriver') || 'Asignar Conductor'}</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenAssignDriver}
                  >
                    <User className="h-4 w-4 mr-2" />
                    {t('admin.selectDriver') || 'Seleccionar Conductor'}
                  </Button>
                </div>
              )}

              {/* Información del vehículo */}
              {selectedTrip.vehicle && (
                <div>
                  <h3 className="font-semibold mb-2">{t('passenger.vehicle') || 'Vehículo'}</h3>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{selectedTrip.vehicle.make} {selectedTrip.vehicle.model}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('passenger.licensePlate') || 'Placa'}: {selectedTrip.vehicle.licensePlate}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Acciones de estado */}
              {selectedTrip.status !== 'COMPLETED' && selectedTrip.status !== 'CANCELLED' && (
                <div>
                  <h3 className="font-semibold mb-2">{t('admin.changeStatus') || 'Cambiar Estado'}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {selectedTrip.status === 'PENDING' && selectedTrip.driver && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(selectedTrip.id, TripStatus.CONFIRMED)}
                      >
                        {t('admin.confirmTrip') || 'Confirmar'}
                      </Button>
                    )}
                    {selectedTrip.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(selectedTrip.id, TripStatus.IN_PROGRESS)}
                      >
                        {t('admin.startTrip') || 'Iniciar Viaje'}
                      </Button>
                    )}
                    {selectedTrip.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatusUpdate(selectedTrip.id, TripStatus.COMPLETED)}
                      >
                        {t('admin.completeTrip') || 'Completar'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatusUpdate(selectedTrip.id, TripStatus.CANCELLED)}
                    >
                      {t('admin.cancelTrip') || 'Cancelar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                {t('common.close') || 'Cerrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de asignar conductor */}
      <Dialog open={isAssignDriverDialogOpen} onOpenChange={setIsAssignDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.assignDriver') || 'Asignar Conductor'}</DialogTitle>
            <DialogDescription>
              {t('admin.assignDriverDescription') || 'Selecciona un conductor y vehículo para este viaje'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="driver">{t('passenger.driver') || 'Conductor'}</Label>
              <Select value={selectedDriverId} onValueChange={handleDriverChange}>
                <SelectTrigger id="driver">
                  <SelectValue placeholder={t('admin.selectDriver') || 'Seleccionar conductor'} />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <p className="font-medium">{driver.name}</p>
                          {driver.country && (
                            <p className="text-xs text-muted-foreground">
                              {driver.country}
                            </p>
                          )}
                          {driver.vehicles.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {driver.vehicles.length} {t('admin.vehiclesAvailable') || 'vehículos disponibles'}
                            </p>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDriverId && driverVehicles.length > 0 && (
              <div>
                <Label htmlFor="vehicle">{t('passenger.vehicle') || 'Vehículo'}</Label>
                <Select 
                  value={selectedVehicleId || 'none'} 
                  onValueChange={(value) => setSelectedVehicleId(value === 'none' ? '' : value)}
                >
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder={t('admin.selectVehicle') || 'Seleccionar vehículo (opcional)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('admin.noVehicle') || 'Sin vehículo específico'}</SelectItem>
                    {driverVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.licensePlate}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedDriverId && driverVehicles.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('admin.noVehiclesAvailable') || 'Este conductor no tiene vehículos disponibles'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAssignDriverDialogOpen(false)
              setSelectedDriverId('')
              setSelectedVehicleId('')
              setDriverVehicles([])
            }}>
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button
              onClick={handleAssignDriver}
              disabled={!selectedDriverId}
            >
              {t('admin.assign') || 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

