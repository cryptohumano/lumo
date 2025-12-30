import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Wallet,
} from 'lucide-react'
import { initializeGoogleMaps, searchPlaces, getPlaceDetails, type PlacePrediction } from '@/services/googleMaps'
import { getCountryCodeForMaps } from '@/services/locationService'
import { getImprovedLocation, validateLocationForEmergency, type ImprovedLocation } from '@/services/improvedLocationService'
import { reportEmergencyOnChain, getEmergencyTransactionInfo, type EmergencyOnChainData } from '@/services/emergencyOnChainService'
import { usePolkadotWallet } from '@/hooks/usePolkadotWallet'
import type { ChainName } from '@/services/polkadotService'
import { Switch } from '@/components/ui/switch'

/**
 * Obtiene la URL del explorador de blockchain para una transacción
 */
function getExplorerUrl(chain: ChainName, txHash: string): string {
  // Para Paseo Asset Hub, usar Subscan o Polkascan
  if (chain === 'PASET_HUB') {
    // Subscan para Paseo Asset Hub
    return `https://paseo-asset-hub.subscan.io/extrinsic/${txHash}`
  }
  
  // Para otras chains, usar exploradores estándar
  if (chain === 'POLKADOT' || chain === 'ASSET_HUB') {
    return `https://polkadot.subscan.io/extrinsic/${txHash}`
  }
  
  if (chain === 'KUSAMA' || chain === 'ASSET_HUB_KUSAMA') {
    return `https://kusama.subscan.io/extrinsic/${txHash}`
  }
  
  if (chain === 'PEOPLE_CHAIN') {
    return `https://polkadot.subscan.io/extrinsic/${txHash}`
  }
  
  // Default: usar Subscan genérico
  return `https://subscan.io/extrinsic/${txHash}`
}

// Los tipos y severidades se obtendrán de las traducciones

export default function ReportEmergency() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isConnected, selectedAccount, connect } = usePolkadotWallet()
  
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [isGettingImprovedLocation, setIsGettingImprovedLocation] = useState(false)
  const [useOnChain, setUseOnChain] = useState(true) // Preferir on-chain por defecto
  const [txStatus, setTxStatus] = useState<'idle' | 'preparing' | 'signing' | 'broadcasting' | 'in-block' | 'finalized' | 'error'>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [txBlockNumber, setTxBlockNumber] = useState<string | null>(null)
  const [showTxConfirmDialog, setShowTxConfirmDialog] = useState(false)
  const [txInfo, setTxInfo] = useState<any>(null)
  const [polkadotConfig, setPolkadotConfig] = useState<any>(null)

  // Obtener tipos y severidades desde traducciones
  const EMERGENCY_TYPES = [
    { value: 'ACCIDENT', label: t('emergency.types.ACCIDENT') },
    { value: 'MEDICAL', label: t('emergency.types.MEDICAL') },
    { value: 'FIRE', label: t('emergency.types.FIRE') },
    { value: 'CRIME', label: t('emergency.types.CRIME') },
    { value: 'SECURITY_THREAT', label: t('emergency.types.SECURITY_THREAT') },
    { value: 'MOUNTAIN_RESCUE', label: t('emergency.types.MOUNTAIN_RESCUE') },
    { value: 'WATER_RESCUE', label: t('emergency.types.WATER_RESCUE') },
    { value: 'OTHER', label: t('emergency.types.OTHER') },
  ]

  const SEVERITY_LEVELS = [
    { value: 'LOW', label: t('emergency.severity.LOW'), description: t('emergency.report.severityLow') || 'Situación controlada' },
    { value: 'MEDIUM', label: t('emergency.severity.MEDIUM'), description: t('emergency.report.severityMedium') || 'Requiere atención' },
    { value: 'HIGH', label: t('emergency.severity.HIGH'), description: t('emergency.report.severityHigh') || 'Urgente' },
    { value: 'CRITICAL', label: t('emergency.severity.CRITICAL'), description: t('emergency.report.severityCritical') || 'Vida en peligro' },
  ]
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

    // NO obtener ubicación automáticamente al cargar
    // El usuario debe hacer clic en "Usar mi ubicación actual" para evitar errores en localhost
    // getCurrentLocation() // Comentado: solo obtener cuando el usuario lo solicite

    // Cargar viajes activos del usuario
    loadActiveTrips()
    
    // Cargar configuración de Polkadot
    loadPolkadotConfig()
  }, [user, navigate])

  const loadPolkadotConfig = async () => {
    try {
      const config = await api.getPolkadotConfig()
      setPolkadotConfig(config)
    } catch (error) {
      console.error('Error cargando configuración de Polkadot:', error)
      // Usar valores por defecto
      setPolkadotConfig({
        paymentChain: 'PASET_HUB',
        paymentPreset: 'paset-hub-pas',
      })
    }
  }

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(target) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(target)
      ) {
        // Pequeño delay para permitir que el click en el botón se procese primero
        setTimeout(() => {
          setShowLocationPredictions(false)
        }, 100)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getCurrentLocation = async () => {
    setIsGettingImprovedLocation(true)
    setIsGettingLocation(true)
    try {
      // Usar el servicio mejorado de ubicación
      // NO usar network para evitar geolocalización por IP (muy imprecisa)
      const improvedLocation = await getImprovedLocation({
        useGPS: true,
        useNetwork: false, // NO usar network (evita IP geolocation de 20km+ error)
        timeout: 30000, // 30 segundos para dar más tiempo al GPS
        requireGPS: true, // Requerir GPS real, rechazar IP geolocation
      })

      setUserLocation({ 
        latitude: improvedLocation.latitude, 
        longitude: improvedLocation.longitude 
      })
      setLocationAccuracy(improvedLocation.accuracy)

      // Validar precisión
      const validation = validateLocationForEmergency(improvedLocation)
      if (!validation.valid) {
        // Si la precisión es muy mala (> 1000m), probablemente es IP geolocation
        if (improvedLocation.accuracy > 1000) {
          toast.error(
            'Ubicación GPS no disponible',
            {
              description: `Precisión muy baja (${improvedLocation.accuracy.toFixed(0)}m). ` +
                `Parece que estás usando geolocalización por IP. ` +
                `Por favor, selecciona tu ubicación manualmente usando la búsqueda.`,
              duration: 10000,
            }
          )
        } else {
          toast.warning(
            `Precisión baja: ${improvedLocation.accuracy.toFixed(0)}m`,
            {
              description: validation.reason || 'Intenta moverte a un lugar abierto o espera unos segundos más.',
            }
          )
        }
      } else {
        // Mostrar confirmación de buena precisión
        console.log(`✅ Ubicación GPS precisa obtenida: ${improvedLocation.accuracy.toFixed(0)}m`)
      }

      // Intentar obtener dirección usando reverse geocoding
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        if (apiKey) {
          const { reverseGeocode } = await import('@/services/googleMaps')
          const address = await reverseGeocode(improvedLocation.latitude, improvedLocation.longitude)
          if (address) {
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
              latitude: improvedLocation.latitude,
              longitude: improvedLocation.longitude,
            })
          }
        } else {
          setSelectedLocation({
            latitude: improvedLocation.latitude,
            longitude: improvedLocation.longitude,
          })
        }
      } catch (error) {
        console.error('Error obteniendo dirección:', error)
        setSelectedLocation({
          latitude: improvedLocation.latitude,
          longitude: improvedLocation.longitude,
        })
      }
    } catch (error: any) {
      console.error('Error obteniendo ubicación mejorada:', error)
      
      // Si el error es porque no hay GPS disponible (típico en localhost), mostrar mensaje informativo
      if (error.message?.includes('GPS no disponible') || error.message?.includes('No se pudo obtener ubicación GPS')) {
        toast.info(
          'GPS no disponible',
          {
            description: 'El GPS no está disponible en este momento. Por favor, usa la búsqueda para seleccionar tu ubicación manualmente.',
            duration: 5000,
          }
        )
      } else {
        toast.error(
          'No se pudo obtener tu ubicación',
          {
            description: error.message || 'Por favor, selecciona una ubicación manualmente usando la búsqueda.',
          }
        )
      }
    } finally {
      setIsGettingImprovedLocation(false)
      setIsGettingLocation(false)
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
      // Cerrar dropdown inmediatamente para mejor UX
      setShowLocationPredictions(false)
      
      if (!prediction.placeId) {
        toast.error('Error: No se pudo obtener el ID del lugar. Por favor, intenta seleccionar otra ubicación.')
        return
      }

      // Mostrar loading mientras se obtienen los detalles
      setIsGettingLocation(true)
      
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
        setLocationAccuracy(null) // Resetear precisión cuando se selecciona manualmente
        
        toast.success('Ubicación seleccionada', {
          description: details.formattedAddress,
          duration: 2000,
        })
      } else {
        toast.error('No se pudieron obtener los detalles del lugar seleccionado')
        setShowLocationPredictions(true) // Reabrir dropdown si falla
      }
    } catch (error) {
      console.error('Error obteniendo detalles del lugar:', error)
      toast.error('Error al obtener detalles del lugar. Por favor, intenta nuevamente.')
      setShowLocationPredictions(true) // Reabrir dropdown si falla
    } finally {
      setIsGettingLocation(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.emergencyType || !formData.title || !formData.description) {
      toast.error(t('common.fillAllFields') || 'Por favor completa todos los campos requeridos')
      return
    }

    if (!selectedLocation) {
      toast.error(t('emergency.report.locationRequired') || 'Por favor selecciona o permite el acceso a tu ubicación')
      return
    }

    try {
      setIsLoading(true)
      
      // Preparar datos de emergencia
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

      // Intentar enviar a Polkadot primero (si está habilitado y hay wallet conectada)
      if (useOnChain && isConnected && selectedAccount) {
        // Preparar datos de emergencia para on-chain
        const onChainData: EmergencyOnChainData = {
          emergencyType: formData.emergencyType,
          severity: formData.severity,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          timestamp: Date.now(),
          title: formData.title,
          description: formData.description,
          numberOfPeople: formData.numberOfPeople,
          address: selectedLocation.address,
          city: selectedLocation.city,
          country: selectedLocation.country,
        }

        // Obtener chain de la configuración o usar default
        const chain: ChainName = (polkadotConfig?.paymentChain || 'PASET_HUB') as ChainName
        
        // Obtener información de la transacción antes de mostrar el modal
        try {
          setIsLoading(false) // Pausar loading mientras se obtiene la info
          const info = await getEmergencyTransactionInfo(selectedAccount, onChainData, chain)
          setTxInfo({ ...info, emergencyData: onChainData, polkadotConfig })
          setShowTxConfirmDialog(true)
          return // No continuar hasta que el usuario confirme
        } catch (error: any) {
          console.error('Error obteniendo información de transacción:', error)
          toast.error('Error preparando transacción', {
            description: error.message || 'No se pudo obtener la información de la transacción',
          })
          // Continuar con backend como fallback
        }
      }

      // Fallback: enviar al backend
      await api.createEmergency(emergencyData)
      toast.success(t('emergency.report.success'))
      navigate('/')
    } catch (error: any) {
      console.error('Error reportando emergencia:', error)
      toast.error(error.message || t('emergency.report.error'))
    } finally {
      setIsLoading(false)
    }
  }

  // Función para confirmar y enviar la transacción on-chain
  const handleConfirmOnChainTransaction = async () => {
    if (!txInfo || !selectedAccount) return

    try {
      setIsLoading(true)
      setShowTxConfirmDialog(false)
      setTxStatus('preparing')

      const chain: ChainName = txInfo.chain
      const onChainData = txInfo.emergencyData

      toast.info('🚨 Preparando emergencia para blockchain...', {
        description: 'Preparando datos críticos para enviar a Polkadot',
        duration: 3000,
      })

      setTxStatus('signing')
      toast.info('✍️ Firmando transacción...', {
        description: 'Por favor, confirma la transacción en tu wallet',
        duration: 5000,
      })

      const result = await reportEmergencyOnChain(selectedAccount, onChainData, chain)

      if (result.success && result.txHash) {
            setTxHash(result.txHash)
            setTxBlockNumber(result.blockNumber || null)
            setTxStatus('finalized')
            
            // Obtener URL del explorador
            const explorerUrl = getExplorerUrl(chain, result.txHash)
            
            toast.success('✅ Emergencia reportada en la blockchain', {
              description: (
                <div className="flex flex-col gap-1">
                  <span>TX: {result.txHash.slice(0, 16)}...</span>
                  {result.blockNumber && <span>Bloque: {result.blockNumber}</span>}
                  {explorerUrl && (
                    <a 
                      href={explorerUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver en explorador →
                    </a>
                  )}
                </div>
              ),
              duration: 10000,
            })

        // También sincronizar con backend (opcional, en background)
        try {
          await api.createEmergency({
            ...onChainData,
            onChainTxHash: result.txHash,
            onChainBlockNumber: result.blockNumber,
          })
          console.log('✅ Emergencia sincronizada con backend')
        } catch (backendError) {
          // No es crítico si falla el backend, la emergencia ya está en la blockchain
          console.warn('⚠️ No se pudo sincronizar con backend:', backendError)
          toast.warning('Emergencia en blockchain, pero no se pudo sincronizar con servidor', {
            description: 'La emergencia está registrada en la blockchain de forma permanente',
          })
        }

        // Esperar un momento antes de navegar para que el usuario vea el éxito
        setTimeout(() => {
          navigate('/')
        }, 2000)
        return
      } else {
        // Si falla on-chain, intentar backend como fallback
        setTxStatus('error')
        console.warn('Fallo reporte on-chain, usando backend:', result.error)
        toast.warning('No se pudo enviar a la blockchain, usando servidor como respaldo', {
          description: result.error || 'Continuando con método alternativo...',
        })
        // Continuar con backend
        await api.createEmergency(onChainData)
        toast.success(t('emergency.report.success'))
        navigate('/')
      }
    } catch (onChainError: any) {
      setTxStatus('error')
      console.error('Error en reporte on-chain:', onChainError)
      // Continuar con backend como fallback
      toast.warning('Error al enviar a la blockchain, usando servidor como respaldo', {
        description: onChainError.message || 'La emergencia se reportará al servidor central',
      })
      if (txInfo?.emergencyData) {
        await api.createEmergency(txInfo.emergencyData)
        toast.success(t('emergency.report.success'))
        navigate('/')
      }
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
                      onChange={(e) => {
                        setLocationSearch(e.target.value)
                        // Mostrar predicciones cuando hay más de 2 caracteres
                        if (e.target.value.length > 2) {
                          setShowLocationPredictions(true)
                        } else {
                          setShowLocationPredictions(false)
                        }
                      }}
                      onFocus={() => {
                        // Mostrar predicciones si ya hay texto
                        if (locationSearch.length > 2 && locationPredictions.length > 0) {
                          setShowLocationPredictions(true)
                        }
                      }}
                      className="pl-10 pr-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation || isGettingImprovedLocation}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-2"
                      title={t('emergency.report.useCurrentLocation') || 'Usar mi ubicación actual (requiere GPS)'}
                    >
                      {isGettingLocation || isGettingImprovedLocation ? (
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
                      onMouseDown={(e) => {
                        // Prevenir que el evento se propague y cierre el dropdown
                        e.preventDefault()
                      }}
                    >
                      {locationPredictions.map((prediction) => (
                        <button
                          key={prediction.placeId}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-2 cursor-pointer"
                          onMouseDown={(e) => {
                            // Prevenir que el evento se propague
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleSelectLocation(prediction)
                          }}
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
                  {showLocationPredictions && locationSearch.length > 2 && locationPredictions.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg p-4 text-sm text-muted-foreground">
                      No se encontraron lugares. Intenta con una búsqueda más específica.
                    </div>
                  )}
                </div>
                {selectedLocation && (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <div className="flex-1">
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
                        {locationAccuracy !== null && (
                          <div className={`mt-2 text-xs flex items-center gap-1 ${
                            locationAccuracy > 1000 
                              ? 'text-red-600 font-semibold' 
                              : locationAccuracy > 100 
                              ? 'text-orange-600' 
                              : 'text-green-600'
                          }`}>
                            <Navigation className="h-3 w-3" />
                            <span>
                              Precisión GPS: {locationAccuracy.toFixed(0)}m
                              {locationAccuracy > 1000 && (
                                <span className="ml-1">⚠️ (Muy imprecisa - Usa búsqueda manual)</span>
                              )}
                              {locationAccuracy > 100 && locationAccuracy <= 1000 && (
                                <span className="ml-1">⚠️ (Baja precisión)</span>
                              )}
                              {locationAccuracy <= 100 && (
                                <span className="ml-1">✅ (Buena precisión)</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Opción de Blockchain */}
            <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <Label htmlFor="use-on-chain" className="text-base font-semibold cursor-pointer">
                      {t('emergency.report.sendOnChain') || 'Reportar en Blockchain (Polkadot)'}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('emergency.report.sendOnChainDescription') || 
                      'Reporta la emergencia directamente a la blockchain para mayor resiliencia y transparencia. La emergencia quedará registrada de forma permanente e inmutable.'}
                  </p>
                  
                  {!isConnected && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                      <p className="text-yellow-800 dark:text-yellow-200">
                        ⚠️ Necesitas conectar tu wallet de Polkadot para usar esta función.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await connect()
                            toast.success('Wallet conectada')
                          } catch (error: any) {
                            toast.error('Error conectando wallet', {
                              description: error.message,
                            })
                          }
                        }}
                        className="mt-2"
                      >
                        Conectar Wallet
                      </Button>
                    </div>
                  )}
                  
                  {isConnected && selectedAccount && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm">
                      <p className="text-green-800 dark:text-green-200 flex items-center gap-2">
                        <span>✅</span>
                        <span>Wallet conectada: {selectedAccount.address.slice(0, 8)}...{selectedAccount.address.slice(-6)}</span>
                      </p>
                    </div>
                  )}
                  
                  {txStatus !== 'idle' && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className={`h-4 w-4 ${txStatus === 'finalized' ? 'hidden' : 'animate-spin'}`} />
                        <span className="text-sm font-medium">
                          {txStatus === 'preparing' && 'Preparando datos...'}
                          {txStatus === 'signing' && 'Firmando transacción...'}
                          {txStatus === 'broadcasting' && 'Enviando a la blockchain...'}
                          {txStatus === 'in-block' && 'Transacción incluida en bloque...'}
                          {txStatus === 'finalized' && '✅ Transacción finalizada'}
                          {txStatus === 'error' && '❌ Error en la transacción'}
                        </span>
                      </div>
                      {txHash && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>TX Hash: {txHash.slice(0, 20)}...</p>
                          {txBlockNumber && <p>Bloque: {txBlockNumber}</p>}
                          {txHash && (
                            <a
                              href={getExplorerUrl('PASET_HUB', txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Ver en explorador →
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Switch
                  id="use-on-chain"
                  checked={useOnChain}
                  onCheckedChange={setUseOnChain}
                  disabled={!isConnected || isLoading}
                />
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
              <Button 
                type="submit" 
                disabled={isLoading || !selectedLocation || (useOnChain && !isConnected)}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {txStatus === 'preparing' && 'Preparando...'}
                    {txStatus === 'signing' && 'Firmando...'}
                    {txStatus === 'broadcasting' && 'Enviando...'}
                    {txStatus === 'in-block' && 'Confirmando...'}
                    {!txStatus || txStatus === 'idle' ? (t('emergency.report.reporting') || 'Reportando...') : ''}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {useOnChain && isConnected 
                      ? (t('emergency.report.submitOnChain') || '🚨 Reportar en Blockchain')
                      : (t('emergency.report.submit') || 'Reportar Emergencia')
                    }
                  </>
                )}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>

  {/* Modal de Confirmación de Transacción On-Chain */}
  <Dialog open={showTxConfirmDialog} onOpenChange={setShowTxConfirmDialog}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Confirmar Transacción On-Chain
        </DialogTitle>
        <DialogDescription>
          Revisa todos los detalles de la transacción antes de confirmar
        </DialogDescription>
      </DialogHeader>

      {txInfo && (
        <div className="space-y-4 py-4">
          {/* Información de la Cadena */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Cadena de Blockchain
            </h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Chain:</span> {txInfo.chain}</p>
              <p><span className="font-medium">Endpoint:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{txInfo.endpoint}</code></p>
              <p><span className="font-medium">Token:</span> {txInfo.currency}</p>
              <p><span className="font-medium">Decimals:</span> {txInfo.decimals}</p>
            </div>
          </div>

          {/* Información de la Cuenta */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cuenta que Firmará
            </h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Address:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{txInfo.account}</code></p>
            </div>
          </div>

          {/* Fee Estimado */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              💰 Costo de Transacción
            </h3>
            <div className="space-y-1 text-sm">
              <p className="text-lg font-bold text-primary">
                {txInfo.feeFormatted} {txInfo.currency}
              </p>
              {txInfo.fee && (
                <p className="text-xs text-muted-foreground">
                  Fee estimado: {txInfo.fee.toString()} unidades base
                </p>
              )}
            </div>
          </div>

          {/* Extrinsic */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              ⚙️ Extrinsic
            </h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Método:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{txInfo.extrinsic}</code></p>
              <p className="text-xs text-muted-foreground mt-2">
                System::remarkWithEvent permite almacenar datos arbitrarios en la blockchain
              </p>
            </div>
          </div>

          {/* Datos a Enviar */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              📦 Datos a Enviar a la Cadena
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Tamaño:</span> {txInfo.dataSize} bytes</p>
              <div className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(txInfo.dataPreview, null, 2)}
                </pre>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                <p><span className="font-medium">v:</span> Versión del formato de datos</p>
                <p><span className="font-medium">id:</span> ID único de la emergencia</p>
                <p><span className="font-medium">t:</span> Tipo de emergencia (código numérico)</p>
                <p><span className="font-medium">s:</span> Severidad (código numérico)</p>
                <p><span className="font-medium">lat/lng:</span> Coordenadas × 1e6 (precisión de 0.1m)</p>
                <p><span className="font-medium">ts:</span> Timestamp en segundos</p>
                <p><span className="font-medium">m:</span> Metadata (título, descripción, etc.)</p>
              </div>
            </div>
          </div>

          {/* Datos de la Emergencia (resumen) */}
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              🚨 Resumen de la Emergencia
            </h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Tipo:</span> {txInfo.emergencyData.emergencyType}</p>
              <p><span className="font-medium">Severidad:</span> {txInfo.emergencyData.severity}</p>
              <p><span className="font-medium">Título:</span> {txInfo.emergencyData.title}</p>
              <p><span className="font-medium">Ubicación:</span> {txInfo.emergencyData.latitude.toFixed(6)}, {txInfo.emergencyData.longitude.toFixed(6)}</p>
              {txInfo.emergencyData.address && (
                <p><span className="font-medium">Dirección:</span> {txInfo.emergencyData.address}</p>
              )}
            </div>
          </div>

          {/* Configuración del Sistema */}
          {txInfo.polkadotConfig && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2 text-sm">⚙️ Configuración del Sistema</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium">Payment Chain:</span> {txInfo.polkadotConfig.paymentChain || 'N/A'}</p>
                <p><span className="font-medium">Payment Preset:</span> {txInfo.polkadotConfig.paymentPreset || 'N/A'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setShowTxConfirmDialog(false)
            setIsLoading(false)
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmOnChainTransaction}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Confirmar y Enviar
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
)
}

