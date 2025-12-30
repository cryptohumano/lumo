import { useState } from 'react'
import { usePolkadotWallet } from '../../hooks/usePolkadotWallet'
import { usePolkadotPayment } from '../../hooks/usePolkadotPayment'
import { getPolkadotService } from '../../services/polkadotService'
import { api } from '../../services/api'
import { Button } from '../ui/button'
import { toast } from 'sonner'
import type { ChainName } from '../../services/polkadotService'

interface PolkadotPaymentButtonProps {
  paymentId?: string // ID del pago existente (si ya fue creado)
  tripId?: string
  amount: number
  currency?: string
  assetId?: string | number
  chain?: ChainName
  toAddress?: string // Dirección del conductor/receptor
  onPaymentComplete?: (paymentId: string, txHash: string) => void
  disabled?: boolean
}

/**
 * Componente para procesar pagos con Polkadot
 */
export function PolkadotPaymentButton({
  paymentId, // ID del pago existente
  tripId: _tripId,
  amount,
  currency = 'DOT',
  assetId: _assetId,
  chain: _chain = 'POLKADOT',
  toAddress: _toAddress, // Dirección del conductor
  onPaymentComplete,
  disabled = false,
}: PolkadotPaymentButtonProps) {
  const { isConnected, selectedAccount, connect } = usePolkadotWallet()
  const { processPayment, isLoading } = usePolkadotPayment()
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = async () => {
    if (!isConnected || !selectedAccount) {
      try {
        await connect()
        toast.info('Por favor conecta tu wallet e intenta nuevamente')
      } catch (error: any) {
        toast.error('Error al conectar wallet', {
          description: error.message,
        })
      }
      return
    }

    if (!paymentId) {
      toast.error('Error: No se proporcionó el ID del pago')
      return
    }

    setIsProcessing(true)

    try {
      // 1. Obtener la extrínseca generada por el backend
      const extrinsicData = await api.generatePaymentExtrinsic(paymentId)

      // 2. Obtener el cliente de Polkadot
      const polkadotService = getPolkadotService()
      const client = await polkadotService.getClient(extrinsicData.chain as ChainName)

      // 3. Obtener el injector de la wallet
      const { web3FromAddress } = await import('@polkadot/extension-dapp')
      const injector = await web3FromAddress(selectedAccount.address)

      if (!injector.signer) {
        throw new Error('No se pudo obtener el signer de la wallet')
      }

      // 4. Reconstruir la extrínseca desde los parámetros
      let extrinsic: any
      
      if (extrinsicData.isBatch && extrinsicData.params && Array.isArray(extrinsicData.params)) {
        // Batch transaction: múltiples transferencias en una sola transacción
        const calls: any[] = []
        
        for (const callData of extrinsicData.params) {
          if (callData.method === 'assets.transfer') {
            const [assetId, toAddress, amount] = callData.params
            const tx = client.tx.assets.transfer(
              assetId,
              toAddress,
              BigInt(amount)
            )
            // Según la documentación de dedot, necesitamos usar .call en lugar del objeto completo
            calls.push(tx.call)
          } else if (callData.method === 'balances.transferKeepAlive') {
            const [toAddress, amount] = callData.params
            const tx = client.tx.balances.transferKeepAlive(
              toAddress,
              BigInt(amount)
            )
            // Según la documentación de dedot, necesitamos usar .call en lugar del objeto completo
            calls.push(tx.call)
          }
        }
        
        extrinsic = client.tx.utility.batchAll(calls)
      } else {
        // Transacción simple (método anterior)
        if (extrinsicData.assetId && extrinsicData.chain.includes('ASSET_HUB')) {
          // Transferencia de asset en Asset Hub
          extrinsic = client.tx.assets.transfer(
            extrinsicData.assetId,
            extrinsicData.toAddress,
            extrinsicData.amount
          )
        } else {
          // Transferencia de token nativo (DOT, KSM, etc.)
          extrinsic = client.tx.balances.transferKeepAlive(
            extrinsicData.toAddress,
            extrinsicData.amount
          )
        }
      }

      // 5. (Opcional) Obtener información de pago antes de enviar
      let estimatedFee: bigint | null = null
      try {
        const paymentInfo = await extrinsic.paymentInfo(selectedAccount.address)
        estimatedFee = paymentInfo.partialFee || null
        console.log('💰 Fee estimado para pago:', estimatedFee?.toString() || 'N/A')
      } catch (error) {
        console.warn('No se pudo obtener información de pago:', error)
      }

      // 6. Firmar y enviar la transacción
      // Usar untilFinalized() para obtener el resultado completo con blockHash
      const result = await extrinsic
        .signAndSend(selectedAccount.address, {
          signer: injector.signer,
        }, ({ status }) => {
          // Monitorear el estado
          if (status.type === 'BestChainBlockIncluded' || status.type === 'Finalized') {
            console.log('✅ Pago en bloque:', status.value?.blockNumber)
          }
        })
        .untilFinalized()

      // Obtener el hash de la transacción
      const txHash = result.status.type === 'Finalized'
        ? result.status.value.blockHash
        : result.txHash || 'unknown'

      // 6. Procesar pago en el backend
      await processPayment(paymentId, txHash, extrinsicData.chain as ChainName)

      toast.success('Pago procesado exitosamente', {
        description: `Transacción: ${txHash.slice(0, 10)}...`,
      })

      if (onPaymentComplete) {
        onPaymentComplete(paymentId, txHash)
      }
    } catch (error: any) {
      console.error('Error procesando pago:', error)
      toast.error('Error al procesar pago', {
        description: error.message || 'Error desconocido',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading || isProcessing || !isConnected}
    >
      {isProcessing || isLoading
        ? 'Procesando...'
        : !isConnected
        ? 'Conectar Wallet para Pagar'
        : `Pagar ${amount} ${currency}`}
    </Button>
  )
}





