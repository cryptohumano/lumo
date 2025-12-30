/**
 * Contexto para gestión de tema (claro/oscuro)
 * Soporta detección automática del sistema y selección manual
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Cargar desde localStorage o usar 'system' por defecto
    // Verificar que estamos en el navegador antes de acceder a localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme | null
      return saved || 'system'
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    // Verificar que estamos en el navegador
    if (typeof window === 'undefined') {
      return 'light'
    }
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  })

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remover clases anteriores
    root.classList.remove('light', 'dark')
    
    // Aplicar tema resuelto
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    // Escuchar cambios en la preferencia del sistema
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        setResolvedTheme(e.matches ? 'dark' : 'light')
      }
      
      // Verificar inmediatamente
      handleChange(mediaQuery)
      
      // Escuchar cambios
      mediaQuery.addEventListener('change', handleChange)
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    } else {
      setResolvedTheme(theme)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

