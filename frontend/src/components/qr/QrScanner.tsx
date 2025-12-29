/**
 * Componente para escanear códigos QR usando la cámara del dispositivo
 * Compatible con PWA
 */

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { X, Camera, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void
  onClose: () => void
}

export function QrScanner({ onScanSuccess, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    return () => {
      // Limpiar el escáner al desmontar
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null
          })
          .catch(() => {
            scannerRef.current = null
          })
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      
      // Verificar permisos de cámara
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        stream.getTracks().forEach(track => track.stop()) // Detener inmediatamente para liberar
        setHasPermission(true)
      } catch (permError) {
        setHasPermission(false)
        setError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración de tu navegador.')
        return
      }

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' }, // Cámara trasera en móviles
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Éxito al escanear
          onScanSuccess(decodedText)
          stopScanning()
        },
        (errorMessage) => {
          // Ignorar errores de escaneo (solo mostrar si es crítico)
          if (errorMessage.includes('No MultiFormat Readers')) {
            setError('Error al inicializar el escáner QR')
          }
        }
      )

      setIsScanning(true)
    } catch (err: any) {
      console.error('Error starting QR scanner:', err)
      setError(err.message || 'Error al iniciar el escáner QR')
      setHasPermission(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
      setIsScanning(false)
    }
  }

  const handleClose = async () => {
    await stopScanning()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Escanear Código QR</h3>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasPermission === false && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Necesitas permitir el acceso a la cámara para escanear códigos QR.
            Por favor, verifica los permisos de tu navegador.
          </AlertDescription>
        </Alert>
      )}

      <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black" style={{ minHeight: '300px' }} />

      <div className="flex gap-2">
        {!isScanning ? (
          <Button onClick={startScanning} className="flex-1" size="lg">
            <Camera className="h-4 w-4 mr-2" />
            Iniciar Escáner
          </Button>
        ) : (
          <Button onClick={stopScanning} variant="outline" className="flex-1" size="lg">
            Detener Escáner
          </Button>
        )}
        <Button onClick={handleClose} variant="outline" size="lg">
          Cancelar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Apunta la cámara hacia el código QR del pasajero
      </p>
    </div>
  )
}

