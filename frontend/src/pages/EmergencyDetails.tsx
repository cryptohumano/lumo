import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  AlertTriangle,
  MapPin,
  User,
  Phone,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Navigation,
  Wallet,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react'
import { api } from '@/services/api'
import { UserRole } from '@/types'
import type { ChainName } from '@/services/polkadotService'

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
  placeId?: string
  numberOfPeople: number
  servicesAlerted: string[]
  servicesResponded?: any
  resolvedAt?: string
  resolvedBy?: string
  resolution?: string
  createdAt: string
  updatedAt: string
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
    role: string
    polkadotAddress?: string
    polkadotChain?: string
    peopleChainIdentity?: any
  }
  resolver?: {
    id: string
    name: string
    email: string
  }
  trip?: {
    id: string
    tripNumber: string
    originAddress: string
    destinationAddress: string
  }
  alerts?: Array<{
    id: string
    service: string
    method: string
    status: string
    createdAt: string
  }>
}

// Labels se obtendrán de las traducciones

export default function EmergencyDetails() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [emergency, setEmergency] = useState<Emergency | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [resolution, setResolution] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [reporterIdentity, setReporterIdentity] = useState<any>(null)
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(false)

  const isAuthority = user?.role === UserRole.AUTHORITY || user?.role === UserRole.ADMIN
  const canManage = isAuthority && emergency && 
    (emergency.status === 'REPORTED' || emergency.status === 'ALERTING' || 
     emergency.status === 'ALERTED' || emergency.status === 'RESPONDING')

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
  const STATUS_OPTIONS = ['REPORTED', 'ALERTING', 'ALERTED', 'RESPONDING', 'RESOLVED', 'CANCELLED'].map(key => ({
    value: key,
    label: t(`emergency.status.${key}`)
  }))

  useEffect(() => {
    if (id) {
      loadEmergency()
    }
  }, [id])

  useEffect(() => {
    if (emergency?.reporter?.polkadotAddress || emergency?.metadata?.reporterWallet) {
      loadReporterIdentity()
    }
  }, [emergency?.reporter?.polkadotAddress, emergency?.metadata?.reporterWallet])

  const loadReporterIdentity = async () => {
    const walletAddress = emergency?.reporter?.polkadotAddress || emergency?.metadata?.reporterWallet
    if (!walletAddress) return
    
    setIsLoadingIdentity(true)
    try {
      const identity = await api.getPeopleChainIdentity(walletAddress)
      setReporterIdentity(identity)
    } catch (error) {
      console.error('Error cargando identidad de Polkadot:', error)
      setReporterIdentity(null)
    } finally {
      setIsLoadingIdentity(false)
    }
  }

  const getExplorerUrl = (chain: ChainName, hash: string) => {
    switch (chain) {
      case 'PASET_HUB':
        return `https://paseo.subscan.io/extrinsic/${hash}`
      case 'PEOPLE_CHAIN':
        return `https://polkadot.subscan.io/extrinsic/${hash}`
      default:
        return `https://subscan.io/extrinsic/${hash}`
    }
  }

  const loadEmergency = async () => {
    try {
      setIsLoading(true)
      const data = await api.getEmergency(id!)
      setEmergency(data.emergency)
    } catch (error: any) {
      console.error('Error cargando emergencia:', error)
      toast.error(error.message || 'Error al cargar la emergencia')
      navigate('/emergencies')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!emergency || !newStatus) return

    try {
      setIsUpdating(true)
      await api.updateEmergencyStatus(emergency.id, { status: newStatus })
      toast.success(t('emergency.details.updateSuccess'))
      setIsStatusDialogOpen(false)
      setNewStatus('')
      loadEmergency()
    } catch (error: any) {
      console.error('Error actualizando estado:', error)
      toast.error(error.message || t('emergency.details.updateError'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResolve = async () => {
    if (!emergency || !resolution.trim()) {
      toast.error(t('emergency.details.resolutionRequired'))
      return
    }

    try {
      setIsUpdating(true)
      await api.resolveEmergency(emergency.id, resolution)
      toast.success(t('emergency.details.resolveSuccess'))
      setIsResolveDialogOpen(false)
      setResolution('')
      loadEmergency()
    } catch (error: any) {
      console.error('Error resolviendo emergencia:', error)
      toast.error(error.message || t('emergency.details.resolveError'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = async () => {
    if (!emergency) return

    try {
      setIsUpdating(true)
      await api.cancelEmergency(emergency.id, resolution || t('emergency.details.cancelButton'))
      toast.success(t('emergency.details.cancelSuccess'))
      setIsCancelDialogOpen(false)
      setResolution('')
      loadEmergency()
    } catch (error: any) {
      console.error('Error cancelando emergencia:', error)
      toast.error(error.message || t('emergency.details.cancelError'))
    } finally {
      setIsUpdating(false)
    }
  }

  const openGoogleMaps = () => {
    if (emergency) {
      const url = `https://www.google.com/maps?q=${emergency.latitude},${emergency.longitude}`
      window.open(url, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{t('emergency.details.loading')}</div>
      </div>
    )
  }

  if (!emergency) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{t('emergency.details.notFound')}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/emergencies')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('emergency.details.back')}
      </Button>

      <div className="space-y-6">
        {/* Información principal */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  {emergency.title}
                </CardTitle>
                <CardDescription className="mt-2">
                  Número: <span className="font-mono">{emergency.emergencyNumber}</span>
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant={getSeverityLabel(emergency.severity).variant}>
                  {getSeverityLabel(emergency.severity).label}
                </Badge>
                <Badge variant={getStatusLabel(emergency.status).variant}>
                  {getStatusLabel(emergency.status).label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t('emergency.details.type')}</Label>
              <p>{getEmergencyTypeLabel(emergency.emergencyType)}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('emergency.details.description')}</Label>
              <p className="text-muted-foreground">{emergency.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{t('emergency.details.numberOfPeople')}</Label>
                <p>{emergency.numberOfPeople}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('emergency.details.reportDate')}</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(emergency.createdAt).toLocaleString('es-ES')}
                </p>
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('emergency.details.location')}
              </Label>
              <div className="mt-2 space-y-2">
                {emergency.address && (
                  <p>{emergency.address}</p>
                )}
                {(emergency.city || emergency.country) && (
                  <p className="text-sm text-muted-foreground">
                    {emergency.city && `${emergency.city}, `}
                    {emergency.country}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-mono">
                  {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openGoogleMaps}
                  className="mt-2"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {t('emergency.details.openInMaps')}
                </Button>
              </div>
            </div>

            {/* Información del reporter */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('emergency.details.reportedBy')}
              </Label>
              <div className="mt-2 space-y-2">
                <p>{emergency.reporter.name}</p>
                <p className="text-sm text-muted-foreground">{emergency.reporter.email}</p>
                {emergency.reporter.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {emergency.reporter.phone}
                  </p>
                )}
                
                {/* Wallet y Identidad de Polkadot */}
                {(emergency.reporter.polkadotAddress || emergency.metadata?.reporterWallet) && (
                  <div className="mt-3 p-3 bg-muted rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Wallet Polkadot</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {emergency.reporter.polkadotAddress || emergency.metadata?.reporterWallet}
                    </p>
                    
                    {/* Identidad de People Chain */}
                    {isLoadingIdentity ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Cargando identidad...</span>
                      </div>
                    ) : reporterIdentity?.hasIdentity ? (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            Identidad verificada en People Chain
                          </span>
                        </div>
                        {reporterIdentity.displayName && (
                          <p className="text-xs text-muted-foreground">
                            Nombre: {reporterIdentity.displayName}
                          </p>
                        )}
                        {reporterIdentity.legalName && (
                          <p className="text-xs text-muted-foreground">
                            Nombre legal: {reporterIdentity.legalName}
                          </p>
                        )}
                        {reporterIdentity.isVerified && (
                          <Badge variant="outline" className="text-xs">
                            ✓ Verificado
                          </Badge>
                        )}
                      </div>
                    ) : reporterIdentity && !reporterIdentity.hasIdentity ? (
                      <p className="text-xs text-muted-foreground">
                        Sin identidad en People Chain
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Información de Blockchain (si fue reportada on-chain) */}
            {emergency.metadata?.onChainTxHash && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  Información de Blockchain
                </Label>
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Reportada en Blockchain</span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="font-medium">TX Hash:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="font-mono text-xs break-all">
                          {emergency.metadata.onChainTxHash}
                        </code>
                        <a
                          href={getExplorerUrl((emergency.metadata?.chain || 'PASET_HUB') as ChainName, emergency.metadata.onChainTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver en explorador
                        </a>
                      </div>
                    </div>
                    
                    {emergency.metadata.onChainBlockNumber && (
                      <div>
                        <span className="font-medium">Bloque:</span>
                        <span className="ml-2 font-mono">{emergency.metadata.onChainBlockNumber}</span>
                      </div>
                    )}
                    
                    {emergency.metadata.onChainEmergencyId && (
                      <div>
                        <span className="font-medium">ID On-Chain:</span>
                        <span className="ml-2 font-mono text-xs">{emergency.metadata.onChainEmergencyId}</span>
                      </div>
                    )}
                    
                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-muted-foreground">
                        Esta emergencia fue reportada directamente en la blockchain de Polkadot,
                        garantizando inmutabilidad y transparencia.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Viaje relacionado */}
            {emergency.trip && (
              <div>
                <Label className="text-sm font-medium">{t('emergency.details.relatedTrip')}</Label>
                <p className="text-sm text-muted-foreground">
                  {emergency.trip.tripNumber}: {emergency.trip.originAddress} → {emergency.trip.destinationAddress}
                </p>
              </div>
            )}

            {/* Resolución */}
            {emergency.status === 'RESOLVED' && emergency.resolution && (
              <div>
                <Label className="text-sm font-medium">{t('emergency.details.resolution')}</Label>
                <p className="text-sm text-muted-foreground">{emergency.resolution}</p>
                {emergency.resolver && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('emergency.details.resolvedBy')}: {emergency.resolver.name} {t('emergency.details.resolvedAt')} {new Date(emergency.resolvedAt!).toLocaleString('es-ES')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        {emergency.alerts && emergency.alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('emergency.details.alerts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {emergency.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{alert.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.method} - {alert.status}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t('emergency.details.sentAt')} {new Date(alert.createdAt).toLocaleString('es-ES')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acciones para autoridades */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>{t('emergency.details.actions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewStatus(emergency.status)
                    setIsStatusDialogOpen(true)
                  }}
                >
                  {t('emergency.details.updateStatus')}
                </Button>
                {emergency.status !== 'RESOLVED' && (
                  <Button
                    variant="default"
                    onClick={() => setIsResolveDialogOpen(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('emergency.details.resolve')}
                  </Button>
                )}
                {emergency.status !== 'CANCELLED' && emergency.status !== 'RESOLVED' && (
                  <Button
                    variant="destructive"
                    onClick={() => setIsCancelDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('emergency.details.cancel')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Diálogo de actualizar estado */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('emergency.details.updateStatusTitle')}</DialogTitle>
            <DialogDescription>
              {t('emergency.details.updateStatusDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('emergency.details.statusLabel')}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating || !newStatus}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isUpdating ? t('emergency.details.updating') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de resolver */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('emergency.details.resolveTitle')}</DialogTitle>
            <DialogDescription>
              {t('emergency.details.resolveDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('emergency.details.resolutionLabel')} *</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder={t('emergency.details.resolutionPlaceholder')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleResolve} disabled={isUpdating || !resolution.trim()}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isUpdating ? t('emergency.details.resolving') : t('emergency.details.resolveButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de cancelar */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('emergency.details.cancelTitle')}</DialogTitle>
            <DialogDescription>
              {t('emergency.details.cancelDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('emergency.details.cancelReason')}</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder={t('emergency.details.cancelReasonPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              {t('emergency.details.dontCancel')}
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isUpdating ? t('emergency.details.cancelling') : t('emergency.details.cancelButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

