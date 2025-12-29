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
import { Settings as SettingsIcon, Save, ArrowLeft, MapPin } from 'lucide-react'
import { Currency } from '@/types'
import { api } from '@/services/api'
import { getCountryName } from '@/services/locationService'

export default function Settings() {
  const { t } = useTranslation()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
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
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    try {
      setIsSaving(true)
      
      const updatedUser = await api.updateProfile({
        name: formData.name,
        phone: formData.phone || undefined,
        preferredCurrency: formData.preferredCurrency,
      })

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
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.countryDescription') || 'País detectado automáticamente según tu ubicación'}
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

