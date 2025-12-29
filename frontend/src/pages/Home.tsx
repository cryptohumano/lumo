import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation, Car, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react'
import { UserRole } from '@/types'

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleRequestTrip = () => {
    if (user) {
      // Si tiene rol de pasajero, ir al dashboard
      if (user.roles?.includes(UserRole.PASSENGER) || user.role === UserRole.PASSENGER) {
        navigate('/passenger/request-trip')
      } else {
        // Si no tiene rol de pasajero, registrar primero
        navigate('/register')
      }
    } else {
      // No está logueado, ir a login con redirect
      navigate('/login?redirect=/passenger/request-trip')
    }
  }

  const handleBecomeDriver = () => {
    if (user) {
      // Si ya tiene rol de conductor, ir al dashboard
      if (user.roles?.includes(UserRole.DRIVER) || user.role === UserRole.DRIVER) {
        navigate('/driver/dashboard')
      } else {
        // Si no tiene rol de conductor, iniciar onboarding
        navigate('/driver/onboarding')
      }
    } else {
      // No está logueado, ir a registro con redirect
      navigate('/register?redirect=/driver/onboarding')
    }
  }

  const handleBecomeHost = () => {
    if (user) {
      // Si ya tiene rol de host, ir al dashboard (si existe)
      if (user.roles?.includes(UserRole.HOST) || user.role === UserRole.HOST) {
        navigate('/host/dashboard')
      } else {
        // Si no tiene rol de host, mostrar mensaje o iniciar proceso
        navigate('/host/onboarding')
      }
    } else {
      // No está logueado, ir a registro con redirect
      navigate('/register?redirect=/host/onboarding')
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          {t('common.welcome') || 'Bienvenido a Operations'}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('common.subtitle') || 'Tu plataforma de transporte confiable y segura'}
        </p>
      </div>

      {/* Main Actions Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Request Trip Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleRequestTrip}>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Navigation className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">{t('passenger.title') || 'Solicitar Viaje'}</CardTitle>
            </div>
            <CardDescription>
              {t('passenger.description') || 'Solicita un viaje rápido y seguro a tu destino'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg">
              {t('passenger.requestTrip') || 'Solicitar Viaje'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Become Driver Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20" onClick={handleBecomeDriver}>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">{t('driver.title') || 'Ser Conductor'}</CardTitle>
            </div>
            <CardDescription>
              {t('driver.description') || 'Únete como conductor y genera ingresos con tu vehículo'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" size="lg">
              {t('driver.becomeDriver') || 'Ser Conductor'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {user && (user.roles?.includes(UserRole.DRIVER) || user.role === UserRole.DRIVER) && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Ya eres conductor
              </p>
            )}
          </CardContent>
        </Card>

        {/* Become Host Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleBecomeHost}>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">{t('host.title') || 'Ser Anfitrión'}</CardTitle>
            </div>
            <CardDescription>
              {t('host.description') || 'Crea experiencias únicas y comparte tu región'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" size="lg">
              {t('host.createExperience') || 'Crear Experiencia'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info Section */}
      {!user && (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            {t('common.notLoggedIn') || '¿No tienes cuenta?'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/login')}>
              {t('auth.login') || 'Iniciar Sesión'}
            </Button>
            <Button onClick={() => navigate('/register')}>
              {t('auth.register') || 'Registrarse'}
            </Button>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="mt-16 grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('home.features.safe') || 'Seguro'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('home.features.safeDescription') || 'Todos nuestros conductores están verificados y sus vehículos aprobados'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('home.features.fast') || 'Rápido'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('home.features.fastDescription') || 'Solicita un viaje y encuentra un conductor en minutos'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('home.features.reliable') || 'Confiable'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('home.features.reliableDescription') || 'Seguimiento en tiempo real y pagos seguros'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

