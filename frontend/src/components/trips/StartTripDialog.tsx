/**
 * Diálogo para iniciar un viaje
 * Permite ingresar PIN o escanear QR code
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Key, QrCode, MapPin, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Trip } from '@/types'
import { QrScanner } from '@/components/qr/QrScanner'

interface StartTripDialogProps {
  trip: Trip
  onStart: () => void
  trigger: React.ReactNode
}

export function StartTripDialog({ trip, onStart, trigger }: StartTripDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [method, setMethod] = useState<'pin' | 'qr'>('pin')
  const [isStarting, setIsStarting] = useState(false)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [useGps, setUseGps] = useState(true)
  const [showQrScanner, setShowQrScanner] = useState(false)

  // Obtener ubicación GPS del conductor
  useEffect(() => {
    if (open && useGps) {
      getDriverLocation()
    }
  }, [open, useGps])

  const getDriverLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalización no disponible en este navegador')
      setUseGps(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
        setLocationError(null)
      },
      (error) => {
        console.error('Error getting location:', error)
        setLocationError('No se pudo obtener tu ubicación. Puedes continuar sin GPS.')
        setUseGps(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleStartTrip = async () => {
    if (method === 'pin' && !pin.trim()) {
      toast.error(t('driver.pinRequired') || 'Debes ingresar el PIN')
      return
    }

    if (method === 'qr' && !qrCode.trim()) {
      toast.error(t('driver.qrRequired') || 'Debes escanear el código QR')
      return
    }

    try {
      setIsStarting(true)
      
      const options: any = {}
      if (method === 'pin') {
        options.pin = pin.trim()
      } else {
        options.qrCode = qrCode.trim()
      }

      // Agregar GPS si está disponible
      if (useGps && driverLocation) {
        options.driverLatitude = driverLocation.lat
        options.driverLongitude = driverLocation.lon
      }

      const { api } = await import('@/services/api')
      await api.startTrip(trip.id, options)
      
      toast.success(t('driver.tripStarted') || 'Viaje iniciado correctamente')
      setOpen(false)
      setPin('')
      setQrCode('')
      onStart()
    } catch (error: any) {
      console.error('Error starting trip:', error)
      toast.error(error.message || t('driver.startError') || 'Error al iniciar viaje')
    } finally {
      setIsStarting(false)
    }
  }

  const handleQrScan = () => {
    setShowQrScanner(true)
  }

  const handleQrScanSuccess = (decodedText: string) => {
    try {
      // El QR contiene un JSON con { tripId, pin, type, timestamp }
      const qrData = JSON.parse(decodedText)
      if (qrData.pin) {
        setQrCode(decodedText) // Guardar el JSON completo para validación
        setShowQrScanner(false)
        toast.success(t('driver.qrScanned') || 'Código QR escaneado correctamente')
      } else {
        toast.error(t('driver.invalidQr') || 'Código QR inválido')
      }
    } catch (error) {
      // Si no es JSON, intentar usar directamente
      setQrCode(decodedText)
      setShowQrScanner(false)
      toast.success(t('driver.qrScanned') || 'Código QR escaneado correctamente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('driver.startTrip') || 'Iniciar Viaje'}</DialogTitle>
          <DialogDescription>
            {t('driver.startTripDescription') || 'Verifica tu ubicación e ingresa el PIN o escanea el código QR para iniciar el viaje'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del viaje */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-semibold mb-1">{trip.tripNumber}</div>
            <div className="text-xs text-muted-foreground line-clamp-1">{trip.originAddress}</div>
          </div>

          {/* Estado de GPS */}
          {useGps && (
            <Alert variant={locationError ? 'destructive' : 'default'}>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                {locationError ? (
                  <div>
                    <div className="font-semibold mb-1">{locationError}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseGps(false)}
                      className="mt-2"
                    >
                      {t('driver.continueWithoutGps') || 'Continuar sin GPS'}
                    </Button>
                  </div>
                ) : driverLocation ? (
                  t('driver.locationReady') || 'Ubicación obtenida correctamente'
                ) : (
                  t('driver.gettingLocation') || 'Obteniendo ubicación...'
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Método de verificación */}
          <Tabs value={method} onValueChange={(v) => setMethod(v as 'pin' | 'qr')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pin">
                <Key className="h-4 w-4 mr-2" />
                {t('driver.pin') || 'PIN'}
              </TabsTrigger>
              <TabsTrigger value="qr">
                <QrCode className="h-4 w-4 mr-2" />
                {t('driver.qrCode') || 'QR'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pin" className="space-y-4">
              <div>
                <Label htmlFor="pin">{t('driver.enterPin') || 'Ingresa el PIN'}</Label>
                <Input
                  id="pin"
                  type="text"
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="mt-2 text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('driver.pinFromPassenger') || 'Pide el PIN al pasajero'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              {showQrScanner ? (
                <QrScanner
                  onScanSuccess={handleQrScanSuccess}
                  onClose={() => setShowQrScanner(false)}
                />
              ) : (
                <div>
                  <Label htmlFor="qrCode">{t('driver.scanQrCode') || 'Escanear código QR'}</Label>
                  <div className="mt-2 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleQrScan}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {t('driver.scanQr') || 'Escanear QR'}
                    </Button>
                    <div className="text-xs text-muted-foreground text-center">o</div>
                    <Input
                      id="qrCode"
                      type="text"
                      placeholder={t('driver.pasteQrCode') || 'Pega el código QR aquí (JSON)'}
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('driver.qrFromPassenger') || 'Escanea el código QR del pasajero o pega el JSON'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={isStarting}
            >
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button
              onClick={handleStartTrip}
              className="flex-1"
              disabled={isStarting || (method === 'pin' && !pin) || (method === 'qr' && !qrCode)}
            >
              {isStarting
                ? t('common.loading') || 'Iniciando...'
                : t('driver.startTrip') || 'Iniciar Viaje'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

