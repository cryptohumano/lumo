import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Register() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    whatsapp: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.passwordMismatch') || 'Las contraseñas no coinciden')
      return
    }

    // Validar formato de WhatsApp si se proporciona
    if (formData.whatsapp && !formData.whatsapp.startsWith('+')) {
      toast.error(t('auth.whatsappFormatError') || 'El número de WhatsApp debe incluir el prefijo internacional (ej: +56912345678)')
      return
    }

    setIsLoading(true)
    
    try {
      await register(formData.name, formData.email, formData.password, formData.whatsapp || undefined)
      toast.success(t('auth.registerSuccess'))
      navigate('/')
    } catch (error) {
      toast.error(t('auth.registerError'))
      console.error('Register error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.register')}</CardTitle>
          <CardDescription>
            {t('auth.registerDescription') || 'Regístrate para comenzar a usar la plataforma'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.namePlaceholder') || 'Tu nombre'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder') || 'tu@email.com'}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                {t('auth.whatsapp') || 'WhatsApp (Opcional)'}
                <span className="text-xs text-muted-foreground ml-2">
                  {t('auth.whatsappHint') || 'Con prefijo internacional (ej: +56912345678)'}
                </span>
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+56912345678"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('auth.register')}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">{t('auth.hasAccount')} </span>
              <Link to="/login" className="text-primary hover:underline">
                {t('auth.signIn')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

