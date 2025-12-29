/**
 * Botón para instalar la PWA
 * Muestra un botón cuando la app puede ser instalada
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWAButton() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Escuchar cuando se instala
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Mostrar el prompt de instalación
    await deferredPrompt.prompt()

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA')
    } else {
      console.log('Usuario rechazó instalar la PWA')
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Guardar en localStorage para no mostrar de nuevo por un tiempo
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // No mostrar si ya está instalada o si el usuario la rechazó recientemente
  if (isInstalled) {
    return null
  }

  const dismissedTime = localStorage.getItem('pwa-install-dismissed')
  if (dismissedTime) {
    const dismissed = parseInt(dismissedTime)
    const daysSinceDismissed = (Date.now() - dismissed) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissed < 7) {
      // No mostrar por 7 días si fue rechazada
      return null
    }
  }

  if (!showInstallPrompt || !deferredPrompt) {
    return null
  }

  return (
    <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pwa.installTitle') || 'Instalar Operations'}</DialogTitle>
          <DialogDescription>
            {t('pwa.installDescription') || 
              'Instala Operations en tu dispositivo para acceder rápidamente y recibir notificaciones incluso cuando estés fuera del navegador.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t('pwa.benefit1') || 'Acceso rápido desde la pantalla de inicio'}</li>
            <li>{t('pwa.benefit2') || 'Funciona sin conexión'}</li>
            <li>{t('pwa.benefit3') || 'Notificaciones push incluso fuera del navegador'}</li>
            <li>{t('pwa.benefit4') || 'Experiencia como app nativa'}</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            <X className="h-4 w-4 mr-2" />
            {t('common.later') || 'Ahora no'}
          </Button>
          <Button onClick={handleInstallClick}>
            <Download className="h-4 w-4 mr-2" />
            {t('pwa.install') || 'Instalar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

