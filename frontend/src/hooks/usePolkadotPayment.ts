import { useState } from 'react'
import { api } from '../services/api'
import { toast } from 'sonner'
import type { ChainName } from '../services/polkadotService'

/**
 * Hook para manejar pagos con Polkadot
 * Proporciona funciones para procesar pagos y estados de carga
 */
export function usePolkadotPayment() {
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Procesa un pago después de recibir el hash de transacción
   * @param paymentId ID del pago
   * @param txHash Hash de la transacción en Polkadot
   * @param chain Chain donde se procesó la transacción
   * @param blockNumber Número de bloque (opcional)
   */
  const processPayment = async (
    paymentId: string,
    txHash: string,
    chain: ChainName,
    blockNumber?: string
  ) => {
    setIsLoading(true)
    try {
      await api.processPayment(paymentId, txHash, chain, blockNumber)
    } catch (error: any) {
      console.error('Error procesando pago:', error)
      toast.error('Error al procesar pago', {
        description: error.response?.data?.message || error.message || 'Error desconocido',
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    processPayment,
    isLoading,
  }
}

