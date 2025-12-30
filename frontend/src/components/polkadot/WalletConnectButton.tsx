import { useState } from 'react'
import { usePolkadotWallet } from '../../hooks/usePolkadotWallet'
import { Button } from '../ui/button'
import { toast } from 'sonner'
import { AccountSelectionDialog } from './AccountSelectionDialog'

interface WalletConnectButtonProps {
  onConnect?: (address: string) => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

/**
 * Componente para conectar wallets de Polkadot
 */
export function WalletConnectButton({
  onConnect,
  variant = 'default',
  size = 'default',
}: WalletConnectButtonProps) {
  const { isConnected, selectedAccount, connect, disconnect, accounts, selectAccount } = usePolkadotWallet()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleConnect = async () => {
    try {
      await connect()
      // Si hay múltiples cuentas o no hay cuenta seleccionada, mostrar diálogo
      if (accounts.length > 1 || !selectedAccount) {
        setIsDialogOpen(true)
      } else if (onConnect) {
        // Si solo hay una cuenta y ya está seleccionada, llamar callback
        onConnect(selectedAccount.address)
      }
    } catch (error: any) {
      toast.error('Error al conectar wallet', {
        description: error.message || 'Por favor instala Polkadot.js Extension o Talisman',
      })
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast.success('Wallet desconectada')
  }

  const handleSelectAccount = (account: typeof accounts[0]) => {
    selectAccount(account)
    setIsDialogOpen(false)
    if (onConnect) {
      onConnect(account.address)
    }
    toast.success('Cuenta seleccionada', {
      description: account.meta.name || account.address,
    })
  }

  if (isConnected && selectedAccount) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={() => setIsDialogOpen(true)}
        >
          {selectedAccount.meta.name || 'Wallet Conectada'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="ml-2"
        >
          Desconectar
        </Button>
        <AccountSelectionDialog
          accounts={accounts}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSelect={handleSelectAccount}
          title="Cuentas Disponibles"
          description="Selecciona una cuenta para usar"
          selectedAddress={selectedAccount?.address || null}
        />
      </>
    )
  }

  return (
    <Button variant={variant} size={size} onClick={handleConnect}>
      Conectar Wallet
    </Button>
  )
}




