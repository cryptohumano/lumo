import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Settings as SettingsIcon, Save, ArrowLeft, MapPin, Wallet, CheckCircle2, XCircle, Trash2, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Currency } from '@/types'
import { api } from '@/services/api'
import { getCountryName, detectUserLocation } from '@/services/locationService'
import { WalletLinkButton } from '@/components/polkadot/WalletLinkButton'
import { PeopleChainIdentity } from '@/components/polkadot/PeopleChainIdentity'
import { usePolkadotWallet } from '@/hooks/usePolkadotWallet'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const { walletInfo, refreshBalance, isConnected } = usePolkadotWallet()
  const [isSaving, setIsSaving] = useState(false)
  const [walletLinked, setWalletLinked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isUnlinking, setIsUnlinking] = useState(false)
  
  // Obtener la palabra de confirmación según el idioma
  const confirmWord = t('settings.deleteConfirmWord') || 'ELIMINAR'
  const [localWalletInfo, setLocalWalletInfo] = useState<{
    address: string
    chain: string
    balance: string
    peopleChainIdentity?: string
    peopleChainIdentityFull?: any
  } | null>(null)
  const [privacySettings, setPrivacySettings] = useState({
    showDisplayName: true,
    showLegalName: false,
    showEmail: false,
    showWeb: false,
    showTwitter: false,
    showRiot: false,
    showJudgements: true,
    preferredName: 'display' as 'display' | 'legal',
  })
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    preferredCurrency: Currency.CLP,
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    setFormData({
      name: user.name,
      phone: user.phone || '',
      preferredCurrency: (user.preferredCurrency || Currency.CLP) as Currency,
    })

    // Cargar preferencias de privacidad de People Chain
    if (user.peopleChainShowDisplayName !== undefined) {
      setPrivacySettings({
        showDisplayName: user.peopleChainShowDisplayName ?? true,
        showLegalName: user.peopleChainShowLegalName ?? false,
        showEmail: user.peopleChainShowEmail ?? false,
        showWeb: user.peopleChainShowWeb ?? false,
        showTwitter: user.peopleChainShowTwitter ?? false,
        showRiot: user.peopleChainShowRiot ?? false,
        showJudgements: user.peopleChainShowJudgements ?? true,
        preferredName: (user.peopleChainPreferredName as 'display' | 'legal') || 'display',
      })
    }

    // Verificar si el usuario tiene wallet vinculada
    checkWalletStatus()
  }, [user, navigate])

  const checkWalletStatus = async () => {
    try {
      const response = await api.getWalletInfo()
      const hasWallet = response.hasWallet || false
      setWalletLinked(hasWallet)
      
      if (hasWallet && response.address) {
        // Actualizar estado local con la respuesta del servidor
        const newWalletInfo = {
          address: response.address,
          chain: response.chain || 'POLKADOT',
          balance: response.balance || '0',
          peopleChainIdentity: response.peopleChainIdentity,
          peopleChainIdentityFull: response.peopleChainIdentity,
        }
        setLocalWalletInfo(newWalletInfo)
        
        // Intentar refrescar balance del hook (puede fallar silenciosamente)
        try {
          await refreshBalance()
        } catch (error) {
          console.log('No se pudo refrescar balance:', error)
        }
      } else {
        // Si no hay wallet, limpiar el estado
        setLocalWalletInfo(null)
      }
    } catch (error: any) {
      console.error('Error verificando estado de wallet:', error)
      setWalletLinked(false)
      setLocalWalletInfo(null)
      // No mostrar error al usuario, simplemente asumir que no hay wallet
    }
  }

  const handleWalletLinked = async () => {
    // Refrescar información del usuario y wallet
    try {
      // Primero actualizar el usuario
      const updatedUser = await api.getProfile()
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      // Esperar un momento para que el backend procese
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Luego actualizar el estado de la wallet
      await checkWalletStatus()
      
      // Forzar actualización del hook de wallet si está conectado
      if (isConnected) {
        try {
          await refreshBalance()
        } catch (error) {
          console.log('No se pudo refrescar balance del hook:', error)
        }
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error)
    }
  }

  const handleUnlinkWallet = async () => {
    if (!confirm(t('settings.confirmUnlinkWallet') || '¿Estás seguro de desvincular tu wallet de Polkadot?')) {
      return
    }

    try {
      setIsUnlinking(true)
      await api.unlinkWallet()
      toast.success(t('settings.walletUnlinked') || 'Wallet desvinculada exitosamente')
      
      // Actualizar estado
      setWalletLinked(false)
      setLocalWalletInfo(null)
      
      // Actualizar usuario
      const updatedUser = await api.getProfile()
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    } catch (error: any) {
      console.error('Error desvinculando wallet:', error)
      toast.error(error.message || t('settings.unlinkWalletError') || 'Error al desvincular wallet')
    } finally {
      setIsUnlinking(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== confirmWord) {
      toast.error(t('settings.deleteConfirmError', { word: confirmWord }) || `Por favor escribe "${confirmWord}" para confirmar`)
      return
    }

    try {
      setIsDeleting(true)
      
      await api.deleteAccount()
      
      toast.success('Cuenta eliminada exitosamente')
      
      // Limpiar datos locales
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      
      // Redirigir al login
      setTimeout(() => {
        window.location.href = '/login'
      }, 1000)
    } catch (error: any) {
      console.error('Error eliminando cuenta:', error)
      toast.error(error.message || 'Error al eliminar cuenta')
      setIsDeleting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    try {
      setIsSaving(true)
      
      const updateData: {
        name?: string
        phone?: string
        preferredCurrency?: Currency
      } = {
        name: formData.name,
      }
      
      if (formData.phone) {
        updateData.phone = formData.phone
      }
      
      // Solo enviar preferredCurrency si tiene un valor válido
      if (formData.preferredCurrency && formData.preferredCurrency !== '') {
        updateData.preferredCurrency = formData.preferredCurrency
      }
      
      const updatedUser = await api.updateProfile(updateData)

      // Actualizar el usuario en el contexto
      setUser(updatedUser)
      
      // Actualizar localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser))

      toast.success(t('settings.saved') || 'Configuración guardada correctamente')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error(error.message || t('settings.saveError') || 'Error al guardar configuración')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return null
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
          <SettingsIcon className="h-8 w-8" />
          <h1 className="text-3xl font-bold">{t('navigation.settings') || 'Configuración'}</h1>
        </div>
        <p className="text-muted-foreground">
          {t('settings.description') || 'Gestiona tu información personal y preferencias'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.personalInfo') || 'Información Personal'}</CardTitle>
              <CardDescription>
                {t('settings.personalInfoDescription') || 'Actualiza tu información personal'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">{t('auth.name') || 'Nombre'}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('auth.namePlaceholder') || 'Tu nombre'}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('admin.phone') || 'Teléfono'}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div>
                <Label htmlFor="email">{t('auth.email') || 'Email'}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('settings.emailCannotChange') || 'El email no se puede cambiar'}
                </p>
              </div>
              {user.country && (
                <div>
                  <Label htmlFor="country">{t('settings.country') || 'País'}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="country"
                      value={getCountryName(user.country)}
                      disabled
                      className="bg-muted"
                    />
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          setIsSaving(true)
                          const location = await detectUserLocation()
                          const countryCode = location.countryCode || 'CL'
                          await api.updateProfile({ country: countryCode })
                          const updatedUser = await api.getProfile()
                          setUser(updatedUser)
                          localStorage.setItem('user', JSON.stringify(updatedUser))
                          toast.success(t('settings.countryUpdated') || 'País actualizado correctamente', {
                            description: `${location.country} (${countryCode})`
                          })
                        } catch (error: any) {
                          console.error('Error actualizando país:', error)
                          toast.error(error.message || t('settings.countryUpdateError') || 'Error al actualizar país')
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.countryDescription') || 'País detectado automáticamente según tu ubicación. Haz clic en "Actualizar" para re-detectar tu ubicación.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferencias */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.preferences') || 'Preferencias'}</CardTitle>
              <CardDescription>
                {t('settings.preferencesDescription') || 'Configura tus preferencias de la aplicación'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currency">{t('admin.preferredCurrency') || 'Moneda Preferida'}</Label>
                <Select
                  value={formData.preferredCurrency}
                  onValueChange={(value) => setFormData({ ...formData, preferredCurrency: value as Currency })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Currency).map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency} - {t(`currency.${currency}`) || currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.currencyDescription') || 'Selecciona la moneda para ver precios y cotizaciones'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Wallet de Polkadot */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <CardTitle>{t('settings.wallet') || 'Wallet de Polkadot'}</CardTitle>
              </div>
              <CardDescription>
                {t('settings.walletDescription') || 'Vincula tu wallet de Polkadot para autenticación y pagos con People Chain'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {walletLinked && localWalletInfo ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{t('settings.walletLinked') || 'Wallet vinculada'}</span>
                  </div>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('settings.walletAddress') || 'Dirección'}
                      </Label>
                      <p className="font-mono text-sm break-all">
                        {localWalletInfo.address}
                      </p>
                    </div>
                    {localWalletInfo.chain && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t('settings.chain') || 'Chain'}
                        </Label>
                        <p className="text-sm">{localWalletInfo.chain}</p>
                      </div>
                    )}
                    {localWalletInfo.balance && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t('settings.balance') || 'Balance'}
                        </Label>
                        <p className="text-sm">
                          {(Number(localWalletInfo.balance) / 1e10).toFixed(4)} DOT
                        </p>
                      </div>
                    )}
                  </div>
                  <PeopleChainIdentity address={localWalletInfo.address} />
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={handleUnlinkWallet}
                      disabled={isUnlinking}
                      className="w-full"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {isUnlinking
                        ? (t('settings.unlinking') || 'Desvinculando...')
                        : (t('settings.unlinkWallet') || 'Desvincular Wallet')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <XCircle className="h-5 w-5" />
                    <span>{t('settings.walletNotLinked') || 'No hay wallet vinculada'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.walletLinkDescription') || 'Vincula tu wallet de Polkadot para poder iniciar sesión y realizar pagos de forma segura.'}
                  </p>
                  <WalletLinkButton onLinked={handleWalletLinked} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferencias de Privacidad de People Chain */}
          {walletLinked && localWalletInfo && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <CardTitle>{t('settings.privacySettings') || 'Privacidad de People Chain'}</CardTitle>
                </div>
                <CardDescription>
                  {t('settings.privacySettingsDescription') || 'Controla qué información de tu identidad de People Chain se muestra a los conductores'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Nombre preferido */}
                  <div>
                    <Label>{t('settings.preferredName') || 'Nombre a mostrar'}</Label>
                    <Select
                      value={privacySettings.preferredName}
                      onValueChange={(value: 'display' | 'legal') => 
                        setPrivacySettings({ ...privacySettings, preferredName: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="display">
                          {t('settings.displayName') || 'Nombre de Display (Público)'}
                        </SelectItem>
                        <SelectItem value="legal">
                          {t('settings.legalName') || 'Nombre Legal'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('settings.preferredNameDescription') || 'Elige qué nombre se mostrará a los conductores en tus viajes'}
                    </p>
                  </div>

                  {/* Información a mostrar */}
                  <div className="space-y-3">
                    <Label>{t('settings.informationToShow') || 'Información a mostrar'}</Label>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm font-normal">
                          {t('settings.showDisplayName') || 'Mostrar nombre de display'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.showDisplayNameDescription') || 'Nombre público de People Chain'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacySettings.showDisplayName}
                        onChange={(e) => 
                          setPrivacySettings({ ...privacySettings, showDisplayName: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm font-normal">
                          {t('settings.showLegalName') || 'Mostrar nombre legal'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.showLegalNameDescription') || 'Nombre legal completo'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacySettings.showLegalName}
                        onChange={(e) => 
                          setPrivacySettings({ ...privacySettings, showLegalName: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm font-normal">
                          {t('settings.showEmail') || 'Mostrar email'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.showEmailDescription') || 'Dirección de correo electrónico'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacySettings.showEmail}
                        onChange={(e) => 
                          setPrivacySettings({ ...privacySettings, showEmail: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm font-normal">
                          {t('settings.showWeb') || 'Mostrar sitio web'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.showWebDescription') || 'URL de tu sitio web'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacySettings.showWeb}
                        onChange={(e) => 
                          setPrivacySettings({ ...privacySettings, showWeb: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm font-normal">
                          {t('settings.showTwitter') || 'Mostrar Twitter'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.showTwitterDescription') || 'Handle de Twitter'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacySettings.showTwitter}
                        onChange={(e) => 
                          setPrivacySettings({ ...privacySettings, showTwitter: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm font-normal">
                          {t('settings.showRiot') || 'Mostrar Riot/Matrix'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.showRiotDescription') || 'Identificador de Riot/Matrix'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacySettings.showRiot}
                        onChange={(e) => 
                          setPrivacySettings({ ...privacySettings, showRiot: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm font-normal">
                          {t('settings.showJudgements') || 'Mostrar verificaciones (Judgements)'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.showJudgementsDescription') || 'Estado de verificación de registradores'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacySettings.showJudgements}
                        onChange={(e) => 
                          setPrivacySettings({ ...privacySettings, showJudgements: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.updatePrivacySettings(privacySettings)
                        toast.success(t('settings.privacySettingsSaved') || 'Preferencias de privacidad guardadas')
                        // Actualizar usuario
                        const updatedUser = await api.getProfile()
                        setUser(updatedUser)
                      } catch (error: any) {
                        toast.error(error.message || 'Error al guardar preferencias')
                      }
                    }}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {t('settings.savePrivacySettings') || 'Guardar Preferencias de Privacidad'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zona de Peligro - Eliminar Cuenta */}
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">
                  {t('settings.dangerZone') || 'Zona de Peligro'}
                </CardTitle>
              </div>
              <CardDescription>
                {t('settings.dangerZoneDescription') || 'Acciones irreversibles que afectan tu cuenta'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    {t('settings.deleteAccount') || 'Eliminar Cuenta'}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('settings.deleteAccountDescription') || 
                      'Una vez que elimines tu cuenta, no podrás recuperarla. Todos tus datos, viajes y configuraciones serán eliminados permanentemente.'}
                  </p>
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" type="button">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('settings.deleteAccount') || 'Eliminar Cuenta'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-5 w-5" />
                          {t('settings.confirmDeleteAccount') || '¿Estás seguro de eliminar tu cuenta?'}
                        </DialogTitle>
                        <DialogDescription className="space-y-3 pt-2">
                          <p>
                            {t('settings.deleteAccountWarning') || 
                              'Esta acción es permanente y no se puede deshacer. Se eliminarán:'}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>{t('settings.deleteAccountItem1') || 'Tu perfil y toda tu información personal'}</li>
                            <li>{t('settings.deleteAccountItem2') || 'Todos tus viajes y reservas'}</li>
                            <li>{t('settings.deleteAccountItem3') || 'Tus vehículos registrados'}</li>
                            <li>{t('settings.deleteAccountItem4') || 'Tu historial y configuraciones'}</li>
                          </ul>
                          <div className="pt-4">
                            <Label htmlFor="delete-confirm" className="text-sm font-semibold">
                              {t('settings.typeToConfirm', { word: confirmWord }) || `Escribe "${confirmWord}" para confirmar:`}
                            </Label>
                            <Input
                              id="delete-confirm"
                              type="text"
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                              placeholder={confirmWord}
                              className="mt-2"
                              disabled={isDeleting}
                            />
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDeleteDialog(false)
                            setDeleteConfirmText('')
                          }}
                          disabled={isDeleting}
                        >
                          {t('common.cancel') || 'Cancelar'}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={isDeleting || deleteConfirmText !== confirmWord}
                        >
                          {isDeleting 
                            ? (t('common.deleting') || 'Eliminando...')
                            : (t('settings.deleteAccount') || 'Eliminar Cuenta')
                          }
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
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
    </div>
  )
}

