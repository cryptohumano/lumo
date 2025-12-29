import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { getTaxIdInfoForUser } from '@/utils/taxIdHelper'
import type { DriverOnboarding, DriverType, DriverDocumentType, VehicleType } from '@/types'
import { TaxIdType, UserRole } from '@/types'
import { VehicleType as VehicleTypeEnum } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, Circle, ArrowLeft, ArrowRight, Upload, X, MapPin, Car } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const TOTAL_STEPS = 6

export default function DriverOnboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [onboarding, setOnboarding] = useState<DriverOnboarding | null>(null)
  const [taxIdInfo, setTaxIdInfo] = useState<{
    countryCode: string
    countryName: string
    taxIdType: TaxIdType
    taxIdLabel: string
    taxIdPlaceholder: string
  } | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    // Paso 1: Información personal
    fullName: '',
    dateOfBirth: '',
    nationalId: '',
    address: '',
    city: '',
    country: '',
    driverType: 'INDEPENDENT' as DriverType,
    
    // Paso 2: Empresa y referente fiscal
    companyName: '',
    companyTaxId: '',
    companyAddress: '',
    companyCity: '',
    companyCountry: '',
    taxId: '',
    taxIdType: 'RUT' as TaxIdType,
    
    // Paso 3: Licencia
    licenseNumber: '',
    licenseExpiryDate: '',
    licenseIssuedBy: '',
    
    // Paso 4: Documentos (se manejan por separado)
    
    // Paso 5: Bancario
    bankName: '',
    accountNumber: '',
    accountType: '',
    routingNumber: '',
    bankCountry: '',
  })

  const [documents, setDocuments] = useState<Array<{
    id?: string
    type: DriverDocumentType
    fileName: string
    fileUrl: string
    file?: File
  }>>([])

  // Estado para el diálogo de vehículo
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false)
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false)
  const [vehicleFormData, setVehicleFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    licensePlate: '',
    type: 'SEDAN' as VehicleType,
    capacity: 4,
  })

  // Cargar estado del onboarding
  useEffect(() => {
    loadOnboarding()
    loadTaxIdInfo()
  }, [])

  // Recargar onboarding cuando se regresa de otra página (ej: vehículos)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentStep === 6) {
        // Recargar si estamos en el paso 6 (vehículo)
        loadOnboarding()
      }
    }

    const handleFocus = () => {
      // Si estamos en el paso 6 y volvemos de la página de vehículos, recargar
      if (currentStep === 6) {
        loadOnboarding()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentStep])

  const loadOnboarding = async () => {
    try {
      setIsLoading(true)
      const data = await api.getOnboardingStatus()
      setOnboarding(data)
      
      // Si ya está completado o aprobado, redirigir
      if (data.status === 'COMPLETED' || data.status === 'APPROVED') {
        // Solo redirigir si el usuario tiene rol DRIVER
        if (user?.roles?.includes(UserRole.DRIVER) || user?.role === UserRole.DRIVER) {
          navigate('/driver/dashboard')
        } else {
          // Si no tiene rol DRIVER, quedarse en onboarding pero mostrar mensaje
          console.log('Onboarding completado pero usuario aún no tiene rol DRIVER')
        }
        return
      }

      // Si está en progreso, cargar datos existentes
      if (data.status === 'IN_PROGRESS' || data.status === 'PENDING_REVIEW') {
        setCurrentStep(data.currentStep || 1)
        setFormData({
          fullName: data.fullName || '',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
          nationalId: data.nationalId || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || '',
          driverType: (data.driverType as DriverType) || 'INDEPENDENT',
          companyName: data.companyName || '',
          companyTaxId: data.companyTaxId || '',
          companyAddress: data.companyAddress || '',
          companyCity: data.companyCity || '',
          companyCountry: data.companyCountry || '',
          taxId: data.taxId || '',
          taxIdType: (data.taxIdType as TaxIdType) || 'RUT',
          licenseNumber: data.licenseNumber || '',
          licenseExpiryDate: data.licenseExpiryDate ? new Date(data.licenseExpiryDate).toISOString().split('T')[0] : '',
          licenseIssuedBy: data.licenseIssuedBy || '',
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          accountType: data.accountType || '',
          routingNumber: data.routingNumber || '',
          bankCountry: data.bankCountry || '',
        })
        if (data.documents) {
          setDocuments(data.documents.map(doc => ({
            id: doc.id,
            type: doc.type,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
          })))
        }
      }
    } catch (error: any) {
      console.error('Error cargando onboarding:', error)
      toast.error('Error al cargar el estado del onboarding')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTaxIdInfo = async () => {
    try {
      const info = await getTaxIdInfoForUser()
      setTaxIdInfo(info)
      setFormData(prev => ({
        ...prev,
        country: info.countryCode,
        taxIdType: info.taxIdType,
        companyCountry: info.countryCode,
        bankCountry: info.countryCode,
      }))
    } catch (error) {
      console.error('Error detectando país:', error)
      // Fallback a Chile
      setTaxIdInfo({
        countryCode: 'CL',
        countryName: 'Chile',
        taxIdType: TaxIdType.RUT,
        taxIdLabel: 'RUT',
        taxIdPlaceholder: '12.345.678-9',
      })
    }
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      // Iniciar onboarding
      try {
        setIsSaving(true)
        await api.startOnboarding({
          fullName: formData.fullName,
          dateOfBirth: formData.dateOfBirth,
          nationalId: formData.nationalId,
          address: formData.address,
          city: formData.city,
          country: formData.country,
        })
        
        // Actualizar campos adicionales si es necesario
        if (formData.driverType || formData.taxId || formData.taxIdType) {
          await api.updateOnboarding({
            // Nota: driverType y campos de compañía no están en el tipo del API actualmente
            // Se pueden agregar en el backend si es necesario
          })
        }
        setCurrentStep(2)
      } catch (error: any) {
        toast.error(error.message || 'Error al iniciar onboarding')
        return
      } finally {
        setIsSaving(false)
      }
    } else if (currentStep < TOTAL_STEPS) {
      // Guardar progreso y avanzar
      await saveProgress()
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const saveProgress = async () => {
    try {
      setIsSaving(true)
      await api.updateOnboarding({
        ...formData,
        currentStep,
      })
      toast.success('Progreso guardado')
    } catch (error: any) {
      console.error('Error guardando progreso:', error)
      toast.error('Error al guardar progreso')
    } finally {
      setIsSaving(false)
    }
  }

  const handleComplete = async () => {
    try {
      setIsSaving(true)
      await saveProgress()
      await api.completeOnboarding()
      toast.success('Onboarding completado. Tu solicitud será revisada por un administrador.')
      navigate('/driver/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Error al completar onboarding')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateVehicle = async () => {
    if (isSubmittingVehicle) return

    try {
      setIsSubmittingVehicle(true)

      // Crear vehículo
      const newVehicle = await api.createVehicle(vehicleFormData)
      toast.success('Vehículo creado correctamente. Pendiente de aprobación.')

      // Asociar el vehículo al onboarding
      try {
        await api.linkVehicleToOnboarding(newVehicle.id)
        toast.success('Vehículo asociado al onboarding')
        
        // Recargar onboarding para actualizar el estado
        await loadOnboarding()
        
        // Cerrar el diálogo
        setIsVehicleDialogOpen(false)
        
        // Limpiar el formulario
        setVehicleFormData({
          make: '',
          model: '',
          year: new Date().getFullYear(),
          color: '',
          licensePlate: '',
          type: 'SEDAN' as VehicleType,
          capacity: 4,
        })
      } catch (error: any) {
        console.error('Error asociando vehículo al onboarding:', error)
        toast.error('Error al asociar vehículo al onboarding. El vehículo fue creado pero no se asoció.')
      }
    } catch (error: any) {
      console.error('Error creando vehículo:', error)
      toast.error(error.message || 'Error al crear vehículo')
    } finally {
      setIsSubmittingVehicle(false)
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
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {t('onboarding.title') || 'Registro como Conductor'}
        </h1>
        <p className="text-muted-foreground">
          {t('onboarding.description') || 'Completa los siguientes pasos para convertirte en conductor'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Paso {currentStep} de {TOTAL_STEPS}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round((currentStep / TOTAL_STEPS) * 100)}%
          </span>
        </div>
        <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step < currentStep
                    ? 'bg-primary text-primary-foreground border-primary'
                    : step === currentStep
                    ? 'border-primary text-primary'
                    : 'border-muted text-muted-foreground'
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step}</span>
                )}
              </div>
              <span className="text-xs mt-1 text-center max-w-[60px]">
                {step === 1 && 'Personal'}
                {step === 2 && 'Empresa'}
                {step === 3 && 'Licencia'}
                {step === 4 && 'Documentos'}
                {step === 5 && 'Bancario'}
                {step === 6 && 'Vehículo'}
              </span>
            </div>
            {step < TOTAL_STEPS && (
              <div
                className={`h-0.5 w-16 mx-2 ${
                  step < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && (t('onboarding.step1.title') || 'Información Personal')}
            {currentStep === 2 && (t('onboarding.step2.title') || 'Información de Empresa y Referente Fiscal')}
            {currentStep === 3 && (t('onboarding.step3.title') || 'Información de Licencia')}
            {currentStep === 4 && (t('onboarding.step4.title') || 'Documentos (KYB)')}
            {currentStep === 5 && (t('onboarding.step5.title') || 'Información Bancaria')}
            {currentStep === 6 && (t('onboarding.step6.title') || 'Registro de Vehículo')}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && (t('onboarding.step1.description') || 'Ingresa tu información personal básica')}
            {currentStep === 2 && (t('onboarding.step2.description') || 'Si representas una empresa, completa esta información')}
            {currentStep === 3 && (t('onboarding.step3.description') || 'Información de tu licencia de conducir')}
            {currentStep === 4 && (t('onboarding.step4.description') || 'Sube los documentos requeridos para verificación')}
            {currentStep === 5 && (t('onboarding.step5.description') || 'Información bancaria para pagos')}
            {currentStep === 6 && (t('onboarding.step6.description') || 'Registra tu vehículo')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Paso 1: Información Personal */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">
                    {t('onboarding.fullName') || 'Nombre Completo'} *
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder={t('onboarding.fullNamePlaceholder') || 'Juan Pérez'}
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">
                    {t('onboarding.dateOfBirth') || 'Fecha de Nacimiento'} *
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nationalId">
                    {t('onboarding.nationalId') || 'Cédula de Identidad'} *
                  </Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder={t('onboarding.nationalIdPlaceholder') || '12.345.678-9'}
                  />
                </div>
                <div>
                  <Label htmlFor="country">
                    {t('onboarding.country') || 'País'} *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="country"
                      value={taxIdInfo?.countryName || formData.country}
                      disabled
                      className="flex-1"
                    />
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {t('onboarding.detectedByGPS') || 'Detectado por GPS'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="address">
                  {t('onboarding.address') || 'Dirección'} *
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('onboarding.addressPlaceholder') || 'Calle y número'}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">
                    {t('onboarding.city') || 'Ciudad'} *
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder={t('onboarding.cityPlaceholder') || 'Santiago'}
                  />
                </div>
              </div>

              <div>
                <Label>
                  {t('onboarding.driverType') || 'Tipo de Conductor'} *
                </Label>
                <RadioGroup
                  value={formData.driverType}
                  onValueChange={(value) => setFormData({ ...formData, driverType: value as DriverType })}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INDEPENDENT" id="independent" />
                    <Label htmlFor="independent" className="cursor-pointer">
                      {t('onboarding.independent') || 'Independiente'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="COMPANY" id="company" />
                    <Label htmlFor="company" className="cursor-pointer">
                      {t('onboarding.company') || 'Empresa'}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Paso 2: Empresa y Referente Fiscal */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {formData.driverType === 'COMPANY' && (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {t('onboarding.companyInfo') || 'Información de la Empresa'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="companyName">
                          {t('onboarding.companyName') || 'Nombre de la Empresa'} *
                        </Label>
                        <Input
                          id="companyName"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder={t('onboarding.companyNamePlaceholder') || 'Transportes XYZ S.A.'}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyTaxId">
                          {t('onboarding.companyTaxId') || 'ID Fiscal de la Empresa'} *
                        </Label>
                        <Input
                          id="companyTaxId"
                          value={formData.companyTaxId}
                          onChange={(e) => setFormData({ ...formData, companyTaxId: e.target.value })}
                          placeholder={taxIdInfo?.taxIdPlaceholder || '76.123.456-7'}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyAddress">
                          {t('onboarding.companyAddress') || 'Dirección de la Empresa'} *
                        </Label>
                        <Input
                          id="companyAddress"
                          value={formData.companyAddress}
                          onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                          placeholder={t('onboarding.companyAddressPlaceholder') || 'Calle y número'}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyCity">
                          {t('onboarding.companyCity') || 'Ciudad de la Empresa'} *
                        </Label>
                        <Input
                          id="companyCity"
                          value={formData.companyCity}
                          onChange={(e) => setFormData({ ...formData, companyCity: e.target.value })}
                          placeholder={t('onboarding.companyCityPlaceholder') || 'Santiago'}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t('onboarding.taxInfo') || 'Referente Fiscal'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="taxIdType">
                      {t('onboarding.taxIdType') || 'Tipo de Referente Fiscal'} *
                    </Label>
                    <Select
                      value={formData.taxIdType}
                      onValueChange={(value) => setFormData({ ...formData, taxIdType: value as TaxIdType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RUT">RUT (Chile)</SelectItem>
                        <SelectItem value="CUIT">CUIT (Argentina)</SelectItem>
                        <SelectItem value="RFC">RFC (México)</SelectItem>
                        <SelectItem value="CPF">CPF (Brasil - Persona)</SelectItem>
                        <SelectItem value="CNPJ">CNPJ (Brasil - Empresa)</SelectItem>
                        <SelectItem value="NIT">NIT (Colombia)</SelectItem>
                        <SelectItem value="RUC">RUC (Perú)</SelectItem>
                        <SelectItem value="NIT_BOL">NIT (Bolivia)</SelectItem>
                        <SelectItem value="SIN">SIN (Canadá)</SelectItem>
                        <SelectItem value="EIN">EIN (Estados Unidos)</SelectItem>
                        <SelectItem value="OTHER">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="taxId">
                      {taxIdInfo?.taxIdLabel || t('onboarding.taxId') || 'Referente Fiscal'} *
                    </Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      placeholder={taxIdInfo?.taxIdPlaceholder || '12.345.678-9'}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('onboarding.taxIdDescription') || 'Ingresa tu referente fiscal según tu país'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Licencia */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="licenseNumber">
                  {t('onboarding.licenseNumber') || 'Número de Licencia'} *
                </Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder={t('onboarding.licenseNumberPlaceholder') || 'A123456789'}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="licenseExpiryDate">
                    {t('onboarding.licenseExpiryDate') || 'Fecha de Vencimiento'} *
                  </Label>
                  <Input
                    id="licenseExpiryDate"
                    type="date"
                    value={formData.licenseExpiryDate}
                    onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="licenseIssuedBy">
                    {t('onboarding.licenseIssuedBy') || 'Emitida por'} *
                  </Label>
                  <Input
                    id="licenseIssuedBy"
                    value={formData.licenseIssuedBy}
                    onChange={(e) => setFormData({ ...formData, licenseIssuedBy: e.target.value })}
                    placeholder={t('onboarding.licenseIssuedByPlaceholder') || 'Municipalidad de...'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paso 4: Documentos */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                {t('onboarding.documentsDescription') || 'Sube los documentos requeridos para verificación. Todos los documentos serán revisados por un administrador.'}
              </p>
              
              <div className="space-y-4">
                {[
                  { type: 'NATIONAL_ID_FRONT' as DriverDocumentType, label: t('onboarding.doc.nationalIdFront') || 'Cédula de Identidad (Frente)' },
                  { type: 'NATIONAL_ID_BACK' as DriverDocumentType, label: t('onboarding.doc.nationalIdBack') || 'Cédula de Identidad (Reverso)' },
                  { type: 'DRIVER_LICENSE_FRONT' as DriverDocumentType, label: t('onboarding.doc.licenseFront') || 'Licencia de Conducir (Frente)' },
                  { type: 'DRIVER_LICENSE_BACK' as DriverDocumentType, label: t('onboarding.doc.licenseBack') || 'Licencia de Conducir (Reverso)' },
                  { type: 'PROOF_OF_ADDRESS' as DriverDocumentType, label: t('onboarding.doc.proofOfAddress') || 'Comprobante de Domicilio' },
                  { type: 'BANK_STATEMENT' as DriverDocumentType, label: t('onboarding.doc.bankStatement') || 'Estado de Cuenta Bancario' },
                ].map((docType) => {
                  const existingDoc = documents.find(d => d.type === docType.type)
                  return (
                    <div key={docType.type} className="border rounded-lg p-4">
                      <Label className="text-base font-medium mb-2 block">
                        {docType.label}
                        {docType.type === 'NATIONAL_ID_FRONT' || docType.type === 'DRIVER_LICENSE_FRONT' ? ' *' : ''}
                      </Label>
                      {existingDoc ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{existingDoc.fileName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (existingDoc.id) {
                                await api.deleteDocument(existingDoc.id)
                                setDocuments(documents.filter(d => d.id !== existingDoc.id))
                              } else {
                                setDocuments(documents.filter(d => d.type !== docType.type))
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                try {
                                  setIsSaving(true)
                                  // Subir archivo a storage
                                  const uploadResult = await api.uploadFile(file, 'onboarding')
                                  
                                  // Guardar documento en el backend
                                  const document = await api.uploadDocument({
                                    type: docType.type,
                                    fileName: uploadResult.fileName,
                                    fileUrl: uploadResult.url,
                                    fileSize: uploadResult.fileSize,
                                    mimeType: uploadResult.mimeType,
                                  })

                                  setDocuments([...documents, {
                                    id: document.id,
                                    type: docType.type,
                                    fileName: document.fileName,
                                    fileUrl: document.fileUrl,
                                  }])
                                  toast.success('Documento subido exitosamente')
                                } catch (error: any) {
                                  console.error('Error subiendo documento:', error)
                                  toast.error(error.message || 'Error al subir documento')
                                } finally {
                                  setIsSaving(false)
                                }
                              }
                            }}
                            className="flex-1"
                            disabled={isSaving}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Paso 5: Bancario */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bankName">
                  {t('onboarding.bankName') || 'Nombre del Banco'} *
                </Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder={t('onboarding.bankNamePlaceholder') || 'Banco de Chile'}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">
                    {t('onboarding.accountNumber') || 'Número de Cuenta'} *
                  </Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder={t('onboarding.accountNumberPlaceholder') || '1234567890'}
                  />
                </div>
                <div>
                  <Label htmlFor="accountType">
                    {t('onboarding.accountType') || 'Tipo de Cuenta'} *
                  </Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value) => setFormData({ ...formData, accountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('onboarding.selectAccountType') || 'Selecciona tipo'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHECKING">{t('onboarding.checking') || 'Cuenta Corriente'}</SelectItem>
                      <SelectItem value="SAVINGS">{t('onboarding.savings') || 'Cuenta de Ahorros'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="routingNumber">
                  {t('onboarding.routingNumber') || 'Número de Ruta / CLABE / Otro'}
                </Label>
                <Input
                  id="routingNumber"
                  value={formData.routingNumber}
                  onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                  placeholder={t('onboarding.routingNumberPlaceholder') || 'Opcional según país'}
                />
              </div>
            </div>
          )}

          {/* Paso 6: Vehículo */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                {t('onboarding.vehicleDescription') || 'Registra tu vehículo. Puedes agregar más vehículos después desde tu dashboard.'}
              </p>
              
              {onboarding?.vehicleId ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('onboarding.vehicleRegistered') || 'Vehículo registrado correctamente'}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {t('onboarding.vehicleRegisteredDescription') || 'Tu vehículo ha sido registrado y está pendiente de aprobación por un administrador.'}
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={() => setIsVehicleDialogOpen(true)}
                  >
                    <Car className="h-4 w-4 mr-2" />
                    {t('onboarding.registerVehicle') || 'Registrar Vehículo'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/driver/vehicles?fromOnboarding=true')}
                  >
                    {t('onboarding.registerVehicleInPage') || 'Registrar en página completa'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isSaving}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.previous') || 'Anterior'}
            </Button>
            {currentStep < TOTAL_STEPS ? (
              <Button
                onClick={handleNext}
                disabled={isSaving}
              >
                {t('common.next') || 'Siguiente'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isSaving || !onboarding?.vehicleId}
              >
                {t('onboarding.complete') || 'Completar Onboarding'}
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para registrar vehículo */}
      <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('onboarding.registerVehicle') || 'Registrar Vehículo'}
            </DialogTitle>
            <DialogDescription>
              {t('onboarding.registerVehicleDescription') || 'Completa la información de tu vehículo. Debe ser aprobado por un administrador antes de poder usarlo.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateVehicle(); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-make">{t('vehicle.make') || 'Marca'} *</Label>
                  <Input
                    id="vehicle-make"
                    value={vehicleFormData.make}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, make: e.target.value })}
                    required
                    placeholder={t('vehicle.makePlaceholder') || 'Toyota'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-model">{t('vehicle.model') || 'Modelo'} *</Label>
                  <Input
                    id="vehicle-model"
                    value={vehicleFormData.model}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                    required
                    placeholder={t('vehicle.modelPlaceholder') || 'Corolla'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-year">{t('vehicle.year') || 'Año'} *</Label>
                  <Input
                    id="vehicle-year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={vehicleFormData.year}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-color">{t('vehicle.color') || 'Color'}</Label>
                  <Input
                    id="vehicle-color"
                    value={vehicleFormData.color}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, color: e.target.value })}
                    placeholder={t('vehicle.colorPlaceholder') || 'Blanco'}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-licensePlate">{t('vehicle.licensePlate') || 'Placa'} *</Label>
                <Input
                  id="vehicle-licensePlate"
                  value={vehicleFormData.licensePlate}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, licensePlate: e.target.value.toUpperCase() })}
                  required
                  placeholder="ABC1234"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-type">{t('vehicle.type') || 'Tipo de Vehículo'} *</Label>
                  <Select
                    value={vehicleFormData.type}
                    onValueChange={(value) => setVehicleFormData({ ...vehicleFormData, type: value as VehicleType })}
                  >
                    <SelectTrigger id="vehicle-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VehicleTypeEnum).map((type) => (
                        <SelectItem key={type} value={type}>
                          {getVehicleTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-capacity">{t('vehicle.capacity') || 'Capacidad'} *</Label>
                  <Input
                    id="vehicle-capacity"
                    type="number"
                    min="1"
                    max="20"
                    value={vehicleFormData.capacity}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, capacity: parseInt(e.target.value) || 4 })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVehicleDialogOpen(false)}
                disabled={isSubmittingVehicle}
              >
                {t('common.cancel') || 'Cancelar'}
              </Button>
              <Button type="submit" disabled={isSubmittingVehicle}>
                {isSubmittingVehicle
                  ? (t('common.saving') || 'Guardando...')
                  : (t('onboarding.registerVehicle') || 'Registrar Vehículo')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

