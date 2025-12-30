import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { UserCircle, Save, ArrowLeft, Mail, Phone, MapPin, Car, Award, FileText, Upload, X, Wallet, CheckCircle2 } from 'lucide-react'
import { api } from '@/services/api'
import { getCountryName } from '@/services/locationService'
import { PeopleChainIdentity } from '@/components/polkadot/PeopleChainIdentity'
import type { DriverOnboarding, DriverDocumentType } from '@/types'
import { DriverDocumentType as DriverDocumentTypeEnum } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function DriverProfile() {
  const { t } = useTranslation()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true)
  const [onboarding, setOnboarding] = useState<DriverOnboarding | null>(null)
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
  })
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isUpdatingDocuments, setIsUpdatingDocuments] = useState(false)
  const [licenseFormData, setLicenseFormData] = useState({
    licenseNumber: '',
    licenseExpiryDate: '',
    licenseIssuedBy: '',
  })
  const [documents, setDocuments] = useState<Array<{
    type: DriverDocumentType
    file?: File
    fileName?: string
    fileUrl?: string
  }>>([
    { type: DriverDocumentTypeEnum.DRIVER_LICENSE_FRONT },
    { type: DriverDocumentTypeEnum.DRIVER_LICENSE_BACK },
  ])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    loadRoleProfile()
    loadOnboardingData()
  }, [user, navigate])

  const loadRoleProfile = async () => {
    try {
      if (user) {
        setFormData({
          displayName: user.name,
          bio: '',
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadOnboardingData = async () => {
    try {
      setIsLoadingOnboarding(true)
      const onboardingData = await api.getOnboardingStatus()
      setOnboarding(onboardingData)
      
      // Cargar datos de licencia en el formulario del modal
      if (onboardingData) {
        setLicenseFormData({
          licenseNumber: onboardingData.licenseNumber || '',
          licenseExpiryDate: onboardingData.licenseExpiryDate 
            ? new Date(onboardingData.licenseExpiryDate).toISOString().split('T')[0]
            : '',
          licenseIssuedBy: onboardingData.licenseIssuedBy || '',
        })
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error)
      // No mostrar error si no hay onboarding aún
    } finally {
      setIsLoadingOnboarding(false)
    }
  }

  const handleOpenUpdateModal = () => {
    if (onboarding) {
      setLicenseFormData({
        licenseNumber: onboarding.licenseNumber || '',
        licenseExpiryDate: onboarding.licenseExpiryDate 
          ? new Date(onboarding.licenseExpiryDate).toISOString().split('T')[0]
          : '',
        licenseIssuedBy: onboarding.licenseIssuedBy || '',
      })
    }
    setIsUpdateModalOpen(true)
  }

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false)
    setDocuments([
      { type: DriverDocumentTypeEnum.DRIVER_LICENSE_FRONT },
      { type: DriverDocumentTypeEnum.DRIVER_LICENSE_BACK },
    ])
  }

  const handleDocumentUpload = (type: DriverDocumentType, file: File) => {
    setDocuments(prev => prev.map(doc => 
      doc.type === type 
        ? { ...doc, file, fileName: file.name }
        : doc
    ))
  }

  const handleRemoveDocument = (type: DriverDocumentType) => {
    setDocuments(prev => prev.map(doc => 
      doc.type === type 
        ? { type, file: undefined, fileName: undefined, fileUrl: undefined }
        : doc
    ))
  }

  const handleSubmitDocuments = async () => {
    try {
      setIsUpdatingDocuments(true)

      // Verificar si hay cambios o documentos
      const hasDocuments = documents.some(doc => doc.file)
      const hasChanges = onboarding && (
        onboarding.licenseNumber !== licenseFormData.licenseNumber ||
        onboarding.licenseIssuedBy !== licenseFormData.licenseIssuedBy ||
        (onboarding.licenseExpiryDate && new Date(onboarding.licenseExpiryDate).toISOString().split('T')[0] !== licenseFormData.licenseExpiryDate)
      )

      if (!hasDocuments && !hasChanges) {
        toast.error(t('profile.noChanges') || 'No hay cambios para guardar')
        return
      }

      // Primero subir documentos (si hay)
      const uploadedDocuments: string[] = []
      for (const doc of documents) {
        if (doc.file) {
          try {
            // Subir archivo a storage
            const uploadResult = await api.uploadFile(doc.file, 'onboarding')
            
            // Guardar documento en el backend
            await api.uploadDocument({
              type: doc.type,
              fileName: uploadResult.fileName,
              fileUrl: uploadResult.url,
              fileSize: uploadResult.fileSize,
              mimeType: uploadResult.mimeType,
            })
            uploadedDocuments.push(doc.type)
          } catch (error: any) {
            console.error(`Error subiendo documento ${doc.type}:`, error)
            toast.error(`Error al subir ${doc.type === DriverDocumentTypeEnum.DRIVER_LICENSE_FRONT ? 'licencia frontal' : 'licencia trasera'}`)
            throw error // Detener el proceso si falla la subida
          }
        }
      }

      // Luego actualizar el onboarding con los datos de licencia
      // Si hay cambios o documentos nuevos, marcamos como pendiente de revisión
      if (onboarding && (hasDocuments || hasChanges)) {
        await api.updateOnboarding({
          licenseNumber: licenseFormData.licenseNumber,
          licenseExpiryDate: licenseFormData.licenseExpiryDate || undefined,
          licenseIssuedBy: licenseFormData.licenseIssuedBy || undefined,
          // Marcar como pendiente de revisión si hay cambios o documentos
          currentStep: onboarding.totalSteps, // Esto hará que se marque como PENDING_REVIEW
        })
      } else if (hasChanges) {
        // Solo cambios sin documentos nuevos
        await api.updateOnboarding({
          licenseNumber: licenseFormData.licenseNumber,
          licenseExpiryDate: licenseFormData.licenseExpiryDate || undefined,
          licenseIssuedBy: licenseFormData.licenseIssuedBy || undefined,
          currentStep: onboarding.totalSteps, // Marcar como pendiente de revisión
        })
      }

      toast.success(t('profile.documentsSubmitted') || 'Documentos enviados. Serán revisados por un administrador.')
      
      // Recargar datos del onboarding
      await loadOnboardingData()
      
      // Cerrar modal
      handleCloseUpdateModal()
    } catch (error: any) {
      console.error('Error actualizando documentos:', error)
      toast.error(error.message || t('profile.documentsError') || 'Error al actualizar documentos')
    } finally {
      setIsUpdatingDocuments(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    try {
      setIsSaving(true)
      
      // TODO: Implementar endpoint para actualizar perfil por rol
      const updatedUser = await api.updateProfile({
        name: formData.displayName,
      })

      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))

      toast.success(t('profile.saved') || 'Perfil guardado correctamente')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast.error(error.message || t('profile.saveError') || 'Error al guardar perfil')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return null
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back') || 'Volver'}
      </Button>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <UserCircle className="h-8 w-8" />
          <h1 className="text-3xl font-bold">{t('profile.title') || 'Mi Perfil'}</h1>
        </div>
        <p className="text-muted-foreground">
          {t('profile.driver.description') || 'Gestiona tu perfil de conductor'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Información del Perfil */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.personalInfo') || 'Información Personal'}</CardTitle>
              <CardDescription>
                {t('profile.personalInfoDescription') || 'Actualiza tu información de perfil'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <Badge variant="secondary" className="mt-1">
                    {t('roles.driver') || 'Conductor'}
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="displayName">{t('profile.displayName') || 'Nombre a mostrar'}</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder={t('profile.displayNamePlaceholder') || 'Tu nombre público'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('profile.displayNameDescription') || 'Este nombre será visible para los pasajeros'}
                </p>
              </div>

              <div>
                <Label htmlFor="bio">{t('profile.bio') || 'Biografía'}</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder={t('profile.bioPlaceholder') || 'Cuéntanos sobre tu experiencia como conductor...'}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('profile.bioDescription') || 'Información sobre tu experiencia y especialidades'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Información Profesional */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    {t('profile.professionalInfo') || 'Información Profesional'}
                  </CardTitle>
                  <CardDescription>
                    {t('profile.professionalInfoDescription') || 'Información sobre tu experiencia como conductor'}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenUpdateModal}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {t('profile.updateDocuments') || 'Actualizar Papeles'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingOnboarding ? (
                <div className="text-center py-4 text-muted-foreground">
                  {t('common.loading') || 'Cargando...'}
                </div>
              ) : onboarding ? (
                <>
                  <div>
                    <Label htmlFor="licenseNumber">{t('profile.licenseNumber') || 'Número de Licencia'}</Label>
                    <Input
                      id="licenseNumber"
                      value={onboarding.licenseNumber || ''}
                      disabled
                      className="bg-muted"
                      placeholder={t('profile.licenseNumberPlaceholder') || 'Ej: A12345678'}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('profile.licenseFromOnboarding') || 'Este dato proviene de tu proceso de onboarding'}
                    </p>
                  </div>

                  {onboarding.licenseExpiryDate && (
                    <div>
                      <Label htmlFor="licenseExpiryDate">{t('profile.licenseExpiryDate') || 'Fecha de Vencimiento'}</Label>
                      <Input
                        id="licenseExpiryDate"
                        type="text"
                        value={new Date(onboarding.licenseExpiryDate).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  )}

                  {onboarding.licenseIssuedBy && (
                    <div>
                      <Label htmlFor="licenseIssuedBy">{t('profile.licenseIssuedBy') || 'Emitida por'}</Label>
                      <Input
                        id="licenseIssuedBy"
                        value={onboarding.licenseIssuedBy}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  )}

                  {!onboarding.licenseNumber && (
                    <div className="text-center py-4 text-muted-foreground border rounded-lg">
                      <p className="mb-2">{t('profile.noLicenseData') || 'No hay datos de licencia registrados'}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/driver/onboarding')}
                      >
                        {t('profile.completeOnboarding') || 'Completar Onboarding'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground border rounded-lg">
                  <p className="mb-2">{t('profile.noOnboardingData') || 'No hay datos de onboarding registrados'}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/driver/onboarding')}
                  >
                    {t('profile.startOnboarding') || 'Iniciar Onboarding'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.contactInfo') || 'Información de Contacto'}</CardTitle>
              <CardDescription>
                {t('profile.contactInfoDescription') || 'Tu información de contacto'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">{t('auth.email') || 'Email'}</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {user.phone && (
                <div>
                  <Label htmlFor="phone">{t('admin.phone') || 'Teléfono'}</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={user.phone}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}

              {user.country && (
                <div>
                  <Label htmlFor="country">{t('settings.country') || 'País'}</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="country"
                      value={getCountryName(user.country)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? (t('common.saving') || 'Guardando...') : (t('common.save') || 'Guardar')}
            </Button>
          </div>
        </div>
      </form>

      {/* Modal para actualizar documentos */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('profile.updateDocuments') || 'Actualizar Papeles'}</DialogTitle>
            <DialogDescription>
              {t('profile.updateDocumentsDescription') || 'Actualiza los datos de tu licencia y sube los documentos necesarios para que un administrador los revise.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Datos de Licencia */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('profile.licenseInfo') || 'Información de Licencia'}</h3>
              
              <div>
                <Label htmlFor="modal-licenseNumber">{t('profile.licenseNumber') || 'Número de Licencia'}</Label>
                <Input
                  id="modal-licenseNumber"
                  value={licenseFormData.licenseNumber}
                  onChange={(e) => setLicenseFormData({ ...licenseFormData, licenseNumber: e.target.value })}
                  placeholder={t('profile.licenseNumberPlaceholder') || 'Ej: A12345678'}
                />
              </div>

              <div>
                <Label htmlFor="modal-licenseExpiryDate">{t('profile.licenseExpiryDate') || 'Fecha de Vencimiento'}</Label>
                <Input
                  id="modal-licenseExpiryDate"
                  type="date"
                  value={licenseFormData.licenseExpiryDate}
                  onChange={(e) => setLicenseFormData({ ...licenseFormData, licenseExpiryDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="modal-licenseIssuedBy">{t('profile.licenseIssuedBy') || 'Emitida por'}</Label>
                <Input
                  id="modal-licenseIssuedBy"
                  value={licenseFormData.licenseIssuedBy}
                  onChange={(e) => setLicenseFormData({ ...licenseFormData, licenseIssuedBy: e.target.value })}
                  placeholder={t('profile.licenseIssuedByPlaceholder') || 'Ej: Municipalidad de Santiago'}
                />
              </div>
            </div>

            {/* Documentos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('profile.documents') || 'Documentos'}</h3>
              
              {documents.map((doc) => (
                <div key={doc.type} className="space-y-2">
                  <Label>
                    {doc.type === DriverDocumentTypeEnum.DRIVER_LICENSE_FRONT
                      ? (t('profile.driverLicenseFront') || 'Licencia de Conducir (Frente)')
                      : (t('profile.driverLicenseBack') || 'Licencia de Conducir (Reverso)')}
                  </Label>
                  
                  {doc.file ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{doc.fileName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDocument(doc.type)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleDocumentUpload(doc.type, file)
                          }
                        }}
                        className="flex-1"
                        disabled={isUpdatingDocuments}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseUpdateModal}
              disabled={isUpdatingDocuments}
            >
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button
              type="button"
              onClick={handleSubmitDocuments}
              disabled={isUpdatingDocuments}
            >
              {isUpdatingDocuments ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving') || 'Guardando...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('profile.submitForReview') || 'Enviar para Revisión'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

