import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { toast } from 'sonner'
import { Search, MapPin, AlertTriangle, Eye, Plus, Filter, Wallet } from 'lucide-react'
import { api } from '@/services/api'
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
  metadata?: {
    onChainTxHash?: string
    onChainBlockNumber?: string
    onChainEmergencyId?: string
    reporterWallet?: string
    [key: string]: any
  }
  reporter: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

interface EmergenciesListResponse {
  emergencies: Emergency[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Labels se obtendrán de las traducciones

export default function Emergencies() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') || 'all')
  const [severityFilter, setSeverityFilter] = useState<string>(searchParams.get('severity') || 'all')

  const isAuthority = user?.role === UserRole.AUTHORITY || user?.role === UserRole.ADMIN

  // Labels desde traducciones
  const getEmergencyTypeLabel = (type: string) => t(`emergency.types.${type}`) || type
  const getSeverityLabel = (severity: string) => {
    const label = t(`emergency.severity.${severity}`) || severity
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      LOW: 'outline',
      MEDIUM: 'default',
      HIGH: 'secondary',
      CRITICAL: 'destructive',
    }
    return { label, variant: variants[severity] || 'default' }
  }
  const getStatusLabel = (status: string) => {
    const label = t(`emergency.status.${status}`) || status
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      REPORTED: 'outline',
      ALERTING: 'default',
      ALERTED: 'secondary',
      RESPONDING: 'secondary',
      RESOLVED: 'default',
      CANCELLED: 'outline',
    }
    return { label, variant: variants[status] || 'default' }
  }

  const loadEmergencies = useCallback(async () => {
    try {
      setIsLoading(true)
      const options: any = {
        page,
        limit: 20,
      }
      
      if (statusFilter !== 'all') {
        options.status = statusFilter
      }
      if (typeFilter !== 'all') {
        options.emergencyType = typeFilter
      }
      if (severityFilter !== 'all') {
        options.severity = severityFilter
      }
      if (search) {
        options.search = search
      }

      // Si es autoridad y tiene ubicación, puede buscar cercanas
      if (isAuthority && user?.latitude && user?.longitude) {
        options.latitude = user.latitude
        options.longitude = user.longitude
        options.radiusKm = 50 // 50km por defecto
      }

      const data: EmergenciesListResponse = await api.getEmergencies(options)
      setEmergencies(data.emergencies)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (error: any) {
      console.error('Error cargando emergencias:', error)
      toast.error(error.message || 'Error al cargar emergencias')
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter, typeFilter, severityFilter, search, isAuthority, user])

  useEffect(() => {
    loadEmergencies()
  }, [loadEmergencies])

  const handleSearch = () => {
    setPage(1)
    loadEmergencies()
  }

  const handleFilterChange = (filter: string, value: string) => {
    setPage(1)
    if (filter === 'status') setStatusFilter(value)
    if (filter === 'type') setTypeFilter(value)
    if (filter === 'severity') setSeverityFilter(value)
    
    const params = new URLSearchParams(searchParams)
    if (value === 'all') {
      params.delete(filter)
    } else {
      params.set(filter, value)
    }
    setSearchParams(params)
  }

  const handleViewDetails = (emergencyId: string) => {
    navigate(`/emergencies/${emergencyId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                {t('emergency.list.title')}
              </CardTitle>
              <CardDescription>
                {isAuthority 
                  ? t('emergency.list.description')
                  : t('emergency.list.descriptionUser')}
              </CardDescription>
            </div>
            <Button onClick={() => navigate('/report-emergency')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('emergency.list.reportNew')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros y búsqueda */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('emergency.list.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                {t('common.search')}
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('emergency.status.REPORTED')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('emergency.list.filterStatus')}</SelectItem>
                    {['REPORTED', 'ALERTING', 'ALERTED', 'RESPONDING', 'RESOLVED', 'CANCELLED'].map((key) => (
                      <SelectItem key={key} value={key}>{t(`emergency.status.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={typeFilter} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('emergency.list.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('emergency.list.filterType')}</SelectItem>
                  {['ACCIDENT', 'MEDICAL', 'FIRE', 'CRIME', 'SECURITY_THREAT', 'MOUNTAIN_RESCUE', 'WATER_RESCUE', 'OTHER'].map((key) => (
                    <SelectItem key={key} value={key}>{t(`emergency.types.${key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={(value) => handleFilterChange('severity', value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('emergency.list.severity')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('emergency.list.filterSeverity')}</SelectItem>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((key) => (
                    <SelectItem key={key} value={key}>{t(`emergency.severity.${key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabla de emergencias */}
          {isLoading ? (
            <div className="text-center py-8">{t('emergency.list.loading')}</div>
          ) : emergencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('emergency.list.noEmergencies')}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('emergency.list.number')}</TableHead>
                      <TableHead>{t('emergency.list.type')}</TableHead>
                      <TableHead>{t('emergency.list.title')}</TableHead>
                      <TableHead>{t('emergency.list.severity')}</TableHead>
                      <TableHead>{t('emergency.list.status')}</TableHead>
                      <TableHead>{t('emergency.list.location')}</TableHead>
                      <TableHead>{t('emergency.list.reportedBy')}</TableHead>
                      <TableHead>{t('emergency.list.date')}</TableHead>
                      <TableHead>{t('emergency.list.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emergencies.map((emergency) => (
                      <TableRow key={emergency.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            {emergency.emergencyNumber}
                            {emergency.metadata?.onChainTxHash && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                <Wallet className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span className="text-blue-600 dark:text-blue-400">On-Chain</span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getEmergencyTypeLabel(emergency.emergencyType)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {emergency.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityLabel(emergency.severity).variant}>
                            {getSeverityLabel(emergency.severity).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusLabel(emergency.status).variant}>
                            {getStatusLabel(emergency.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">
                              {emergency.address || emergency.city || `${emergency.latitude.toFixed(4)}, ${emergency.longitude.toFixed(4)}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{emergency.reporter.name}</div>
                            {emergency.reporter.phone && (
                              <div className="text-muted-foreground text-xs">{emergency.reporter.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(emergency.createdAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(emergency.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('emergency.list.view')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('emergency.list.showing')} {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} {t('emergency.list.of')} {total} {t('emergency.list.emergencies')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t('common.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

