/**
 * Dashboard de Emergencias para Autoridades
 * Vista completa con mapa, estadísticas y gestión de emergencias
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  AlertTriangle,
  MapPin,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { api } from '@/services/api'
import { initializeGoogleMaps } from '@/services/googleMaps'
import { UserRole } from '@/types'

interface Emergency {
  id: string
  emergencyNumber: string
  emergencyType: string
  severity: string
  status: string
  title: string
  description: string
  latitude: number
  longitude: number
  address?: string
  city?: string
  country?: string
  numberOfPeople: number
  createdAt: string
  reporter: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

interface EmergencyStats {
  total: number
  active: number
  resolved: number
  critical: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
}

export default function AuthorityDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [stats, setStats] = useState<EmergencyStats>({
    total: 0,
    active: 0,
    resolved: 0,
    critical: 0,
    byType: {},
    bySeverity: {},
  })
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [mapLoaded, setMapLoaded] = useState(false)

  // Verificar que el usuario sea autoridad
  useEffect(() => {
    if (user && user.role !== UserRole.AUTHORITY && user.role !== UserRole.ADMIN) {
      toast.error(t('authority.unauthorized') || 'No tienes permisos para acceder a este dashboard')
      navigate('/')
    }
  }, [user, navigate, t])

  // Inicializar Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return

      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          console.warn('Google Maps API key no configurada')
          return
        }

        await initializeGoogleMaps(apiKey)

        if (!window.google?.maps) {
          throw new Error('Google Maps no se cargó correctamente')
        }

        // Obtener ubicación del usuario para centrar el mapa
        let center = { lat: -33.4489, lng: -70.6693 } // Santiago por defecto
        if (user?.latitude && user?.longitude) {
          center = { lat: user.latitude, lng: user.longitude }
        }

        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 10,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        })

        mapInstanceRef.current = map
        setMapLoaded(true)
      } catch (error) {
        console.error('Error inicializando mapa:', error)
        toast.error(t('authority.mapError') || 'Error al cargar el mapa')
      }
    }

    initMap()
  }, [user, t])

  // Cargar emergencias y estadísticas
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)

      const options: any = {
        page: 1,
        limit: 100, // Cargar más para el mapa
      }

      if (statusFilter !== 'all') options.status = statusFilter
      if (typeFilter !== 'all') options.emergencyType = typeFilter
      if (severityFilter !== 'all') options.severity = severityFilter

      // Si el usuario tiene ubicación, buscar cercanas
      if (user?.latitude && user?.longitude) {
        options.latitude = user.latitude
        options.longitude = user.longitude
        options.radiusKm = 50
      }

      const data = await api.getEmergencies(options)
      setEmergencies(data.emergencies)

      // Calcular estadísticas
      const activeStatuses = ['REPORTED', 'ALERTING', 'ALERTED', 'RESPONDING']
      const active = data.emergencies.filter((e: Emergency) => activeStatuses.includes(e.status)).length
      const resolved = data.emergencies.filter((e: Emergency) => e.status === 'RESOLVED').length
      const critical = data.emergencies.filter((e: Emergency) => e.severity === 'CRITICAL').length

      const byType: Record<string, number> = {}
      const bySeverity: Record<string, number> = {}

      data.emergencies.forEach((e: Emergency) => {
        byType[e.emergencyType] = (byType[e.emergencyType] || 0) + 1
        bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1
      })

      setStats({
        total: data.total,
        active,
        resolved,
        critical,
        byType,
        bySeverity,
      })
    } catch (error: any) {
      console.error('Error cargando datos:', error)
      toast.error(error.message || t('authority.loadError') || 'Error al cargar emergencias')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, typeFilter, severityFilter, user, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Actualizar marcadores en el mapa
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google?.maps) return

    // Limpiar marcadores anteriores
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    if (emergencies.length === 0) return

    const map = mapInstanceRef.current
    const bounds = new window.google.maps.LatLngBounds()

    emergencies.forEach((emergency) => {
      const position = { lat: emergency.latitude, lng: emergency.longitude }

      // Color según severidad
      const colors: Record<string, string> = {
        LOW: '#10b981', // Verde
        MEDIUM: '#f59e0b', // Amarillo
        HIGH: '#ef4444', // Rojo
        CRITICAL: '#dc2626', // Rojo oscuro
      }

      const marker = new window.google.maps.Marker({
        position,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: colors[emergency.severity] || '#6b7280',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: `${emergency.emergencyNumber}: ${emergency.title}`,
      })

      // Info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${colors[emergency.severity] || '#6b7280'};">
              ${emergency.emergencyNumber}
            </h3>
            <p style="margin: 0 0 4px 0;"><strong>${emergency.title}</strong></p>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">${t(`emergency.types.${emergency.emergencyType}`) || emergency.emergencyType}</p>
            <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>${t('emergency.severity')}:</strong> ${t(`emergency.severity.${emergency.severity}`) || emergency.severity}</p>
            <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>${t('emergency.status')}:</strong> ${t(`emergency.status.${emergency.status}`) || emergency.status}</p>
            ${emergency.address ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">${emergency.address}</p>` : ''}
            <button onclick="window.open('/emergencies/${emergency.id}', '_blank')" style="margin-top: 8px; padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              ${t('authority.viewDetails') || 'Ver Detalles'}
            </button>
          </div>
        `,
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })

      markersRef.current.push(marker)
      bounds.extend(position)
    })

    // Ajustar vista para mostrar todos los marcadores
    if (emergencies.length > 0) {
      map.fitBounds(bounds)
      // Si solo hay un marcador, hacer zoom más cercano
      if (emergencies.length === 1) {
        map.setZoom(15)
      }
    }
  }, [emergencies, mapLoaded, t])

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-500',
      MEDIUM: 'bg-yellow-500',
      HIGH: 'bg-red-500',
      CRITICAL: 'bg-red-700',
    }
    return colors[severity] || 'bg-gray-500'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      REPORTED: 'bg-blue-500',
      ALERTING: 'bg-yellow-500',
      ALERTED: 'bg-orange-500',
      RESPONDING: 'bg-purple-500',
      RESOLVED: 'bg-green-500',
      CANCELLED: 'bg-gray-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            {t('authority.dashboard.title') || 'Dashboard de Emergencias'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('authority.dashboard.description') || 'Gestión y monitoreo de emergencias en tiempo real'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/authority/blockchain-events')}>
            <Wallet className="h-4 w-4 mr-2" />
            Eventos Blockchain
          </Button>
          <Button onClick={loadData} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('authority.refresh') || 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('authority.stats.total') || 'Total Emergencias'}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('authority.stats.active') || 'Activas'}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('authority.stats.resolved') || 'Resueltas'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('authority.stats.critical') || 'Críticas'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('authority.filters') || 'Filtros'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('emergency.status.status') || 'Estado'}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('emergency.list.all') || 'Todas'}</SelectItem>
                  <SelectItem value="REPORTED">{t('emergency.status.REPORTED') || 'Reportada'}</SelectItem>
                  <SelectItem value="ALERTING">{t('emergency.status.ALERTING') || 'Alertando'}</SelectItem>
                  <SelectItem value="ALERTED">{t('emergency.status.ALERTED') || 'Alertada'}</SelectItem>
                  <SelectItem value="RESPONDING">{t('emergency.status.RESPONDING') || 'Respondiendo'}</SelectItem>
                  <SelectItem value="RESOLVED">{t('emergency.status.RESOLVED') || 'Resuelta'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('emergency.list.type') || 'Tipo'}</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('emergency.list.all') || 'Todos'}</SelectItem>
                  <SelectItem value="ACCIDENT">{t('emergency.types.ACCIDENT') || 'Accidente'}</SelectItem>
                  <SelectItem value="MEDICAL">{t('emergency.types.MEDICAL') || 'Médica'}</SelectItem>
                  <SelectItem value="FIRE">{t('emergency.types.FIRE') || 'Incendio'}</SelectItem>
                  <SelectItem value="CRIME">{t('emergency.types.CRIME') || 'Crimen'}</SelectItem>
                  <SelectItem value="SECURITY_THREAT">{t('emergency.types.SECURITY_THREAT') || 'Amenaza'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('emergency.list.severity') || 'Severidad'}</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('emergency.list.all') || 'Todas'}</SelectItem>
                  <SelectItem value="LOW">{t('emergency.severity.LOW') || 'Baja'}</SelectItem>
                  <SelectItem value="MEDIUM">{t('emergency.severity.MEDIUM') || 'Media'}</SelectItem>
                  <SelectItem value="HIGH">{t('emergency.severity.HIGH') || 'Alta'}</SelectItem>
                  <SelectItem value="CRITICAL">{t('emergency.severity.CRITICAL') || 'Crítica'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('authority.map') || 'Mapa de Emergencias'}
          </CardTitle>
          <CardDescription>
            {t('authority.mapDescription') || `${emergencies.length} emergencias mostradas en el mapa`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full rounded-lg overflow-hidden border" style={{ height: '600px' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <p className="text-sm text-muted-foreground">{t('common.loading') || 'Cargando mapa...'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de emergencias recientes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('authority.recentEmergencies') || 'Emergencias Recientes'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('common.loading') || 'Cargando...'}</p>
            </div>
          ) : emergencies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('emergency.list.noEmergencies') || 'No hay emergencias para mostrar'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emergencies.slice(0, 10).map((emergency) => (
                <div
                  key={emergency.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/emergencies/${emergency.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{emergency.emergencyNumber}</span>
                      <Badge variant="outline" className={getSeverityColor(emergency.severity)}>
                        {t(`emergency.severity.${emergency.severity}`) || emergency.severity}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(emergency.status)}>
                        {t(`emergency.status.${emergency.status}`) || emergency.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{emergency.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`emergency.types.${emergency.emergencyType}`) || emergency.emergencyType} • {emergency.address || `${emergency.latitude.toFixed(4)}, ${emergency.longitude.toFixed(4)}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    {t('common.view') || 'Ver'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

