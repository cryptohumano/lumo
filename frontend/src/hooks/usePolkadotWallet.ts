import { useState, useEffect, useCallback } from 'react'
import { getPolkadotService } from '../services/polkadotService'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { api } from '../services/api'

interface WalletInfo {
  address: string
  chain: string
  balance: string
  peopleChainIdentity?: string
}

interface UsePolkadotWalletReturn {
  accounts: InjectedAccountWithMeta[]
  selectedAccount: InjectedAccountWithMeta | null
  walletInfo: WalletInfo | null
  isConnected: boolean
  isLoading: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  selectAccount: (account: InjectedAccountWithMeta) => void
  signMessage: (message: string) => Promise<string>
  refreshBalance: () => Promise<void>
}

/**
 * Hook para gestionar la conexión con wallets de Polkadot
 */
export function usePolkadotWallet(): UsePolkadotWalletReturn {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const polkadotService = getPolkadotService()

  /**
   * Conecta a la wallet
   * Si hay múltiples cuentas, NO selecciona automáticamente la primera
   * para permitir que el usuario elija
   */
  const connect = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const accounts = await polkadotService.connectWallet()
      setAccounts(accounts)
      
      if (accounts.length === 0) {
        throw new Error('No se encontraron cuentas en la wallet')
      } else if (accounts.length === 1) {
        // Si solo hay una cuenta, seleccionarla automáticamente
        setSelectedAccount(accounts[0])
        setIsConnected(true)
        
        // Obtener información de la wallet del backend
        await fetchWalletInfo(accounts[0].address)
      } else {
        // Si hay múltiples cuentas, NO seleccionar automáticamente
        // El usuario debe elegir mediante el diálogo de selección
        setSelectedAccount(null)
        setIsConnected(false) // Conectado pero sin cuenta seleccionada aún
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar wallet')
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Obtiene información de la wallet del backend
   */
  const fetchWalletInfo = useCallback(async (address: string) => {
    try {
      const response = await api.getWalletInfo()
      if (response.hasWallet) {
        setWalletInfo({
          address: response.address || address,
          chain: response.chain || 'POLKADOT',
          balance: response.balance || '0',
          peopleChainIdentity: response.peopleChainIdentity,
        })
      }
    } catch (err) {
      // Si no hay wallet vinculada, no es un error
      console.log('Wallet no vinculada aún')
    }
  }, [])

  /**
   * Desconecta la wallet
   */
  const disconnect = useCallback(() => {
    setAccounts([])
    setSelectedAccount(null)
    setWalletInfo(null)
    setIsConnected(false)
    setError(null)
  }, [])

  /**
   * Selecciona una cuenta
   */
  const selectAccount = useCallback((account: InjectedAccountWithMeta) => {
    setSelectedAccount(account)
    setIsConnected(true) // Marcar como conectado cuando se selecciona una cuenta
    fetchWalletInfo(account.address)
  }, [fetchWalletInfo])

  /**
   * Firma un mensaje
   */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!selectedAccount) {
      throw new Error('No hay cuenta seleccionada')
    }

    try {
      const signature = await polkadotService.signMessage(
        selectedAccount.address,
        message
      )
      return signature
    } catch (err: any) {
      throw new Error(err.message || 'Error al firmar mensaje')
    }
  }, [selectedAccount])

  /**
   * Actualiza el balance
   */
  const refreshBalance = useCallback(async () => {
    if (!selectedAccount) return

    try {
      const balance = await polkadotService.getBalance(selectedAccount.address)
      setWalletInfo((prev) => {
        if (!prev) return null
        return {
          ...prev,
          balance: balance.toString(),
        }
      })
    } catch (err) {
      console.error('Error actualizando balance:', err)
    }
  }, [selectedAccount])

  // Cargar información de wallet al montar si hay una cuenta seleccionada
  useEffect(() => {
    if (selectedAccount) {
      fetchWalletInfo(selectedAccount.address)
    }
  }, [selectedAccount, fetchWalletInfo])

  return {
    accounts,
    selectedAccount,
    walletInfo,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    selectAccount,
    signMessage,
    refreshBalance,
  }
}

