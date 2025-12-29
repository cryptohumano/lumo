/**
 * Página para que los administradores aprueben/rechacen vehículos
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, CheckCircle, XCircle, Clock, Car, User, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import type { Vehicle, VehicleApprovalStatus } from '@/types'
import { VehicleType, VehicleApprovalStatus as ApprovalStatusEnum } from '@/types'

export default function AdminVehicles() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('PENDING')
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadVehicles()
  }, [user, navigate, page, approvalStatusFilter])

  const loadVehicles = async () => {
    try {
      setIsLoading(true)
      const data = await api.getAdminVehicles({
        page,
        limit: 20,
        approvalStatus: approvalStatusFilter !== 'ALL' ? approvalStatusFilter : undefined,
      })
      setVehicles(data.vehicles)
      setTotalPages(data.totalPages)
    } catch (error: any) {
      console.error('Error loading vehicles:', error)
      toast.error(error.message || t('admin.vehicles.loadError') || 'Error al cargar vehículos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (vehicle: Vehicle) => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      await api.approveVehicle(vehicle.id)
      toast.success(t('admin.vehicles.approveSuccess') || 'Vehículo aprobado correctamente')
      loadVehicles()
    } catch (error: any) {
      console.error('Error approving vehicle:', error)
      toast.error(error.message || t('admin.vehicles.approveError') || 'Error al aprobar vehículo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenRejectDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setRejectionReason('')
    setIsRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!selectedVehicle || isSubmitting) return

    try {
      setIsSubmitting(true)
      await api.rejectVehicle(selectedVehicle.id, rejectionReason || undefined)
      toast.success(t('admin.vehicles.rejectSuccess') || 'Vehículo rechazado correctamente')
      setIsRejectDialogOpen(false)
      setSelectedVehicle(null)
      setRejectionReason('')
      loadVehicles()
    } catch (error: any) {
      console.error('Error rejecting vehicle:', error)
      toast.error(error.message || t('admin.vehicles.rejectError') || 'Error al rechazar vehículo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getApprovalStatusBadge = (status: VehicleApprovalStatus) => {
    switch (status) {
      case ApprovalStatusEnum.APPROVED:
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('vehicle.approved') || 'Aprobado'}
          </Badge>
        )
      case ApprovalStatusEnum.REJECTED:
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t('vehicle.rejected') || 'Rechazado'}
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t('vehicle.pending') || 'Pendiente'}
          </Badge>
        )
    }
  }

  const getVehicleTypeLabel = (type: VehicleType): string => {
    const labels: Record<VehicleType, string> = {
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/dashboard')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back') || 'Volver'}
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('admin.vehicles.title') || 'Gestión de Vehículos'}</h1>
        <p className="text-muted-foreground">
          {t('admin.vehicles.description') || 'Aprueba o rechaza vehículos registrados por los conductores'}
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('admin.vehicles.filterByStatus') || 'Filtrar por estado'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('admin.vehicles.allStatuses') || 'Todos'}</SelectItem>
                <SelectItem value="PENDING">{t('vehicle.pending') || 'Pendiente'}</SelectItem>
                <SelectItem value="APPROVED">{t('vehicle.approved') || 'Aprobado'}</SelectItem>
                <SelectItem value="REJECTED">{t('vehicle.rejected') || 'Rechazado'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de vehículos */}
      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Car className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('admin.vehicles.noVehicles') || 'No hay vehículos'}</h3>
              <p className="text-muted-foreground">
                {t('admin.vehicles.noVehiclesDescription') || 'No se encontraron vehículos con los filtros seleccionados.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {vehicle.make} {vehicle.model}
                      </CardTitle>
                      <CardDescription>
                        {vehicle.year} • {vehicle.licensePlate}
                      </CardDescription>
                    </div>
                    {getApprovalStatusBadge(vehicle.approvalStatus)}
                  </div>
                  {vehicle.user && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-center text-sm mb-1">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{vehicle.user.name}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground">{vehicle.user.email}</span>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <span className="text-muted-foreground mr-2">{t('vehicle.type') || 'Tipo:'}</span>
                      <span>{getVehicleTypeLabel(vehicle.type)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-muted-foreground mr-2">{t('vehicle.capacity') || 'Capacidad:'}</span>
                      <span>{vehicle.capacity} {t('vehicle.passengers') || 'pasajeros'}</span>
                    </div>
                    {vehicle.color && (
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground mr-2">{t('vehicle.color') || 'Color:'}</span>
                        <span>{vehicle.color}</span>
                      </div>
                    )}
                    {vehicle.rejectionReason && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        <XCircle className="h-4 w-4 inline mr-1" />
                        {vehicle.rejectionReason}
                      </div>
                    )}
                    {vehicle.approvedAt && (
                      <div className="text-xs text-muted-foreground">
                        {t('vehicle.approvedAt') || 'Aprobado el:'} {new Date(vehicle.approvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {vehicle.approvalStatus === ApprovalStatusEnum.PENDING && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(vehicle)}
                        disabled={isSubmitting}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('admin.vehicles.approve') || 'Aprobar'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenRejectDialog(vehicle)}
                        disabled={isSubmitting}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('admin.vehicles.reject') || 'Rechazar'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('common.previous') || 'Anterior'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('common.page') || 'Página'} {page} {t('common.of') || 'de'} {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {t('common.next') || 'Siguiente'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog para rechazar vehículo */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.vehicles.rejectVehicle') || 'Rechazar Vehículo'}</DialogTitle>
            <DialogDescription>
              {t('admin.vehicles.rejectDescription') || 'Proporciona una razón para el rechazo. Esta información será visible para el conductor.'}
              {selectedVehicle && (
                <div className="mt-2 font-semibold">
                  {selectedVehicle.make} {selectedVehicle.model} - {selectedVehicle.licensePlate}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">
                {t('admin.vehicles.rejectionReason') || 'Razón del rechazo'} (opcional)
              </Label>
              <Input
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('admin.vehicles.rejectionReasonPlaceholder') || 'Ej: Documentación incompleta, vehículo no cumple requisitos...'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
              {isSubmitting ? t('common.processing') || 'Procesando...' : t('admin.vehicles.reject') || 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

