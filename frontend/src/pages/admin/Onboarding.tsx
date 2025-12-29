/**
 * Página para que los administradores gestionen las solicitudes de onboarding de conductores
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Car, 
  FileText, 
  Building2, 
  CreditCard,
  MapPin,
  Calendar,
  AlertCircle,
  Eye,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import type { DriverOnboarding, DriverDocument } from '@/types'

export default function AdminOnboarding() {
  const { t } = useTranslation()
  const [onboardings, setOnboardings] = useState<DriverOnboarding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOnboarding, setSelectedOnboarding] = useState<DriverOnboarding | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadOnboardings()
  }, [])

  const loadOnboardings = async () => {
    try {
      setIsLoading(true)
      const data = await api.getPendingOnboardings()
      setOnboardings(data)
    } catch (error: any) {
      console.error('Error loading onboardings:', error)
      toast.error(error.message || t('admin.onboarding.loadError') || 'Error al cargar solicitudes de onboarding')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (onboarding: DriverOnboarding) => {
    setSelectedOnboarding(onboarding)
    setIsDetailDialogOpen(true)
  }

  const handleApprove = async (onboardingId: string) => {
    if (!confirm(t('admin.onboarding.confirmApprove') || '¿Estás seguro de aprobar esta solicitud de onboarding?')) {
      return
    }

    try {
      setIsProcessing(true)
      await api.approveOnboarding(onboardingId)
      toast.success(t('admin.onboarding.approvedSuccess') || 'Onboarding aprobado correctamente')
      await loadOnboardings()
      if (selectedOnboarding?.id === onboardingId) {
        setIsDetailDialogOpen(false)
      }
    } catch (error: any) {
      console.error('Error approving onboarding:', error)
      toast.error(error.message || t('admin.onboarding.approveError') || 'Error al aprobar onboarding')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedOnboarding) return
    if (!rejectReason.trim()) {
      toast.error(t('admin.onboarding.rejectReasonRequired') || 'Debes proporcionar una razón para el rechazo')
      return
    }

    try {
      setIsProcessing(true)
      await api.rejectOnboarding(selectedOnboarding.id, rejectReason)
      toast.success(t('admin.onboarding.rejectedSuccess') || 'Onboarding rechazado correctamente')
      setRejectReason('')
      setIsRejectDialogOpen(false)
      setIsDetailDialogOpen(false)
      await loadOnboardings()
    } catch (error: any) {
      console.error('Error rejecting onboarding:', error)
      toast.error(error.message || t('admin.onboarding.rejectError') || 'Error al rechazar onboarding')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            {t('admin.onboarding.status.pending') || 'Pendiente'}
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('admin.onboarding.status.approved') || 'Aprobado'}
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t('admin.onboarding.status.rejected') || 'Rechazado'}
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      NATIONAL_ID_FRONT: t('admin.onboarding.documents.nationalIdFront') || 'Cédula (Frente)',
      NATIONAL_ID_BACK: t('admin.onboarding.documents.nationalIdBack') || 'Cédula (Reverso)',
      DRIVER_LICENSE_FRONT: t('admin.onboarding.documents.driverLicenseFront') || 'Licencia (Frente)',
      DRIVER_LICENSE_BACK: t('admin.onboarding.documents.driverLicenseBack') || 'Licencia (Reverso)',
      PROOF_OF_ADDRESS: t('admin.onboarding.documents.proofOfAddress') || 'Comprobante de Domicilio',
      BANK_STATEMENT: t('admin.onboarding.documents.bankStatement') || 'Estado de Cuenta',
      VEHICLE_REGISTRATION: t('admin.onboarding.documents.vehicleRegistration') || 'Registro de Vehículo',
      VEHICLE_INSURANCE: t('admin.onboarding.documents.vehicleInsurance') || 'Seguro de Vehículo',
      CRIMINAL_RECORD: t('admin.onboarding.documents.criminalRecord') || 'Antecedentes Penales',
      OTHER: t('admin.onboarding.documents.other') || 'Otro',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('common.loading') || 'Cargando...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {t('admin.onboarding.title') || 'Solicitudes de Conductores'}
            </h1>
            <p className="text-muted-foreground">
              {t('admin.onboarding.description') || 'Revisa y gestiona las solicitudes de onboarding de conductores'}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
              {onboardings.filter(o => !o.reviewedAt).length} {t('admin.onboarding.newApplications') || 'nuevas'}
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
              {onboardings.filter(o => o.reviewedAt).length} {t('admin.onboarding.updates') || 'actualizaciones'}
            </Badge>
          </div>
        </div>
      </div>

      {onboardings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {t('admin.onboarding.noPending') || 'No hay solicitudes pendientes'}
              </h3>
              <p className="text-muted-foreground">
                {t('admin.onboarding.noPendingDescription') || 'Todas las solicitudes han sido procesadas.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {onboardings.map((onboarding) => (
            <Card key={onboarding.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {onboarding.user?.name || onboarding.fullName || t('admin.onboarding.noName') || 'Sin nombre'}
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{onboarding.user?.email}</span>
                      </div>
                      {onboarding.user?.phone && (
                        <div className="text-sm">{onboarding.user.phone}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {getStatusBadge(onboarding.status)}
                        {onboarding.reviewedAt && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                            <FileText className="h-3 w-3 mr-1" />
                            {t('admin.onboarding.documentUpdate') || 'Actualización de Documentos'}
                          </Badge>
                        )}
                        {!onboarding.reviewedAt && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                            <User className="h-3 w-3 mr-1" />
                            {t('admin.onboarding.newApplication') || 'Nueva Solicitud'}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {onboarding.updatedAt && new Date(onboarding.updatedAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(onboarding)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('common.view') || 'Ver Detalles'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('admin.onboarding.type') || 'Tipo'}:</span>{' '}
                    <span className="font-medium">
                      {onboarding.driverType === 'COMPANY' 
                        ? (t('admin.onboarding.driverType.company') || 'Empresa')
                        : (t('admin.onboarding.driverType.independent') || 'Independiente')}
                    </span>
                  </div>
                  {onboarding.vehicle && (
                    <div>
                      <span className="text-muted-foreground">{t('admin.onboarding.vehicle') || 'Vehículo'}:</span>{' '}
                      <span className="font-medium">
                        {onboarding.vehicle.make} {onboarding.vehicle.model}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">{t('admin.onboarding.documents') || 'Documentos'}:</span>{' '}
                    <span className="font-medium">
                      {onboarding.documents?.length || 0} {t('admin.onboarding.documentsUploaded') || 'subidos'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de detalles */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('admin.onboarding.details') || 'Detalles de la Solicitud'}
            </DialogTitle>
            <DialogDescription>
              {selectedOnboarding?.user?.email || ''}
            </DialogDescription>
          </DialogHeader>

          {selectedOnboarding && (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">{t('admin.onboarding.tabs.personal') || 'Personal'}</TabsTrigger>
                <TabsTrigger value="company">{t('admin.onboarding.tabs.company') || 'Empresa'}</TabsTrigger>
                <TabsTrigger value="license">{t('admin.onboarding.tabs.license') || 'Licencia'}</TabsTrigger>
                <TabsTrigger value="documents">{t('admin.onboarding.tabs.documents') || 'Documentos'}</TabsTrigger>
                <TabsTrigger value="vehicle">{t('admin.onboarding.tabs.vehicle') || 'Vehículo'}</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.fullName') || 'Nombre Completo'}</Label>
                    <p className="font-medium">{selectedOnboarding.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.dateOfBirth') || 'Fecha de Nacimiento'}</Label>
                    <p className="font-medium">
                      {selectedOnboarding.dateOfBirth
                        ? new Date(selectedOnboarding.dateOfBirth).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.nationalId') || 'Cédula de Identidad'}</Label>
                    <p className="font-medium">{selectedOnboarding.nationalId || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.country') || 'País'}</Label>
                    <p className="font-medium">{selectedOnboarding.country || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.address') || 'Dirección'}</Label>
                    <p className="font-medium">{selectedOnboarding.address || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.city') || 'Ciudad'}</Label>
                    <p className="font-medium">{selectedOnboarding.city || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.driverType') || 'Tipo de Conductor'}</Label>
                    <p className="font-medium">
                      {selectedOnboarding.driverType === 'COMPANY' 
                        ? (t('admin.onboarding.driverType.company') || 'Empresa')
                        : (t('admin.onboarding.driverType.independent') || 'Independiente')}
                    </p>
                  </div>
                  {selectedOnboarding.taxId && (
                    <>
                      <div>
                        <Label className="text-muted-foreground">{t('admin.onboarding.fields.taxId') || 'ID Fiscal'}</Label>
                        <p className="font-medium">{selectedOnboarding.taxId}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('admin.onboarding.fields.taxIdType') || 'Tipo de ID Fiscal'}</Label>
                        <p className="font-medium">{selectedOnboarding.taxIdType || 'N/A'}</p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="company" className="space-y-4">
                {selectedOnboarding.driverType === 'COMPANY' ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.companyName') || 'Nombre de la Empresa'}</Label>
                      <p className="font-medium">{selectedOnboarding.companyName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.companyTaxId') || 'ID Fiscal de la Empresa'}</Label>
                      <p className="font-medium">{selectedOnboarding.companyTaxId || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.companyCountry') || 'País de la Empresa'}</Label>
                      <p className="font-medium">{selectedOnboarding.companyCountry || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.companyAddress') || 'Dirección de la Empresa'}</Label>
                      <p className="font-medium">{selectedOnboarding.companyAddress || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.companyCity') || 'Ciudad de la Empresa'}</Label>
                      <p className="font-medium">{selectedOnboarding.companyCity || 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('admin.onboarding.noCompanyInfo') || 'Este conductor es independiente, no hay información de empresa.'}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="license" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.licenseNumber') || 'Número de Licencia'}</Label>
                    <p className="font-medium">{selectedOnboarding.licenseNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.licenseExpiryDate') || 'Fecha de Expiración'}</Label>
                    <p className="font-medium">
                      {selectedOnboarding.licenseExpiryDate
                        ? new Date(selectedOnboarding.licenseExpiryDate).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">{t('admin.onboarding.fields.licenseIssuedBy') || 'Emitida por'}</Label>
                    <p className="font-medium">{selectedOnboarding.licenseIssuedBy || 'N/A'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                {selectedOnboarding.documents && selectedOnboarding.documents.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedOnboarding.documents.map((doc) => (
                      <Card key={doc.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium mb-1">
                                {getDocumentTypeLabel(doc.type)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {doc.fileName}
                              </div>
                              {doc.fileSize && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.fileUrl, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {t('common.view') || 'Ver'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('admin.onboarding.noDocuments') || 'No hay documentos subidos.'}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="vehicle" className="space-y-4">
                {selectedOnboarding.vehicle ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.vehicleMake') || 'Marca'}</Label>
                      <p className="font-medium">{selectedOnboarding.vehicle.make}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.vehicleModel') || 'Modelo'}</Label>
                      <p className="font-medium">{selectedOnboarding.vehicle.model}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.vehicleYear') || 'Año'}</Label>
                      <p className="font-medium">{selectedOnboarding.vehicle.year}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.vehicleLicensePlate') || 'Placa'}</Label>
                      <p className="font-medium">{selectedOnboarding.vehicle.licensePlate}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.vehicleType') || 'Tipo'}</Label>
                      <p className="font-medium">{selectedOnboarding.vehicle.type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.vehicleCapacity') || 'Capacidad'}</Label>
                      <p className="font-medium">{selectedOnboarding.vehicle.capacity} {t('admin.onboarding.fields.passengers') || 'pasajeros'}</p>
                    </div>
                    {selectedOnboarding.vehicle.color && (
                      <div>
                        <Label className="text-muted-foreground">{t('admin.onboarding.fields.vehicleColor') || 'Color'}</Label>
                        <p className="font-medium">{selectedOnboarding.vehicle.color}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">{t('admin.onboarding.fields.approvalStatus') || 'Estado de Aprobación'}</Label>
                      <div className="mt-1">
                        {selectedOnboarding.vehicle.approvalStatus === 'APPROVED' ? (
                          <Badge variant="default" className="bg-green-500">
                            {t('admin.onboarding.status.approved') || 'Aprobado'}
                          </Badge>
                        ) : selectedOnboarding.vehicle.approvalStatus === 'REJECTED' ? (
                          <Badge variant="destructive">{t('admin.onboarding.status.rejected') || 'Rechazado'}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('admin.onboarding.status.pending') || 'Pendiente'}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('admin.onboarding.noVehicle') || 'No hay vehículo registrado.'}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailDialogOpen(false)
                setIsRejectDialogOpen(true)
              }}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('admin.onboarding.reject') || t('common.reject') || 'Rechazar'}
            </Button>
            <Button
              onClick={() => selectedOnboarding && handleApprove(selectedOnboarding.id)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('admin.onboarding.approve') || t('common.approve') || 'Aprobar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de rechazo */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('admin.onboarding.rejectTitle') || 'Rechazar Solicitud'}
            </DialogTitle>
            <DialogDescription>
              {t('admin.onboarding.rejectDescription') || 'Proporciona una razón para el rechazo. El usuario será notificado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">
                {t('admin.onboarding.rejectReason') || 'Razón del Rechazo'} *
              </Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('admin.onboarding.rejectReasonPlaceholder') || 'Ej: Documentos incompletos, información incorrecta, etc.'}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false)
                setRejectReason('')
              }}
              disabled={isProcessing}
            >
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectReason.trim()}
            >
              {t('common.reject') || 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

