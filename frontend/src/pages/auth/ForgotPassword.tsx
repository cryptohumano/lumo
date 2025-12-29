import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const { forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [isLoading, setIsLoading] = useState(false)

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      await forgotPassword(email)
      toast.success(t('auth.passwordResetEmailSent') || 'Si el email existe, recibirás instrucciones para recuperar tu contraseña')
      setStep('reset')
    } catch (error) {
      toast.error(t('auth.passwordResetError') || 'Error al solicitar recuperación de contraseña')
      console.error('Forgot password error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordMismatch') || 'Las contraseñas no coinciden')
      return
    }

    if (newPassword.length < 6) {
      toast.error(t('auth.passwordTooShort') || 'La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)
    
    try {
      await resetPassword(email, newPassword)
      toast.success(t('auth.passwordResetSuccess') || 'Contraseña actualizada exitosamente')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.message || t('auth.passwordResetError') || 'Error al resetear contraseña')
      console.error('Reset password error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.forgotPassword') || 'Recuperar Contraseña'}</CardTitle>
          <CardDescription>
            {step === 'request' 
              ? (t('auth.forgotPasswordDescription') || 'Ingresa tu email para recibir instrucciones')
              : (t('auth.resetPasswordDescription') || 'Ingresa tu nueva contraseña')
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder') || 'tu@email.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('common.loading') : (t('auth.sendResetLink') || 'Enviar enlace de recuperación')}
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">
                  {t('auth.backToLogin') || 'Volver al inicio de sesión'}
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-display">{t('auth.email')}</Label>
                <Input
                  id="email-display"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('auth.newPassword') || 'Nueva Contraseña'}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword') || 'Confirmar Contraseña'}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('common.loading') : (t('auth.resetPassword') || 'Resetear Contraseña')}
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">
                  {t('auth.backToLogin') || 'Volver al inicio de sesión'}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


