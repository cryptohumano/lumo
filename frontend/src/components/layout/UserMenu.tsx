import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, Settings, MapPin, Moon, Sun, Monitor, UserCircle, AlertTriangle } from 'lucide-react'
import { getCountryName } from '@/services/locationService'
import { useTheme } from '@/contexts/ThemeContext'
import { UserRole } from '@/types'

export default function UserMenu() {
  const { user, logout, changeActiveRole } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
  }

  const getRoleLabel = (role: string) => {
    return t(`roles.${role.toLowerCase()}`)
  }

  // Obtener todos los roles disponibles del usuario
  // Construir la lista de roles desde userRoles si está disponible, sino desde roles
  let allUserRoles: UserRole[] = []
  
  if (user.userRoles && user.userRoles.length > 0) {
    // Si tenemos userRoles del backend, construir la lista completa
    allUserRoles = [
      user.role,
      ...user.userRoles.map(ur => ur.role)
    ]
  } else if (user.roles && user.roles.length > 0) {
    // Si tenemos roles calculados, usarlos
    allUserRoles = user.roles
  } else {
    // Fallback: solo el rol principal
    allUserRoles = user.role ? [user.role] : []
  }
  
  // Eliminar duplicados
  const availableRoles = Array.from(new Set(allUserRoles))
  const currentActiveRole = user.activeRole || user.role

  // Debug: verificar roles
  console.log('🔍 UserMenu Debug:', {
    userRole: user.role,
    activeRole: user.activeRole,
    roles: user.roles,
    userRoles: user.userRoles,
    allUserRoles,
    availableRoles,
    availableRolesLength: availableRoles.length,
    shouldShowSelector: availableRoles.length > 1
  })

  const handleRoleChange = async (newRole: UserRole) => {
    try {
      await changeActiveRole(newRole)
      // El usuario se actualizará automáticamente en el contexto
      // Navegar al dashboard correspondiente al nuevo rol
      const dashboardRoutes: Record<UserRole, string> = {
        PASSENGER: '/passenger/dashboard',
        DRIVER: '/driver/dashboard',
        HOST: '/host/dashboard',
        DISPATCHER: '/dispatcher/dashboard',
        SUPPORT: '/support/dashboard',
        MODERATOR: '/moderator/dashboard',
        ADMIN: '/admin/dashboard',
        OPERATOR: '/admin/dashboard',
        AUTHORITY: '/authority/dashboard',
      }
      
      const dashboardRoute = dashboardRoutes[newRole] || '/'
      navigate(dashboardRoute)
    } catch (error) {
      console.error('Error cambiando rol:', error)
      alert('Error al cambiar el rol. Por favor, intenta nuevamente.')
    }
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full touch-manipulation"
          style={{ touchAction: 'manipulation' }}
        >
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 z-50" 
        align="end" 
        sideOffset={5}
        side="bottom"
        alignOffset={0}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <div className="pt-1 flex gap-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {getRoleLabel(currentActiveRole)}
              </Badge>
              {availableRoles.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  {availableRoles.length} roles
                </Badge>
              )}
              {user.country && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {getCountryName(user.country || '')}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.length > 1 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span className="text-xs">{t('common.role') || 'Rol Activo'}</span>
            </DropdownMenuLabel>
            {availableRoles.map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleChange(role)}
                className={currentActiveRole === role ? 'bg-accent' : ''}
              >
                {getRoleLabel(role)}
                {currentActiveRole === role && ' ✓'}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-xs">{t('common.language') || 'Idioma'}</span>
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => changeLanguage('es')}>
          Español
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('pt')}>
          Português
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          <span className="text-xs">{t('common.theme') || 'Tema'}</span>
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="h-4 w-4 mr-2" />
          {t('theme.light') || 'Claro'}
          {theme === 'light' && ' ✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="h-4 w-4 mr-2" />
          {t('theme.dark') || 'Oscuro'}
          {theme === 'dark' && ' ✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="h-4 w-4 mr-2" />
          {t('theme.system') || 'Sistema'}
          {theme === 'system' && ' ✓'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => {
          const role = currentActiveRole
          const profileRoutes: Record<string, string> = {
            PASSENGER: '/passenger/profile',
            DRIVER: '/driver/profile',
            HOST: '/host/profile',
            DISPATCHER: '/dispatcher/profile',
            SUPPORT: '/support/profile',
            MODERATOR: '/moderator/profile',
            ADMIN: '/admin/profile',
          }
          const profileRoute = profileRoutes[role] || '/settings'
          navigate(profileRoute)
        }}>
          <UserCircle className="h-4 w-4 mr-2" />
          {t('profile.title') || 'Mi Perfil'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/emergencies')}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          {t('navigation.emergencies') || 'Emergencias'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/report-emergency')}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          {t('emergency.report.title') || 'Reportar Emergencia'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          {t('navigation.settings') || 'Configuración'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          {t('auth.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

