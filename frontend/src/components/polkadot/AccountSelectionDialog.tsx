import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface AccountSelectionDialogProps {
  accounts: InjectedAccountWithMeta[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (account: InjectedAccountWithMeta) => void
  title?: string
  description?: string
  selectedAddress?: string | null
}

/**
 * Componente para mostrar y seleccionar cuentas de wallet
 * Mejora la UX al permitir que el usuario elija su cuenta sin usar la extensión
 */
export function AccountSelectionDialog({
  accounts,
  open,
  onOpenChange,
  onSelect,
  title = 'Selecciona una cuenta',
  description = 'Elige la cuenta que deseas usar para iniciar sesión',
  selectedAddress,
}: AccountSelectionDialogProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      toast.success('Dirección copiada')
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (error) {
      toast.error('Error al copiar dirección')
    }
  }

  if (accounts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              No se encontraron cuentas en tu wallet
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {accounts.map((account) => {
            const isSelected = selectedAddress === account.address
            const isCopied = copiedAddress === account.address

            return (
              <button
                key={account.address}
                onClick={() => {
                  onSelect(account)
                  onOpenChange(false)
                }}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:bg-accent hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base mb-1">
                      {account.meta.name || 'Sin nombre'}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-sm text-muted-foreground font-mono break-all">
                        {account.address}
                      </code>
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyAddress(account.address)
                        }}
                        className="flex-shrink-0 p-1 hover:bg-background rounded transition-colors cursor-pointer"
                        title="Copiar dirección"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            handleCopyAddress(account.address)
                          }
                        }}
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {account.meta.source && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Wallet: {account.meta.source}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}




