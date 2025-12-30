/**
 * Componente para mostrar el código QR de un pago
 * Permite al conductor/host mostrar el QR para que el pasajero lo escanee
 */

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { QrCode, Download, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface PaymentQrDisplayProps {
  paymentId: string
  onClose?: () => void
}

export function PaymentQrDisplay({ paymentId, onClose }: PaymentQrDisplayProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQrCode()
  }, [paymentId])

  const loadQrCode = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.getPaymentQrCode(paymentId)
      setQrCode(response.qrCode)
    } catch (err: any) {
      console.error('Error cargando QR de pago:', err)
      setError(err.message || 'Error al cargar el código QR')
      toast.error('Error al cargar QR', {
        description: err.message || 'No se pudo generar el código QR',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (!qrCode) return

    const link = document.createElement('a')
    link.href = qrCode
    link.download = `payment-qr-${paymentId.slice(0, 8)}.png`
    link.click()
    toast.success('QR descargado')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Generando código QR...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!qrCode) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No se pudo generar el código QR</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Código QR de Pago</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center space-y-4 p-6 border-2 border-primary/20 rounded-lg bg-background">
        <div className="p-4 bg-white rounded-lg">
          <img
            src={qrCode}
            alt="Código QR de Pago"
            className="w-64 h-64"
          />
        </div>
        
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Muestra este código QR al pasajero para que pueda escanearlo y realizar el pago
        </p>

        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            onClick={handleDownload}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar QR
          </Button>
          <Button
            variant="outline"
            onClick={loadQrCode}
            className="flex-1"
          >
            Regenerar QR
          </Button>
        </div>
      </div>
    </div>
  )
}

