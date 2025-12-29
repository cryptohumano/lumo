/**
 * Página para que los conductores gestionen sus vehículos
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Edit, Trash2, Car, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { Vehicle, VehicleApprovalStatus } from '@/types'
import { VehicleType, VehicleApprovalStatus as ApprovalStatusEnum } from '@/types'

export default function DriverVehicles() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromOnboarding = searchParams.get('fromOnboarding') === 'true'
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    licensePlate: '',
    type: 'SEDAN' as VehicleType,
    capacity: 4,
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadVehicles()
  }, [user, navigate])

  const loadVehicles = async () => {
    try {
      setIsLoading(true)
      const data = await api.getMyVehicles()
      setVehicles(data)
    } catch (error: any) {
      console.error('Error loading vehicles:', error)
      toast.error(error.message || t('driver.vehicles.loadError') || 'Error al cargar vehículos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCreateDialog = () => {
    setSelectedVehicle(null)
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      licensePlate: '',
      type: 'SEDAN' as VehicleType,
      capacity: 4,
    })
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color || '',
      licensePlate: vehicle.licensePlate,
      type: vehicle.type,
      capacity: vehicle.capacity,
    })
    setIsDialogOpen(true)
  }

  const handleOpenDeleteDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)

      if (selectedVehicle) {
        // Actualizar vehículo
        await api.updateVehicle(selectedVehicle.id, formData)
        toast.success(t('driver.vehicles.updateSuccess') || 'Vehículo actualizado correctamente')
      } else {
        // Crear vehículo
        const newVehicle = await api.createVehicle(formData)
        toast.success(t('driver.vehicles.createSuccess') || 'Vehículo creado correctamente. Pendiente de aprobación.')
        
        // Si viene del onboarding, asociar el vehículo
        if (fromOnboarding) {
          try {
            await api.linkVehicleToOnboarding(newVehicle.id)
            toast.success('Vehículo asociado al onboarding')
            // Cerrar el diálogo primero
            setIsDialogOpen(false)
            // Volver al onboarding después de un pequeño delay para que se cierre el diálogo
            setTimeout(() => {
              navigate('/driver/onboarding', { replace: true })
            }, 300)
            return
          } catch (error: any) {
            console.error('Error asociando vehículo al onboarding:', error)
            toast.error('Error al asociar vehículo al onboarding. El vehículo fue creado pero no se asoció.')
            // No retornar, continuar con el flujo normal
          }
        }
      }

      setIsDialogOpen(false)
      loadVehicles()
    } catch (error: any) {
      console.error('Error saving vehicle:', error)
      toast.error(error.message || t('driver.vehicles.saveError') || 'Error al guardar vehículo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedVehicle || isSubmitting) return

    try {
      setIsSubmitting(true)
      await api.deleteVehicle(selectedVehicle.id)
      toast.success(t('driver.vehicles.deleteSuccess') || 'Vehículo eliminado correctamente')
      setIsDeleteDialogOpen(false)
      setSelectedVehicle(null)
      loadVehicles()
    } catch (error: any) {
      console.error('Error deleting vehicle:', error)
      toast.error(error.message || t('driver.vehicles.deleteError') || 'Error al eliminar vehículo')
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
        onClick={() => fromOnboarding ? navigate('/driver/onboarding') : navigate('/driver/dashboard')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back') || 'Volver'}
      </Button>

      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('driver.vehicles.title') || 'Mis Vehículos'}</h1>
          <p className="text-muted-foreground">
            {fromOnboarding 
              ? (t('onboarding.registerVehicleDescription') || 'Registra tu vehículo para completar el onboarding')
              : (t('driver.vehicles.description') || 'Gestiona tus vehículos. Deben ser aprobados por un administrador antes de poder usarlos.')
            }
          </p>
        </div>
        <div className="flex gap-2">
          {fromOnboarding && (
            <Button variant="outline" onClick={() => navigate('/driver/onboarding')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back') || 'Volver al Onboarding'}
            </Button>
          )}
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('driver.vehicles.addVehicle') || 'Agregar Vehículo'}
          </Button>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Car className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('driver.vehicles.noVehicles') || 'No tienes vehículos'}</h3>
              <p className="text-muted-foreground mb-4">
                {t('driver.vehicles.noVehiclesDescription') || 'Agrega un vehículo para comenzar a recibir solicitudes de viaje.'}
              </p>
              <Button onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t('driver.vehicles.addVehicle') || 'Agregar Vehículo'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
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
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      {vehicle.rejectionReason}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenEditDialog(vehicle)}
                    disabled={vehicle.approvalStatus === ApprovalStatusEnum.APPROVED}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t('common.edit') || 'Editar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDeleteDialog(vehicle)}
                    disabled={vehicle.approvalStatus === ApprovalStatusEnum.APPROVED}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('common.delete') || 'Eliminar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para crear/editar vehículo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedVehicle
                ? t('driver.vehicles.editVehicle') || 'Editar Vehículo'
                : t('driver.vehicles.addVehicle') || 'Agregar Vehículo'}
            </DialogTitle>
            <DialogDescription>
              {selectedVehicle
                ? t('driver.vehicles.editDescription') || 'Actualiza la información de tu vehículo. Nota: Si el vehículo estaba aprobado, volverá a estado pendiente después de la actualización.'
                : t('driver.vehicles.addDescription') || 'Completa la información de tu vehículo. Debe ser aprobado por un administrador antes de poder usarlo.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">{t('vehicle.make') || 'Marca'} *</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">{t('vehicle.model') || 'Modelo'} *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">{t('vehicle.year') || 'Año'} *</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">{t('vehicle.color') || 'Color'}</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="licensePlate">{t('vehicle.licensePlate') || 'Placa'} *</Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                  required
                  placeholder="ABC1234"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">{t('vehicle.type') || 'Tipo de Vehículo'} *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as VehicleType })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VehicleType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {getVehicleTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">{t('vehicle.capacity') || 'Capacidad'} *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel') || 'Cancelar'}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t('common.saving') || 'Guardando...'
                  : selectedVehicle
                  ? t('common.save') || 'Guardar'
                  : t('common.create') || 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('driver.vehicles.deleteConfirm') || '¿Eliminar vehículo?'}</DialogTitle>
            <DialogDescription>
              {t('driver.vehicles.deleteConfirmDescription') || 'Esta acción no se puede deshacer. El vehículo será eliminado permanentemente.'}
              {selectedVehicle && (
                <div className="mt-2 font-semibold">
                  {selectedVehicle.make} {selectedVehicle.model} - {selectedVehicle.licensePlate}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? t('common.deleting') || 'Eliminando...' : t('common.delete') || 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

