import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  MapPin,
  Navigation,
  Loader2,
  Phone,
  Users,
  FileText,
} from 'lucide-react'
import { initializeGoogleMaps, searchPlaces, getPlaceDetails, type PlacePrediction } from '@/services/googleMaps'
import { getCountryCodeForMaps } from '@/services/locationService'

const EMERGENCY_TYPES = [
  { value: 'ACCIDENT', label: 'Accidente' },
  { value: 'MEDICAL', label: 'Emergencia Médica' },
  { value: 'FIRE', label: 'Incendio' },
  { value: 'CRIME', label: 'Crimen' },
  { value: 'SECURITY_THREAT', label: 'Amenaza de Seguridad' },
  { value: 'MOUNTAIN_RESCUE', label: 'Rescate en Montaña' },
  { value: 'WATER_RESCUE', label: 'Rescate Acuático' },
  { value: 'OTHER', label: 'Otro' },
]

const SEVERITY_LEVELS = [
  { value: 'LOW', label: 'Baja', description: 'Situación controlada' },
  { value: 'MEDIUM', label: 'Media', description: 'Requiere atención' },
  { value: 'HIGH', label: 'Alta', description: 'Urgente' },
  { value: 'CRITICAL', label: 'Crítica', description: 'Vida en peligro' },
]

export default function ReportEmergency() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationPredictions, setLocationPredictions] = useState<PlacePrediction[]>([])
  const [showLocationPredictions, setShowLocationPredictions] = useState(false)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{
    address?: string
    city?: string
    country?: string
    latitude: number
    longitude: number
    placeId?: string
  } | null>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const locationDropdownRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    emergencyType: '',
    severity: 'HIGH',
    title: '',
    description: '',
    numberOfPeople: 1,
    tripId: '',
  })

  const [activeTrips, setActiveTrips] = useState<Array<{ id: string; tripNumber: string; originAddress: string; destinationAddress: string }>>([])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    // Inicializar Google Maps
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (apiKey) {
      initializeGoogleMaps(apiKey).catch((error) => {
        console.error('Error inicializando Google Maps:', error)
      })
    }

    // Obtener ubicación actual
    getCurrentLocation()

    // Cargar viajes activos del usuario
    loadActiveTrips()
  }, [user, navigate])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowLocationPredictions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsGettingLocation(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setUserLocation({ latitude: lat, longitude: lng })
          
          // Intentar obtener dirección
          try {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            if (apiKey) {
              const { reverseGeocode } = await import('@/services/googleMaps')
              const address = await reverseGeocode(lat, lng)
              if (address) {
                // Extraer ciudad desde formattedAddress si es posible
                const addressParts = address.formattedAddress.split(',')
                const city = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : undefined
                
                setSelectedLocation({
                  address: address.formattedAddress,
                  city,
                  country: address.country,
                  latitude: address.location.lat,
                  longitude: address.location.lng,
                  placeId: address.placeId,
                })
                setLocationSearch(address.formattedAddress)
              } else {
                setSelectedLocation({
                  latitude: lat,
                  longitude: lng,
                })
              }
            } else {
              setSelectedLocation({
                latitude: lat,
                longitude: lng,
              })
            }
          } catch (error) {
            console.error('Error obteniendo dirección:', error)
            setSelectedLocation({
              latitude: lat,
              longitude: lng,
            })
          }
          setIsGettingLocation(false)
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error)
          toast.error('No se pudo obtener tu ubicación. Por favor, selecciona una ubicación manualmente.')
          setIsGettingLocation(false)
        }
      )
    } else {
      toast.warning('Tu navegador no soporta geolocalización. Por favor, selecciona una ubicación manualmente.')
    }
  }

  const loadActiveTrips = async () => {
    try {
      // Cargar viajes activos del usuario
      const trips = await api.getTrips('IN_PROGRESS')
      if (Array.isArray(trips) && trips.length > 0) {
        setActiveTrips(trips.map((trip: any) => ({
          id: trip.id,
          tripNumber: trip.tripNumber || trip.id,
          originAddress: trip.originAddress || 'Origen',
          destinationAddress: trip.destinationAddress || 'Destino',
        })))
      }
    } catch (error) {
      console.error('Error cargando viajes:', error)
      // No mostrar error al usuario, simplemente no mostrar viajes relacionados
    }
  }

  // Buscar lugares cuando el usuario escribe
  useEffect(() => {
    if (locationSearch.length > 2) {
      const timeoutId = setTimeout(async () => {
        try {
          const userCountryCode = user?.country ? getCountryCodeForMaps(user.country) : 'cl'
          const predictions = await searchPlaces(locationSearch, userCountryCode)
          setLocationPredictions(predictions)
          setShowLocationPredictions(true)
        } catch (error) {
          console.error('Error buscando lugares:', error)
        }
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setLocationPredictions([])
      setShowLocationPredictions(false)
    }
  }, [locationSearch, user])

  const handleSelectLocation = async (prediction: PlacePrediction) => {
    try {
      if (!prediction.placeId) {
        toast.error('Error: No se pudo obtener el ID del lugar. Por favor, intenta seleccionar otra ubicación.')
        return
      }

      const details = await getPlaceDetails(prediction.placeId)
      if (details) {
        // Extraer ciudad desde formattedAddress si es posible
        const addressParts = details.formattedAddress.split(',')
        const city = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : undefined
        
        setSelectedLocation({
          address: details.formattedAddress,
          city,
          country: details.country,
          latitude: details.location.lat,
          longitude: details.location.lng,
          placeId: details.placeId,
        })
        setLocationSearch(details.formattedAddress)
        setShowLocationPredictions(false)
      } else {
        toast.error('No se pudieron obtener los detalles del lugar seleccionado')
      }
    } catch (error) {
      console.error('Error obteniendo detalles del lugar:', error)
      toast.error('Error al obtener detalles del lugar. Por favor, intenta nuevamente.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.emergencyType || !formData.title || !formData.description) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (!selectedLocation) {
      toast.error('Por favor selecciona o permite el acceso a tu ubicación')
      return
    }

    try {
      setIsLoading(true)
      
      // Preparar datos, omitiendo campos undefined
      const emergencyData: any = {
        emergencyType: formData.emergencyType,
        severity: formData.severity,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        title: formData.title,
        description: formData.description,
      }

      // Agregar campos opcionales solo si tienen valor
      if (selectedLocation.address) emergencyData.address = selectedLocation.address
      if (selectedLocation.city) emergencyData.city = selectedLocation.city
      if (selectedLocation.country) emergencyData.country = selectedLocation.country
      if (selectedLocation.placeId) emergencyData.placeId = selectedLocation.placeId
      if (formData.numberOfPeople) emergencyData.numberOfPeople = formData.numberOfPeople
      if (formData.tripId) emergencyData.tripId = formData.tripId

      await api.createEmergency(emergencyData)

      toast.success('Emergencia reportada correctamente. Las autoridades han sido notificadas.')
      navigate('/')
    } catch (error: any) {
      console.error('Error reportando emergencia:', error)
      toast.error(error.message || 'Error al reportar emergencia')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <CardTitle>{t('emergency.report.title') || 'Reportar Emergencia'}</CardTitle>
              <CardDescription>
                {t('emergency.report.description') ||
                  'Reporta una emergencia. Las autoridades serán notificadas inmediatamente.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Emergencia */}
            <div className="space-y-2">
              <Label htmlFor="emergencyType">
                {t('emergency.report.type') || 'Tipo de Emergencia'} *
              </Label>
              <Select
                value={formData.emergencyType}
                onValueChange={(value) => setFormData({ ...formData, emergencyType: value })}
                required
              >
                <SelectTrigger id="emergencyType">
                  <SelectValue placeholder={t('emergency.report.selectType') || 'Selecciona el tipo de emergencia'} />
                </SelectTrigger>
                <SelectContent>
                  {EMERGENCY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severidad */}
            <div className="space-y-2">
              <Label htmlFor="severity">
                {t('emergency.report.severity') || 'Severidad'} *
              </Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
                required
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-xs text-muted-foreground">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {t('emergency.report.titleLabel') || 'Título'} *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('emergency.report.titlePlaceholder') || 'Ej: Accidente de tránsito en Avenida Principal'}
                required
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {t('emergency.report.descriptionLabel') || 'Descripción'} *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('emergency.report.descriptionPlaceholder') || 'Describe la emergencia con el mayor detalle posible...'}
                rows={5}
                required
              />
            </div>

            {/* Número de personas */}
            <div className="space-y-2">
              <Label htmlFor="numberOfPeople">
                {t('emergency.report.numberOfPeople') || 'Número de personas afectadas'}
              </Label>
              <Input
                id="numberOfPeople"
                type="number"
                min="1"
                value={formData.numberOfPeople}
                onChange={(e) => setFormData({ ...formData, numberOfPeople: parseInt(e.target.value) || 1 })}
              />
            </div>

            {/* Viaje relacionado (opcional) */}
            {activeTrips.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="tripId">
                  {t('emergency.report.relatedTrip') || 'Viaje relacionado (opcional)'}
                </Label>
                <Select
                  value={formData.tripId || undefined}
                  onValueChange={(value) => setFormData({ ...formData, tripId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger id="tripId">
                    <SelectValue placeholder={t('emergency.report.selectTrip') || 'Ninguno'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('emergency.report.none') || 'Ninguno'}</SelectItem>
                    {activeTrips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.tripNumber} - {trip.originAddress} → {trip.destinationAddress}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Ubicación */}
            <div className="space-y-2">
              <Label>
                {t('emergency.report.location') || 'Ubicación'} *
              </Label>
              <div className="space-y-2">
                <div className="relative">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                      ref={locationInputRef}
                      placeholder={t('emergency.report.locationPlaceholder') || 'Buscar ubicación o usar mi ubicación actual'}
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      onFocus={() => locationSearch.length > 2 && setShowLocationPredictions(true)}
                      className="pl-10 pr-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-2"
                      title={t('emergency.report.useCurrentLocation') || 'Usar mi ubicación actual'}
                    >
                      {isGettingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {showLocationPredictions && locationPredictions.length > 0 && (
                    <div
                      ref={locationDropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto"
                    >
                      {locationPredictions.map((prediction) => (
                        <button
                          key={prediction.placeId}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-2"
                          onClick={() => handleSelectLocation(prediction)}
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{prediction.mainText}</p>
                            <p className="text-xs text-muted-foreground truncate">{prediction.secondaryText}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedLocation && (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <div>
                        {selectedLocation.address || 'Ubicación seleccionada'}
                        {selectedLocation.city && (
                          <div className="text-muted-foreground">
                            {selectedLocation.city}
                            {selectedLocation.country && `, ${selectedLocation.country}`}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                {t('common.cancel') || 'Cancelar'}
              </Button>
              <Button type="submit" disabled={isLoading || !selectedLocation}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('emergency.report.reporting') || 'Reportando...'}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t('emergency.report.submit') || 'Reportar Emergencia'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

