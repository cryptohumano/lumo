import { useState, useEffect } from 'react'
import { usePolkadotWallet } from '../../hooks/usePolkadotWallet'
import { Button } from '../ui/button'
import { toast } from 'sonner'
import { api } from '../../services/api'
import { Wallet } from 'lucide-react'
import { AccountSelectionDialog } from './AccountSelectionDialog'

interface WalletLinkButtonProps {
  onLinked?: () => void
}

/**
 * Componente para vincular una wallet al usuario actual
 */
export function WalletLinkButton({ onLinked }: WalletLinkButtonProps) {
  const { isConnected, selectedAccount, accounts, connect, signMessage, selectAccount } = usePolkadotWallet()
  const [isLinking, setIsLinking] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // Mostrar diálogo automáticamente cuando hay múltiples cuentas pero ninguna seleccionada
  useEffect(() => {
    console.log('🔍 useEffect - Estado actual:', { 
      accountsCount: accounts.length, 
      selectedAccount: !!selectedAccount,
      isLinking,
      isConnecting,
      showAccountDialog
    })
    
    // Solo mostrar si hay múltiples cuentas, ninguna seleccionada, y no estamos en proceso de vinculación
    if (accounts.length > 1 && !selectedAccount && !isLinking && !isConnecting) {
      console.log('✅ Mostrando diálogo de selección de cuentas')
      setShowAccountDialog(true)
    } else if (selectedAccount) {
      // Si hay una cuenta seleccionada, cerrar el diálogo
      console.log('✅ Cuenta seleccionada, cerrando diálogo')
      setShowAccountDialog(false)
    }
  }, [accounts, selectedAccount, isLinking, isConnecting])

  const handleLink = async () => {
    // Si ya hay una cuenta seleccionada y está conectada, proceder directamente
    if (isConnected && selectedAccount) {
      // Continuar con el proceso de vinculación directamente
    } else {
      // Conectar primero
      try {
        setIsConnecting(true)
        await connect()
        
        // Esperar un momento para que se actualice el estado del hook
        await new Promise(resolve => setTimeout(resolve, 500))
        
        console.log('🔍 Después de conectar:', { 
          accountsCount: accounts.length, 
          selectedAccount: !!selectedAccount,
          isConnected 
        })
        
        setIsConnecting(false)
        
        // Si hay múltiples cuentas pero ninguna seleccionada, mostrar diálogo manualmente
        if (accounts.length > 1 && !selectedAccount) {
          console.log('📋 Múltiples cuentas detectadas, mostrando diálogo manualmente')
          setShowAccountDialog(true)
          return
        }
        
        // Si después de conectar no hay cuenta seleccionada, esperar a que el usuario seleccione
        if (!selectedAccount) {
          console.log('⏳ Esperando selección de cuenta...', { accountsCount: accounts.length })
          return
        }
      } catch (error: any) {
        setIsConnecting(false)
        toast.error('Error al conectar wallet', {
          description: error.message || 'Por favor instala Polkadot.js Extension o Talisman',
        })
        return
      }
    }

    if (!selectedAccount) {
      toast.error('No hay cuenta seleccionada')
      return
    }

    setIsLinking(true)

    try {
      // Crear mensaje para firmar
      const message = `Lumo - Vincular wallet\n\nDirección: ${selectedAccount.address}\nFecha: ${new Date().toISOString()}\n\nFirma este mensaje para vincular tu wallet de forma segura.`

      // Firmar mensaje
      const signature = await signMessage(message)

      if (!signature) {
        throw new Error('No se pudo obtener la firma de la wallet')
      }

      console.log('🔐 Vinculando wallet:', {
        address: selectedAccount.address,
        chain: 'POLKADOT',
        hasSignature: !!signature,
        messageLength: message.length,
      })

      // Enviar al backend para vincular
      const response = await api.post('/polkadot/auth/link-wallet', {
        address: selectedAccount.address,
        chain: 'POLKADOT',
        signature,
        message,
      })

      console.log('✅ Wallet vinculada:', response)

      toast.success('Wallet vinculada exitosamente', {
        description: `Dirección: ${selectedAccount.address.slice(0, 8)}...${selectedAccount.address.slice(-8)}`,
      })
      if (onLinked) {
        onLinked()
      }
    } catch (error: any) {
      toast.error('Error al vincular wallet', {
        description: error.response?.data?.message || error.message,
      })
    } finally {
      setIsLinking(false)
    }
  }

  const handleAccountSelect = async (account: any) => {
    selectAccount(account)
    setShowAccountDialog(false)
    // Esperar un momento para que se actualice el estado
    await new Promise(resolve => setTimeout(resolve, 200))
    // Continuar con el proceso de vinculación después de seleccionar
    handleLink()
  }

  const handleContinueLink = async () => {
    if (!selectedAccount) {
      toast.error('Por favor selecciona una cuenta primero')
      return
    }
    await handleLink()
  }

  return (
    <>
      <Button 
        onClick={handleLink} 
        disabled={isLinking || isConnecting}
      >
        <Wallet className="h-4 w-4 mr-2" />
        {isLinking
          ? 'Vinculando...'
          : isConnecting
          ? 'Conectando...'
          : isConnected && selectedAccount
          ? 'Vincular Wallet'
          : 'Conectar y Vincular Wallet'}
      </Button>
      
      {accounts.length > 0 && (
        <AccountSelectionDialog
          accounts={accounts}
          open={showAccountDialog}
          onOpenChange={(open) => {
            setShowAccountDialog(open)
            if (!open && accounts.length > 1 && !selectedAccount) {
              // Si se cierra el diálogo sin seleccionar, mostrar mensaje
              toast.info('Por favor selecciona una cuenta para continuar')
            }
          }}
          onSelect={handleAccountSelect}
          title="Selecciona una cuenta"
          description="Elige la cuenta que deseas vincular a tu perfil"
          selectedAddress={selectedAccount?.address}
        />
      )}
    </>
  )
}

