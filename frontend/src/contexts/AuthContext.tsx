import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/types'
import { UserRole } from '@/types'
import { detectUserLocation } from '@/services/locationService'
import { api } from '@/services/api'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, whatsapp?: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, newPassword: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  changeActiveRole: (role: string) => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Cargar token y usuario del localStorage al iniciar
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser)
      // Asegurar que roles esté definido (compatibilidad con datos antiguos)
      if (!parsedUser.roles) {
        parsedUser.roles = [parsedUser.role]
      }
      setToken(storedToken)
      setUser(parsedUser)
      
      // Refrescar usuario desde el backend para obtener roles actualizados
      api.getProfile()
        .then((freshUser) => {
          // Construir roles desde userRoles si está disponible
          const allRoles = freshUser.userRoles 
            ? [freshUser.role, ...freshUser.userRoles.map((ur: { role: UserRole }) => ur.role)]
            : (freshUser.roles || [freshUser.role])
          const uniqueRoles = Array.from(new Set(allRoles)) as UserRole[]
          
          const updatedUser: User = {
            ...freshUser,
            roles: uniqueRoles,
            activeRole: (freshUser.activeRole || freshUser.role) as UserRole,
            userRoles: freshUser.userRoles || []
          }
          
          setUser(updatedUser)
          localStorage.setItem('user', JSON.stringify(updatedUser))
          console.log('✅ Usuario actualizado desde backend:', updatedUser)
        })
        .catch((error) => {
          console.error('Error refrescando usuario:', error)
          // Si falla, usar el usuario del localStorage
        })
      
      // Si el usuario no tiene país, detectarlo
      if (!parsedUser.country) {
        detectUserLocation()
          .then((location) => {
            api.updateProfile({ country: location.countryCode })
              .then((updatedUser) => {
                // Asegurar que roles esté definido
                if (!updatedUser.roles) {
                  updatedUser.roles = [updatedUser.role]
                }
                setUser(updatedUser)
                localStorage.setItem('user', JSON.stringify(updatedUser))
              })
              .catch((error) => {
                console.log('No se pudo actualizar el país:', error)
              })
          })
          .catch((error) => {
            console.log('No se pudo detectar la ubicación:', error)
          })
      }
    }
    
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      // Detectar automáticamente la URL del backend
      let apiUrl = import.meta.env.VITE_API_URL
      const hostname = window.location.hostname
      
      // En desarrollo, siempre usar localhost:3000 si estamos en localhost
      if (import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        apiUrl = 'http://localhost:3000/api'
      } else if (!apiUrl || apiUrl === 'undefined') {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          apiUrl = 'http://localhost:3000/api'
        } else {
          // Estamos en la red, usar la IP del servidor
          apiUrl = `http://${hostname}:3000/api`
        }
      } else if (apiUrl.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // Si el env tiene localhost pero estamos en la red, reemplazar
        apiUrl = apiUrl.replace('localhost', hostname)
      }
      
      // Si la URL contiene lumo.peranto.app pero estamos en desarrollo local, usar localhost
      if (import.meta.env.DEV && apiUrl.includes('lumo.peranto.app') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        apiUrl = 'http://localhost:3000/api'
      }
      
      // Forzar HTTP si la URL es HTTPS (para evitar errores de certificado)
      if (apiUrl.startsWith('https://')) {
        apiUrl = apiUrl.replace('https://', 'http://')
      }
      
      console.log('Login - API URL:', apiUrl, 'Hostname:', hostname, 'DEV:', import.meta.env.DEV)
      
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      
      // Detectar ubicación del usuario si no tiene país guardado
      let userCountry = data.user.country || 'CL'
      if (!data.user.country) {
        console.log('🔍 Usuario sin país, detectando ubicación...')
        try {
          const location = await detectUserLocation()
          userCountry = location.countryCode
          console.log(`✅ País detectado: ${location.country} (${userCountry})`)
          // Actualizar el país del usuario en el backend
          try {
            await api.updateProfile({ country: userCountry })
            console.log('✅ País actualizado en el backend')
          } catch (updateError) {
            console.error('❌ No se pudo actualizar el país del usuario:', updateError)
          }
        } catch (locationError) {
          console.error('❌ No se pudo detectar la ubicación:', locationError)
        }
      } else {
        console.log(`✅ Usuario ya tiene país configurado: ${userCountry}`)
      }

      // Obtener todos los roles (principal + adicionales)
      const allRoles = data.user.userRoles 
        ? [data.user.role, ...data.user.userRoles.map((ur: { role: UserRole }) => ur.role)]
        : [data.user.role]
      // Eliminar duplicados
      const uniqueRoles = Array.from(new Set(allRoles)) as UserRole[]

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone || null,
        avatar: data.user.avatar || null,
        role: data.user.role as UserRole,
        activeRole: (data.user.activeRole || data.user.role) as UserRole,
        roles: uniqueRoles,
        preferredCurrency: (data.user.preferredCurrency || 'CLP') as any,
        country: userCountry,
        isActive: data.user.isActive ?? true,
        isVerified: data.user.isVerified ?? false,
        isEmailVerified: data.user.isEmailVerified ?? false,
        createdAt: data.user.createdAt || new Date().toISOString(),
        updatedAt: data.user.updatedAt || new Date().toISOString(),
        userRoles: data.user.userRoles || [],
      }

      setToken(data.token)
      setUser(userData)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (name: string, email: string, password: string, whatsapp?: string) => {
    try {
      // Detectar automáticamente la URL del backend
      let apiUrl = import.meta.env.VITE_API_URL
      const hostname = window.location.hostname
      
      // En desarrollo, siempre usar localhost:3000 si estamos en localhost
      if (import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        apiUrl = 'http://localhost:3000/api'
      } else if (!apiUrl || apiUrl === 'undefined') {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          apiUrl = 'http://localhost:3000/api'
        } else {
          // Estamos en la red, usar la IP del servidor
          apiUrl = `http://${hostname}:3000/api`
        }
      } else if (apiUrl.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // Si el env tiene localhost pero estamos en la red, reemplazar
        apiUrl = apiUrl.replace('localhost', hostname)
      }
      
      // Si la URL contiene lumo.peranto.app pero estamos en desarrollo local, usar localhost
      if (import.meta.env.DEV && apiUrl.includes('lumo.peranto.app') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        apiUrl = 'http://localhost:3000/api'
      }
      
      // Forzar HTTP si la URL es HTTPS (para evitar errores de certificado)
      if (apiUrl.startsWith('https://')) {
        apiUrl = apiUrl.replace('https://', 'http://')
      }
      
      console.log('Register - API URL:', apiUrl, 'Hostname:', hostname, 'DEV:', import.meta.env.DEV)
      
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, phone: whatsapp }),
      })

      if (!response.ok) {
        throw new Error('Registration failed')
      }

      const data = await response.json()
      
      // Detectar ubicación del usuario al registrarse
      let userCountry = 'CL'
      try {
        const location = await detectUserLocation()
        userCountry = location.countryCode
        // Actualizar el país del usuario en el backend
        try {
          await api.updateProfile({ country: userCountry })
        } catch (updateError) {
          console.log('No se pudo actualizar el país del usuario:', updateError)
        }
      } catch (locationError) {
        console.log('No se pudo detectar la ubicación:', locationError)
      }

      // Obtener todos los roles (principal + adicionales)
      const allRoles = data.user.userRoles 
        ? [data.user.role, ...data.user.userRoles.map((ur: { role: UserRole }) => ur.role)]
        : [data.user.role]
      // Eliminar duplicados
      const uniqueRoles = Array.from(new Set(allRoles)) as UserRole[]

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone || null,
        avatar: data.user.avatar || null,
        role: data.user.role as UserRole,
        activeRole: (data.user.activeRole || data.user.role) as UserRole,
        roles: uniqueRoles,
        preferredCurrency: (data.user.preferredCurrency || 'CLP') as any,
        country: userCountry,
        isActive: data.user.isActive ?? true,
        isVerified: data.user.isVerified ?? false,
        isEmailVerified: data.user.isEmailVerified ?? false,
        createdAt: data.user.createdAt || new Date().toISOString(),
        updatedAt: data.user.updatedAt || new Date().toISOString(),
        userRoles: data.user.userRoles || [],
      }

      setToken(data.token)
      setUser(userData)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      // Detectar automáticamente la URL del backend
      let apiUrl = import.meta.env.VITE_API_URL
      const hostname = window.location.hostname
      
      // En desarrollo, siempre usar localhost:3000 si estamos en localhost
      if (import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        apiUrl = 'http://localhost:3000/api'
      } else if (!apiUrl || apiUrl === 'undefined') {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          apiUrl = 'http://localhost:3000/api'
        } else {
          apiUrl = `http://${hostname}:3000/api`
        }
      } else if (apiUrl.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        apiUrl = apiUrl.replace('localhost', hostname)
      }
      
      // Si la URL contiene lumo.peranto.app pero estamos en desarrollo local, usar localhost
      if (import.meta.env.DEV && apiUrl.includes('lumo.peranto.app') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        apiUrl = 'http://localhost:3000/api'
      }
      
      // Forzar HTTP si la URL es HTTPS (para evitar errores de certificado)
      if (apiUrl.startsWith('https://')) {
        apiUrl = apiUrl.replace('https://', 'http://')
      }

      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Failed to request password reset')
      }

      await response.json()
    } catch (error) {
      console.error('Forgot password error:', error)
      throw error
    }
  }

  const resetPassword = async (email: string, newPassword: string) => {
    try {
      // Detectar automáticamente la URL del backend
      let apiUrl = import.meta.env.VITE_API_URL
      const hostname = window.location.hostname
      
      // En desarrollo, siempre usar localhost:3000 si estamos en localhost
      if (import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        apiUrl = 'http://localhost:3000/api'
      } else if (!apiUrl || apiUrl === 'undefined') {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          apiUrl = 'http://localhost:3000/api'
        } else {
          apiUrl = `http://${hostname}:3000/api`
        }
      } else if (apiUrl.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        apiUrl = apiUrl.replace('localhost', hostname)
      }
      
      // Si la URL contiene lumo.peranto.app pero estamos en desarrollo local, usar localhost
      if (import.meta.env.DEV && apiUrl.includes('lumo.peranto.app') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        apiUrl = 'http://localhost:3000/api'
      }
      
      // Forzar HTTP si la URL es HTTPS (para evitar errores de certificado)
      if (apiUrl.startsWith('https://')) {
        apiUrl = apiUrl.replace('https://', 'http://')
      }

      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, newPassword }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to reset password')
      }

      await response.json()
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  const changeActiveRole = async (role: string) => {
    try {
      const response = await api.changeActiveRole(role)
      // La respuesta puede ser { user: User } o directamente User
      const updatedUser = (response as any)?.user || response

      if (!updatedUser) {
        throw new Error('No se recibió información del usuario actualizado')
      }

      // Construir roles desde userRoles si está disponible
      const allRoles = updatedUser.userRoles 
        ? [updatedUser.role, ...updatedUser.userRoles.map((ur: { role: UserRole }) => ur.role)]
        : (updatedUser.roles || [updatedUser.role])
      const uniqueRoles = Array.from(new Set(allRoles)) as UserRole[]

      const userData: User = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone || null,
        avatar: updatedUser.avatar || null,
        role: updatedUser.role as UserRole,
        activeRole: (updatedUser.activeRole || updatedUser.role) as UserRole,
        roles: uniqueRoles,
        preferredCurrency: (updatedUser.preferredCurrency || 'CLP') as any,
        country: updatedUser.country || null,
        isActive: updatedUser.isActive ?? true,
        isVerified: updatedUser.isVerified ?? false,
        isEmailVerified: updatedUser.isEmailVerified ?? false,
        isRootAdmin: updatedUser.isRootAdmin ?? false,
        createdAt: updatedUser.createdAt || new Date().toISOString(),
        updatedAt: updatedUser.updatedAt || new Date().toISOString(),
        userRoles: updatedUser.userRoles || []
      }

      // Actualizar el usuario en el estado y localStorage
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      console.log('✅ Rol activo cambiado a:', role, userData)
    } catch (error) {
      console.error('Error cambiando rol activo:', error)
      throw error
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, forgotPassword, resetPassword, logout, setUser, changeActiveRole, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

