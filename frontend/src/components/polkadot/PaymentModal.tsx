import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePolkadotWallet } from '@/hooks/usePolkadotWallet'
import { usePolkadotPayment } from '@/hooks/usePolkadotPayment'
import { getPolkadotService } from '@/services/polkadotService'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { Wallet, Loader2, CheckCircle2, AlertCircle, Copy, QrCode } from 'lucide-react'
import { PeopleChainIdentity } from './PeopleChainIdentity'
import { PaymentQrDisplay } from './PaymentQrDisplay'
import type { ChainName } from '@/services/polkadotService'

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: {
    id: string
    amount: number
    currency: string
    polkadotAssetId?: string | null
    polkadotChain?: string | null
    paymentMethodDetails?: any
    netAmount?: number
    tripId?: string | null
    status?: string
  }
  driverAddress?: string | null
  driverPeopleChainIdentity?: any
  onPaymentComplete?: (paymentId: string, txHash: string) => void
}

export function PaymentModal({
  open,
  onOpenChange,
  payment,
  driverAddress,
  driverPeopleChainIdentity: _driverPeopleChainIdentity,
  onPaymentComplete,
}: PaymentModalProps) {
  const { isConnected, selectedAccount, connect } = usePolkadotWallet()
  const { processPayment, isLoading } = usePolkadotPayment()
  const [isProcessing, setIsProcessing] = useState(false)
  const [extrinsicData, setExtrinsicData] = useState<any>(null)
  const [isLoadingExtrinsic, setIsLoadingExtrinsic] = useState(false)
  const [copied, setCopied] = useState(false)
  const [accountBalance, setAccountBalance] = useState<bigint | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [showQrCode, setShowQrCode] = useState(false)
  const [estimatedFee, setEstimatedFee] = useState<bigint | null>(null)
  const [isEstimatingFee, setIsEstimatingFee] = useState(false)

  // Validar que payment tenga los datos necesarios
  if (!payment || !payment.id) {
    console.error('PaymentModal: payment o payment.id no está definido', payment)
    return null
  }

  useEffect(() => {
    if (open && payment?.id) {
      // Si no está conectado, no cargar extrínseca todavía
      if (isConnected && selectedAccount) {
        loadExtrinsic()
      }
    }
  }, [open, payment?.id, isConnected, selectedAccount])

  useEffect(() => {
    if (extrinsicData && selectedAccount) {
      loadAccountBalance()
      estimateTransactionFee()
    }
  }, [extrinsicData, selectedAccount])

  const loadExtrinsic = async () => {
    if (!payment.id || !selectedAccount) return

    setIsLoadingExtrinsic(true)
    try {
      // Agregar timeout en el frontend también (50 segundos)
      const extrinsicPromise = api.generatePaymentExtrinsic(payment.id)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('La solicitud está tardando demasiado. Por favor, intenta nuevamente.'))
        }, 50000) // 50 segundos
      })

      const data = await Promise.race([extrinsicPromise, timeoutPromise])
      setExtrinsicData(data)
    } catch (error: any) {
      console.error('Error cargando extrínseca:', error)
      const errorMessage = error.message || 'Error al cargar la información de pago'
      
      // Si es un timeout, sugerir recargar
      if (errorMessage.includes('tardando demasiado') || errorMessage.includes('Timeout')) {
        toast.error('Tiempo de espera agotado', {
          description: 'El servidor está tardando demasiado. Intenta recargar la página o contacta al soporte.',
          duration: 10000,
        })
      } else {
        toast.error('Error al cargar la transacción', {
          description: errorMessage,
        })
      }
    } finally {
      setIsLoadingExtrinsic(false)
    }
  }

  const loadAccountBalance = async () => {
    if (!selectedAccount || !extrinsicData) return

    setIsLoadingBalance(true)
    try {
      const polkadotService = getPolkadotService()
      const chain = extrinsicData.chain as ChainName
      const assetId = extrinsicData.assetId

      let balance: bigint
      if (assetId && (chain.includes('ASSET_HUB') || chain === 'PASET_HUB')) {
        // Balance de asset (USDT, USDC, etc.)
        balance = await polkadotService.getAssetBalance(
          selectedAccount.address,
          assetId,
          chain
        )
      } else {
        // Balance de token nativo (DOT, KSM, PAS, etc.)
        balance = await polkadotService.getBalance(
          selectedAccount.address,
          chain
        )
      }

      setAccountBalance(balance)
    } catch (error: any) {
      console.error('Error cargando balance:', error)
      // No mostrar error al usuario, solo loguear
      setAccountBalance(null)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  /**
   * Estima el fee de la transacción usando paymentInfo() según la documentación de Dedot
   * https://docs.dedot.dev/client-api/transactions#paymentinfo
   */
  const estimateTransactionFee = async () => {
    if (!selectedAccount || !extrinsicData) return

    setIsEstimatingFee(true)
    try {
      const polkadotService = getPolkadotService()
      const client = await polkadotService.getClient(extrinsicData.chain as ChainName)

      // Reconstruir la extrínseca (sin firmar) para estimar el fee
      let extrinsic: any
      
      if (extrinsicData.isBatch && extrinsicData.params && Array.isArray(extrinsicData.params)) {
        const calls: any[] = []
        
        for (const callData of extrinsicData.params) {
          if (callData.method === 'assets.transfer') {
            const [assetId, toAddress, amount] = callData.params
            const tx = client.tx.assets.transfer(
              assetId,
              toAddress,
              BigInt(amount)
            )
            calls.push(tx.call)
          } else if (callData.method === 'balances.transferKeepAlive') {
            const [toAddress, amount] = callData.params
            const tx = client.tx.balances.transferKeepAlive(
              toAddress,
              BigInt(amount)
            )
            calls.push(tx.call)
          }
        }
        
        if (calls.length > 0) {
          try {
            extrinsic = client.tx.utility.batchAll(calls)
          } catch {
            extrinsic = client.tx.utility.batch(calls)
          }
        }
      } else {
        const amountBigInt = typeof extrinsicData.amount === 'string' 
          ? BigInt(extrinsicData.amount) 
          : BigInt(extrinsicData.amount)
        
        if (extrinsicData.assetId && extrinsicData.chain.includes('ASSET_HUB')) {
          extrinsic = client.tx.assets.transfer(
            extrinsicData.assetId,
            extrinsicData.toAddress,
            amountBigInt
          )
        } else {
          extrinsic = client.tx.balances.transferKeepAlive(
            extrinsicData.toAddress,
            amountBigInt
          )
        }
      }

      // Usar paymentInfo() para estimar el fee según la documentación de Dedot
      // https://docs.dedot.dev/client-api/transactions#paymentinfo
      // paymentInfo() retorna un objeto con partialFee según la documentación
      const paymentInfoResult = extrinsic.paymentInfo(selectedAccount.address)
      
      // paymentInfo puede retornar directamente el objeto o ser una promesa
      const paymentInfo = paymentInfoResult instanceof Promise 
        ? await paymentInfoResult 
        : paymentInfoResult
      
      // Extraer el fee (puede estar en partialFee, fee, o weight)
      const fee = paymentInfo?.partialFee 
        ? BigInt(paymentInfo.partialFee.toString())
        : paymentInfo?.fee 
        ? BigInt(paymentInfo.fee.toString())
        : BigInt(0)
      
      setEstimatedFee(fee)
      console.log('💰 [PAYMENT] Fee estimado:', fee.toString())
    } catch (error: any) {
      console.error('Error estimando fee:', error)
      // No mostrar error al usuario, solo loguear
      setEstimatedFee(null)
    } finally {
      setIsEstimatingFee(false)
    }
  }

  const handleConnect = async () => {
    try {
      await connect()
      if (isConnected && selectedAccount) {
        await loadExtrinsic()
      }
    } catch (error: any) {
      toast.error('Error al conectar wallet', {
        description: error.message,
      })
    }
  }

  const handlePayment = async () => {
    if (!isConnected || !selectedAccount || !extrinsicData) {
      toast.error('Por favor conecta tu wallet primero')
      return
    }

    setIsProcessing(true)

    try {
      // 1. Obtener el cliente de Polkadot
      const polkadotService = getPolkadotService()
      const client = await polkadotService.getClient(extrinsicData.chain as ChainName)

      // 2. Obtener el injector de la wallet
      const { web3FromAddress } = await import('@polkadot/extension-dapp')
      const injector = await web3FromAddress(selectedAccount.address)

      if (!injector.signer) {
        throw new Error('No se pudo obtener el signer de la wallet')
      }

      // 3. Reconstruir la extrínseca desde los parámetros
      let extrinsic: any
      
      if (extrinsicData.isBatch && extrinsicData.params && Array.isArray(extrinsicData.params)) {
        // Batch transaction: múltiples transferencias en una sola transacción
        console.log('📦 [PAYMENT] Construyendo batch transaction con', extrinsicData.params.length, 'calls')
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
            console.log(`  ✅ [PAYMENT] Agregado call: assets.transfer(${assetId}, ${toAddress.slice(0, 10)}..., ${amount})`)
          } else if (callData.method === 'balances.transferKeepAlive') {
            const [toAddress, amount] = callData.params
            const tx = client.tx.balances.transferKeepAlive(
              toAddress,
              BigInt(amount)
            )
            // Según la documentación de dedot, necesitamos usar .call en lugar del objeto completo
            calls.push(tx.call)
            console.log(`  ✅ [PAYMENT] Agregado call: balances.transferKeepAlive(${toAddress.slice(0, 10)}..., ${amount})`)
          }
        }
        
        if (calls.length > 0) {
          try {
            extrinsic = client.tx.utility.batchAll(calls)
            console.log(`✅ [PAYMENT] Batch transaction construida con ${calls.length} calls usando batchAll`)
          } catch (batchAllError: any) {
            console.warn('⚠️ [PAYMENT] Error con batchAll, intentando con batch:', batchAllError.message)
            extrinsic = client.tx.utility.batch(calls)
            console.log(`✅ [PAYMENT] Batch transaction construida con ${calls.length} calls usando batch`)
          }
        } else {
          throw new Error('No se pudieron construir los calls para el batch')
        }
      } else {
        // Transacción simple (método anterior)
      const amountBigInt = typeof extrinsicData.amount === 'string' 
        ? BigInt(extrinsicData.amount) 
        : BigInt(extrinsicData.amount)
      
      if (extrinsicData.assetId && extrinsicData.chain.includes('ASSET_HUB')) {
        // Transferencia de asset en Asset Hub
        extrinsic = client.tx.assets.transfer(
          extrinsicData.assetId,
          extrinsicData.toAddress,
          amountBigInt
        )
      } else {
        // Transferencia de token nativo (DOT, KSM, PAS, etc.)
        extrinsic = client.tx.balances.transferKeepAlive(
          extrinsicData.toAddress,
          amountBigInt
        )
        }
      }

      // 4. Firmar y enviar la transacción
      let txHash: string | undefined
      let blockHash: string | null = null
      let blockNumber: string | undefined
      let result: any
      
      try {
        // Para todas las transacciones, usar untilFinalized para obtener el blockHash correcto
        result = await extrinsic
          .signAndSend(selectedAccount.address, {
            signer: injector.signer,
          }, (status: any) => {
            // Monitorear el estado de la transacción
            console.log('📊 [PAYMENT] Estado de transacción:', status.type || status.status?.type)
            
            // Capturar blockHash y blockNumber del callback cuando está disponible
            if (status.type === 'BestChainBlockIncluded' || status.type === 'Finalized') {
              if (status.value && typeof status.value === 'object') {
                if ('blockHash' in status.value) {
                  blockHash = status.value.blockHash as string
                  console.log('✅ [PAYMENT] BlockHash capturado del callback:', blockHash)
                }
                if ('blockNumber' in status.value) {
                  blockNumber = status.value.blockNumber?.toString() || status.value.blockNumber
                  console.log('✅ [PAYMENT] BlockNumber capturado del callback:', blockNumber)
                }
              }
            } else if (status.status?.isInBlock) {
              const blockInfo = status.status.asInBlock
              console.log('✅ [PAYMENT] Transacción incluida en bloque:', blockInfo.toString())
              if (typeof blockInfo === 'object' && 'blockNumber' in blockInfo) {
                blockNumber = blockInfo.blockNumber?.toString()
              }
            } else if (status.status?.isFinalized) {
              const blockInfo = status.status.asFinalized
              console.log('✅ [PAYMENT] Transacción finalizada en bloque:', blockInfo.toString())
              if (typeof blockInfo === 'object' && 'blockNumber' in blockInfo) {
                blockNumber = blockInfo.blockNumber?.toString()
              }
            }
          })
          .untilFinalized()
        
        // Intentar obtener el hash del resultado final
        // PRIORIDAD: buscar txHash primero (es lo más común en dedot)
        if (!blockHash && result) {
          try {
            // El resultado puede tener diferentes estructuras dependiendo de dedot
            if (typeof result === 'object' && result !== null) {
              const resultAny = result as any
              
              // 1. Intentar result.txHash PRIMERO (el más común en dedot)
              if (resultAny.txHash) {
                blockHash = String(resultAny.txHash)
                console.log('✅ [PAYMENT] TxHash encontrado en result.txHash:', blockHash)
              }
              // 2. Intentar result.hash
              else if (resultAny.hash) {
                blockHash = String(resultAny.hash)
                console.log('✅ [PAYMENT] Hash encontrado en result.hash:', blockHash)
              }
              // 3. Intentar result.blockHash
              else if (resultAny.blockHash) {
                blockHash = String(resultAny.blockHash)
                console.log('✅ [PAYMENT] BlockHash encontrado en result.blockHash:', blockHash)
              }
              // 4. Intentar acceder a result.status.value.blockHash
              else if (resultAny.status?.value?.blockHash) {
                blockHash = String(resultAny.status.value.blockHash)
                console.log('✅ [PAYMENT] BlockHash encontrado en result.status.value.blockHash:', blockHash)
                // También intentar obtener blockNumber
                if (!blockNumber && resultAny.status.value.blockNumber) {
                  blockNumber = String(resultAny.status.value.blockNumber)
                  console.log('✅ [PAYMENT] BlockNumber encontrado:', blockNumber)
                }
              }
              // 5. Intentar result.status.blockHash
              else if (resultAny.status?.blockHash) {
                blockHash = String(resultAny.status.blockHash)
                console.log('✅ [PAYMENT] BlockHash encontrado en result.status.blockHash:', blockHash)
              }
            } else if (typeof result === 'string') {
              // Si el resultado es directamente un string, usarlo como hash
              blockHash = result
              console.log('✅ [PAYMENT] Resultado es string, usado como hash:', blockHash)
            }
          } catch (parseError) {
            console.warn('⚠️ [PAYMENT] Error parseando resultado:', parseError)
            console.log('🔍 [PAYMENT] Result object keys:', result ? Object.keys(result) : 'null')
          }
        }
        
        if (!blockHash) {
          console.error('❌ [PAYMENT] No se pudo obtener blockHash. Result:', result)
          throw new Error('No se pudo obtener el hash de la transacción del resultado')
        }
        
        txHash = blockHash
        console.log('✅ [PAYMENT] Hash de transacción final obtenido:', txHash, 'BlockNumber:', blockNumber)
      } catch (signError: any) {
        if (extrinsicData.isBatch && (signError.message?.includes('batchAll') || signError.message?.includes('invalid input type') || signError.message?.includes('batch'))) {
          console.warn('⚠️ [PAYMENT] Error firmando batchAll/batch, reconstruyendo con batch como fallback final:', signError.message)
          
          const calls: any[] = []
          for (const callData of extrinsicData.params) {
            if (callData.method === 'assets.transfer') {
              const [assetId, toAddress, amount] = callData.params
              const tx = client.tx.assets.transfer(assetId, toAddress, BigInt(amount))
              calls.push(tx.call)
            } else if (callData.method === 'balances.transferKeepAlive') {
              const [toAddress, amount] = callData.params
              const tx = client.tx.balances.transferKeepAlive(toAddress, BigInt(amount))
              calls.push(tx.call)
            }
          }
          
          if (calls.length > 0) {
            const batchExtrinsic = client.tx.utility.batch(calls)
            console.log('🔄 [PAYMENT] Reintentando con batch en lugar de batchAll')
            
            let fallbackBlockHash: string | null = null
            let fallbackBlockNumber: string | undefined
            const fallbackResult = await batchExtrinsic
              .signAndSend(selectedAccount.address, {
        signer: injector.signer,
              }, (status: any) => {
                console.log('📊 [PAYMENT] Estado de transacción (fallback):', status.type || status.status?.type)
                
                if (status.type === 'BestChainBlockIncluded' || status.type === 'Finalized') {
                  if (status.value && typeof status.value === 'object') {
                    if ('blockHash' in status.value) {
                      fallbackBlockHash = status.value.blockHash as string
                      console.log('✅ [PAYMENT] BlockHash capturado del callback (fallback):', fallbackBlockHash)
                    }
                    if ('blockNumber' in status.value) {
                      fallbackBlockNumber = status.value.blockNumber?.toString() || status.value.blockNumber
                      console.log('✅ [PAYMENT] BlockNumber capturado del callback (fallback):', fallbackBlockNumber)
                    }
                  }
                } else if (status.status?.isInBlock) {
                  const blockInfo = status.status.asInBlock
                  console.log('✅ [PAYMENT] Transacción incluida en bloque:', blockInfo.toString())
                  if (typeof blockInfo === 'object' && 'blockNumber' in blockInfo) {
                    fallbackBlockNumber = blockInfo.blockNumber?.toString()
                  }
                } else if (status.status?.isFinalized) {
                  const blockInfo = status.status.asFinalized
                  console.log('✅ [PAYMENT] Transacción finalizada en bloque:', blockInfo.toString())
                  if (typeof blockInfo === 'object' && 'blockNumber' in blockInfo) {
                    fallbackBlockNumber = blockInfo.blockNumber?.toString()
                  }
                }
              })
              .untilFinalized()
            
            // Intentar obtener el hash del resultado del fallback
            if (!fallbackBlockHash && fallbackResult) {
              try {
                if (typeof fallbackResult === 'object' && fallbackResult !== null) {
                  const fallbackAny = fallbackResult as any
                  
                  // 1. Intentar txHash PRIMERO (el más común en dedot)
                  if (fallbackAny.txHash) {
                    fallbackBlockHash = String(fallbackAny.txHash)
                    console.log('✅ [PAYMENT] TxHash encontrado en fallbackResult.txHash:', fallbackBlockHash)
                  }
                  // 2. Intentar hash
                  else if (fallbackAny.hash) {
                    fallbackBlockHash = String(fallbackAny.hash)
                    console.log('✅ [PAYMENT] Hash encontrado en fallbackResult.hash:', fallbackBlockHash)
                  }
                  // 3. Intentar blockHash
                  else if (fallbackAny.blockHash) {
                    fallbackBlockHash = String(fallbackAny.blockHash)
                    console.log('✅ [PAYMENT] BlockHash encontrado en fallbackResult.blockHash:', fallbackBlockHash)
                  }
                  // 4. Intentar status.value.blockHash
                  else if (fallbackAny.status?.value?.blockHash) {
                    fallbackBlockHash = String(fallbackAny.status.value.blockHash)
                    console.log('✅ [PAYMENT] BlockHash encontrado en fallbackResult.status.value.blockHash:', fallbackBlockHash)
                    if (!fallbackBlockNumber && fallbackAny.status.value.blockNumber) {
                      fallbackBlockNumber = String(fallbackAny.status.value.blockNumber)
                    }
                  }
                  // 5. Intentar status.blockHash
                  else if (fallbackAny.status?.blockHash) {
                    fallbackBlockHash = String(fallbackAny.status.blockHash)
                    console.log('✅ [PAYMENT] BlockHash encontrado en fallbackResult.status.blockHash:', fallbackBlockHash)
                  }
                } else if (typeof fallbackResult === 'string') {
                  fallbackBlockHash = fallbackResult
                  console.log('✅ [PAYMENT] FallbackResult es string, usado como hash:', fallbackBlockHash)
                }
              } catch (parseError) {
                console.warn('⚠️ [PAYMENT] Error parseando resultado del fallback:', parseError)
                console.log('🔍 [PAYMENT] FallbackResult object keys:', fallbackResult ? Object.keys(fallbackResult) : 'null')
              }
            }
            
            if (!fallbackBlockHash) {
              throw new Error('No se pudo obtener el hash de la transacción en el fallback')
            }
            txHash = fallbackBlockHash
            if (fallbackBlockNumber) {
              blockNumber = fallbackBlockNumber
            }
            console.log('✅ [PAYMENT] Transacción finalizada con batch (fallback), blockHash:', txHash, 'blockNumber:', blockNumber)
          } else {
            throw signError
          }
        } else {
          throw signError
        }
      }

      // 5. Validar que tenemos el hash antes de procesar
      if (!txHash) {
        throw new Error('No se pudo obtener el hash de la transacción')
      }

      // 6. Procesar pago en el backend (incluyendo blockNumber si está disponible)
      await processPayment(payment.id, txHash, extrinsicData.chain as ChainName, blockNumber)

      toast.success('Pago procesado exitosamente', {
        description: `Transacción: ${txHash.slice(0, 10)}...`,
      })

      if (onPaymentComplete) {
        onPaymentComplete(payment.id, txHash)
      }

      onOpenChange(false)
    } catch (error: any) {
      console.error('Error procesando pago:', error)
      toast.error('Error al procesar pago', {
        description: error.message || 'Error desconocido',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatAmount = (amount: number | bigint | string, decimals: number = 10) => {
    const divisor = Math.pow(10, decimals)
    let numAmount: number
    if (typeof amount === 'bigint') {
      numAmount = Number(amount)
    } else if (typeof amount === 'string') {
      numAmount = Number(amount)
    } else {
      numAmount = amount
    }
    return (numAmount / divisor).toFixed(decimals === 6 ? 2 : 4)
  }

  if (!payment || !payment.id) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Realizar Pago
          </DialogTitle>
          <DialogDescription>
            Completa el pago del viaje usando tu wallet de Polkadot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del pago */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Monto a pagar:</span>
              <span className="text-2xl font-bold">
                {extrinsicData 
                  ? formatAmount(extrinsicData.amount, extrinsicData.decimals)
                  : typeof payment.amount === 'number' 
                  ? payment.amount.toFixed(payment.currency === 'USDT' || payment.currency === 'USDC' ? 2 : 4) 
                    : payment.amount} {extrinsicData?.currency || payment.currency}
              </span>
            </div>
            {/* Mostrar información de división si tenemos los datos de la extrínseca */}
            {extrinsicData && extrinsicData.isBatch && extrinsicData.driverAmount && extrinsicData.platformAmount ? (
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                {(() => {
                  const totalAmount = BigInt(extrinsicData.amount)
                  const platformAmount = BigInt(extrinsicData.platformAmount)
                  const feePercentage = Number((platformAmount * BigInt(10000)) / totalAmount) / 100
                  
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>Fee plataforma ({feePercentage.toFixed(1)}%):</span>
                        <span>
                          {formatAmount(extrinsicData.platformAmount, extrinsicData.decimals)} {extrinsicData.currency || payment.currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conductor recibirá:</span>
                        <span className="font-medium text-green-600">
                          {formatAmount(extrinsicData.driverAmount, extrinsicData.decimals)} {extrinsicData.currency || payment.currency}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : payment.paymentMethodDetails ? (
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                {payment.paymentMethodDetails.platformFee && (
                  <div className="flex justify-between">
                    <span>Fee plataforma (estimado):</span>
                    <span>
                      {typeof payment.paymentMethodDetails.platformFee === 'number' 
                        ? payment.paymentMethodDetails.platformFee.toFixed(4) 
                        : payment.paymentMethodDetails.platformFee} {payment.currency}
                    </span>
                  </div>
                )}
                {payment.netAmount && (
                  <div className="flex justify-between">
                    <span>Conductor recibirá (estimado):</span>
                    <span className="font-medium text-green-600">
                      {typeof payment.netAmount === 'number' 
                        ? payment.netAmount.toFixed(4) 
                        : payment.netAmount} {payment.currency}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Código QR de Pago - Mostrar para pagos pendientes */}
          {payment && payment.status === 'PENDING' && (
            <div className="p-4 bg-muted rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Código QR de Pago</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQrCode(!showQrCode)}
                >
                  {showQrCode ? 'Ocultar' : 'Mostrar QR'}
                </Button>
              </div>
              {showQrCode && (
                <PaymentQrDisplay paymentId={payment.id} />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                El conductor/host puede mostrar este QR para que el pasajero lo escanee y realice el pago directamente
              </p>
            </div>
          )}

          {/* Información del conductor (PeopleChain) */}
          {driverAddress && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2">Información del Conductor</h4>
              <PeopleChainIdentity address={driverAddress} />
            </div>
          )}

          {/* Balance de la cuenta */}
          {isConnected && selectedAccount && extrinsicData && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Balance disponible
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {selectedAccount.meta.name || selectedAccount.address.slice(0, 8) + '...'}
                  </p>
                </div>
                <div className="text-right">
                  {isLoadingBalance ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : accountBalance !== null ? (
                    <div>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {formatAmount(accountBalance, extrinsicData.decimals)} {extrinsicData.currency || payment.currency}
                      </p>
                      {extrinsicData.amount && accountBalance && (
                        <p className={`text-xs mt-1 ${
                          BigInt(extrinsicData.amount) > accountBalance 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {BigInt(extrinsicData.amount) > accountBalance 
                            ? '❌ Balance insuficiente' 
                            : '✅ Balance suficiente'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      No disponible
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Estado de conexión de wallet */}
          {!isConnected ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Wallet no conectada
                </p>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                Conecta tu wallet de Polkadot para realizar el pago
              </p>
              <Button onClick={handleConnect} className="w-full">
                <Wallet className="h-4 w-4 mr-2" />
                Conectar Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cuenta conectada */}
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Cuenta conectada:</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedAccount?.address.slice(0, 8)}...{selectedAccount?.address.slice(-8)}
                  </Badge>
                </div>
                {selectedAccount?.meta?.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedAccount.meta.name}
                  </p>
                )}
              </div>

              {/* Extrinsic construido */}
              {isLoadingExtrinsic ? (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Construyendo transacción...</p>
                </div>
              ) : extrinsicData ? (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Transacción lista</h4>
                    <Badge variant="secondary">{extrinsicData.method}</Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chain:</span>
                      <span className="font-mono">
                        {extrinsicData.chain === 'PASET_HUB' ? 'Asset Hub de Paseo (Testnet)' : extrinsicData.chain}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Moneda:</span>
                      <span className="font-semibold">
                        {extrinsicData.currency || payment.currency}
                        {extrinsicData.chain === 'PASET_HUB' && !extrinsicData.assetId && ' (PAS)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto:</span>
                      <span className="font-semibold">
                        {extrinsicData.amount ? formatAmount(extrinsicData.amount, extrinsicData.decimals) : 'N/A'} {extrinsicData.currency || payment.currency}
                      </span>
                    </div>
                    {extrinsicData.assetId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Asset ID:</span>
                        <span className="font-mono">{extrinsicData.assetId}</span>
                      </div>
                    )}
                    {extrinsicData.isBatch ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Conductor:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {extrinsicData.toAddress?.slice(0, 8) || 'N/A'}...{extrinsicData.toAddress?.slice(-8) || ''}
                            </span>
                            {extrinsicData.toAddress && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(extrinsicData.toAddress)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {extrinsicData.platformAddress && extrinsicData.platformAddress.trim() && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Plataforma:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">
                                {extrinsicData.platformAddress.slice(0, 8)}...{extrinsicData.platformAddress.slice(-8)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(extrinsicData.platformAddress)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {extrinsicData.driverAmount && extrinsicData.platformAmount && (
                          <div className="pt-2 border-t space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Conductor recibirá:</span>
                              <span className="font-semibold">
                                {formatAmount(extrinsicData.driverAmount, extrinsicData.decimals)} {extrinsicData.currency || payment.currency}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Plataforma recibirá:</span>
                              <span className="font-semibold">
                                {formatAmount(extrinsicData.platformAmount, extrinsicData.decimals)} {extrinsicData.currency || payment.currency}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Destinatario:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                              {extrinsicData.toAddress?.slice(0, 8) || 'N/A'}...{extrinsicData.toAddress?.slice(-8) || ''}
                        </span>
                            {extrinsicData.toAddress && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(extrinsicData.toAddress)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                            )}
                      </div>
                    </div>
                        {extrinsicData.extrinsic && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Extrinsic (hex):</span>
                              {extrinsicData.extrinsic && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                                  onClick={() => copyToClipboard(extrinsicData.extrinsic!)}
                        >
                          {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                              )}
                      </div>
                            {extrinsicData.extrinsic && (
                      <p className="font-mono text-[10px] break-all mt-1 text-muted-foreground">
                        {extrinsicData.extrinsic.slice(0, 40)}...
                      </p>
                            )}
                    </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    No se pudo construir la transacción. Por favor intenta de nuevo.
                  </p>
                </div>
              )}

              {/* Botón de pago */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing || isLoading || !extrinsicData}
                className="w-full"
                size="lg"
              >
                {isProcessing || isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Pagar {typeof payment.amount === 'number' 
                      ? payment.amount.toFixed(payment.currency === 'USDT' || payment.currency === 'USDC' ? 2 : 4) 
                      : payment.amount} {payment.currency}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

