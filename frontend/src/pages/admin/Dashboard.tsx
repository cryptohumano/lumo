import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  Settings,
  FileText,
  Car
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { useCurrency } from '@/hooks/useCurrency'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalTrips: number
  activeTrips: number
  completedTrips: number
  totalRevenue: number
  currency: string
  pendingTrips: number
  cancelledTrips: number
  pendingOnboardings: number
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { formatConvertedAmount, formatAmount } = useCurrency()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    totalRevenue: 0,
    currency: 'CLP',
    pendingTrips: 0,
    cancelledTrips: 0,
    pendingOnboardings: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [convertedRevenue, setConvertedRevenue] = useState<string>('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const currentRole = user.activeRole || user.role
    if (currentRole !== 'ADMIN') {
      toast.error('No tienes permisos para acceder a esta página')
      navigate('/')
      return
    }

    loadDashboardStats()
  }, [user, navigate])

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true)
      const data = await api.getAdminStats()
      setStats({
        totalUsers: data.totalUsers,
        activeUsers: data.activeUsers,
        totalTrips: data.totalTrips,
        activeTrips: data.activeTrips,
        completedTrips: data.completedTrips,
        totalRevenue: data.totalRevenue,
        currency: data.currency,
        pendingTrips: data.pendingTrips,
        cancelledTrips: data.cancelledTrips,
        pendingOnboardings: (data as any).pendingOnboardings || 0,
      })
      
      // Convertir revenue a la moneda preferida del usuario
      if (data.totalRevenue > 0) {
        const formatted = await formatConvertedAmount(data.totalRevenue, data.currency)
        setConvertedRevenue(formatted)
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      toast.error('Error al cargar estadísticas')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">{t('common.loading') || 'Cargando...'}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('admin.dashboard') || 'Panel de Administración'}</h1>
        <p className="text-muted-foreground">
          {t('admin.dashboardDescription') || 'Gestiona usuarios, viajes y configuración del sistema'}
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.totalUsers') || 'Total Usuarios'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} {t('admin.active') || 'activos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.totalTrips') || 'Total Viajes'}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTrips} {t('admin.active') || 'activos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.totalRevenue') || 'Ingresos Totales'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {convertedRevenue || formatAmount(stats.totalRevenue, stats.currency)}
            </div>
            {convertedRevenue && stats.currency !== user?.preferredCurrency && (
              <p className="text-xs text-muted-foreground">
                {formatAmount(stats.totalRevenue, stats.currency)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.fromCompletedTrips') || 'de viajes completados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.completedTrips') || 'Viajes Completados'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTrips}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.thisMonth') || 'este mes'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas de viajes */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('admin.pendingTrips') || 'Viajes Pendientes'}
            </CardTitle>
            <CardDescription>
              {stats.pendingTrips} {t('admin.tripsAwaiting') || 'viajes esperando confirmación'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/admin/trips?status=PENDING')}
            >
              {t('admin.viewPending') || 'Ver Pendientes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              {t('admin.cancelledTrips') || 'Viajes Cancelados'}
            </CardTitle>
            <CardDescription>
              {stats.cancelledTrips} {t('admin.cancelledCount') || 'viajes cancelados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/admin/trips?status=CANCELLED')}
            >
              {t('admin.viewCancelled') || 'Ver Cancelados'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('admin.growth') || 'Crecimiento'}
            </CardTitle>
            <CardDescription>
              {t('admin.userGrowth') || 'Crecimiento de usuarios'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12%</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.vsLastMonth') || 'vs mes anterior'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('admin.manageUsers') || 'Gestionar Usuarios'}
            </CardTitle>
            <CardDescription>
              {t('admin.usersDescription') || 'Ver, crear y editar usuarios'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/admin/users')}
            >
              {t('admin.manageUsers') || 'Gestionar Usuarios'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('admin.manageTrips') || 'Gestionar Viajes'}
            </CardTitle>
            <CardDescription>
              {t('admin.tripsDescription') || 'Ver y gestionar todos los viajes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/admin/trips')}
            >
              {t('admin.viewTrips') || 'Ver Viajes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {t('admin.manageVehicles') || 'Gestionar Vehículos'}
            </CardTitle>
            <CardDescription>
              {t('admin.vehiclesDescription') || 'Aprobar o rechazar vehículos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/admin/vehicles')}
            >
              {t('admin.viewVehicles') || 'Ver Vehículos'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('admin.manageOnboarding') || 'Solicitudes de Conductores'}
              {stats.pendingOnboardings > 0 && (
                <span className="relative flex h-3 w-3 ml-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {t('admin.onboardingDescription') || 'Revisar y aprobar solicitudes de onboarding'}
              {stats.pendingOnboardings > 0 && (
                <span className="block mt-1 font-semibold text-primary">
                  {stats.pendingOnboardings} {t('admin.onboarding.pending') || 'pendiente(s)'}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/admin/onboarding')}
            >
              {t('admin.viewOnboarding') || 'Ver Solicitudes'}
              {stats.pendingOnboardings > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {stats.pendingOnboardings}
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

