import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, AlertCircle, CheckCircle2, MapPin, Wallet, Network } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'

interface ValidationConfigs {
  distanceStartTrip: boolean
  distanceEndTrip: boolean
}

interface PolkadotConfigs {
  network: string | null
  paymentChain: string | null
  paymentPreset: string | null
  paymentCustom: any | null
  assetUsdtId: string | null
  assetUsdcId: string | null
  platformAddress: string | null
  platformFeePercentage: number | null
}

// Presets disponibles (debe coincidir con backend/src/config/paymentPresets.ts)
const PAYMENT_PRESETS = [
  // Asset Hub (Polkadot Mainnet)
  { id: 'asset-hub-dot', name: 'DOT en Asset Hub (Polkadot)', chain: 'ASSET_HUB', currency: 'DOT', isTestnet: false },
  { id: 'asset-hub-usdt', name: 'USDT en Asset Hub (Polkadot)', chain: 'ASSET_HUB', currency: 'USDT', isTestnet: false },
  // Asset Hub Kusama
  { id: 'asset-hub-kusama-ksm', name: 'KSM en Asset Hub (Kusama)', chain: 'ASSET_HUB_KUSAMA', currency: 'KSM', isTestnet: false },
  // PassetHub (Testnet)
  { id: 'paset-hub-dot', name: 'DOT en PassetHub (Testnet)', chain: 'PASET_HUB', currency: 'DOT', isTestnet: true },
  { id: 'paset-hub-pas', name: 'PAS en PassetHub (Testnet)', chain: 'PASET_HUB', currency: 'PAS', isTestnet: true },
  { id: 'paset-hub-usdc', name: 'USDC en PassetHub (Testnet)', chain: 'PASET_HUB', currency: 'USDC', isTestnet: true },
]

export default function SystemConfig() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPolkadot, setSavingPolkadot] = useState(false)
  const [configs, setConfigs] = useState<ValidationConfigs>({
    distanceStartTrip: false,
    distanceEndTrip: false,
  })
  const [polkadotConfigs, setPolkadotConfigs] = useState<PolkadotConfigs>({
    network: null,
    paymentChain: null,
    paymentPreset: null,
    paymentCustom: null,
    assetUsdtId: null,
    assetUsdcId: null,
    platformAddress: null,
    platformFeePercentage: null,
  })

  useEffect(() => {
    loadConfigs()
    loadPolkadotConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const data = await api.getValidationConfigs()
      // Asegurar que siempre tengamos valores por defecto
      if (data && typeof data === 'object') {
        setConfigs({
          distanceStartTrip: data.distanceStartTrip ?? false,
          distanceEndTrip: data.distanceEndTrip ?? false,
        })
      } else {
        // Si la respuesta no es un objeto válido, usar valores por defecto
        setConfigs({
          distanceStartTrip: false,
          distanceEndTrip: false,
        })
      }
    } catch (error: any) {
      console.error('Error cargando configuraciones:', error)
      // En caso de error, usar valores por defecto
      setConfigs({
        distanceStartTrip: false,
        distanceEndTrip: false,
      })
      toast.error('Error al cargar configuraciones', {
        description: error.message || 'No se pudieron cargar las configuraciones del sistema',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const safeConfigs = configs || { distanceStartTrip: false, distanceEndTrip: false }
      await api.put('/system-config/validations', safeConfigs)
      toast.success('Configuraciones guardadas', {
        description: 'Las configuraciones del sistema se han actualizado correctamente',
      })
    } catch (error: any) {
      console.error('Error guardando configuraciones:', error)
      toast.error('Error al guardar configuraciones', {
        description: error.response?.data?.message || error.message || 'No se pudieron guardar las configuraciones',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof ValidationConfigs) => {
    setConfigs((prev) => {
      const safePrev = prev || { distanceStartTrip: false, distanceEndTrip: false }
      return {
        ...safePrev,
        [key]: !safePrev[key],
      }
    })
  }

  const loadPolkadotConfigs = async () => {
    try {
      const data = await api.getPolkadotConfig()
      setPolkadotConfigs({
        network: data.network || null,
        paymentChain: data.paymentChain || null,
        paymentPreset: data.paymentPreset || null,
        paymentCustom: data.paymentCustom || null,
        assetUsdtId: data.assetUsdtId || null,
        assetUsdcId: data.assetUsdcId || null,
        platformAddress: data.platformAddress || null,
        platformFeePercentage: data.platformFeePercentage || null,
      })
    } catch (error: any) {
      console.error('Error cargando configuraciones de Polkadot:', error)
      // En desarrollo, usar valores por defecto
      if (process.env.NODE_ENV !== 'production') {
        setPolkadotConfigs({
          network: 'PASET_HUB',
          paymentChain: 'PASET_HUB',
          paymentPreset: 'paset-hub-pas',
          paymentCustom: null,
          assetUsdtId: null,
          assetUsdcId: null,
          platformAddress: null,
          platformFeePercentage: 8,
        })
      }
    }
  }

  const handleSavePolkadot = async () => {
    try {
      setSavingPolkadot(true)
      await api.updatePolkadotConfig({
        network: polkadotConfigs.network || undefined,
        paymentChain: polkadotConfigs.paymentChain || undefined,
        paymentPreset: polkadotConfigs.paymentPreset || undefined,
        paymentCustom: polkadotConfigs.paymentCustom || null,
        assetUsdtId: polkadotConfigs.assetUsdtId || undefined,
        assetUsdcId: polkadotConfigs.assetUsdcId || undefined,
        platformAddress: polkadotConfigs.platformAddress || null,
        platformFeePercentage: polkadotConfigs.platformFeePercentage || null,
      })
      toast.success('Configuraciones de Polkadot guardadas', {
        description: 'Las configuraciones de pagos se han actualizado correctamente',
      })
    } catch (error: any) {
      console.error('Error guardando configuraciones de Polkadot:', error)
      toast.error('Error al guardar configuraciones de Polkadot', {
        description: error.response?.data?.message || error.message || 'No se pudieron guardar las configuraciones',
      })
    } finally {
      setSavingPolkadot(false)
    }
  }

  const handlePresetChange = (presetId: string) => {
    const preset = PAYMENT_PRESETS.find(p => p.id === presetId)
    if (preset) {
      setPolkadotConfigs(prev => ({
        ...prev,
        paymentPreset: presetId,
        paymentChain: preset.chain,
        network: preset.chain,
      }))
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando configuraciones...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las configuraciones globales de la aplicación
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Validaciones de Distancia
          </CardTitle>
          <CardDescription>
            Activa o desactiva las validaciones de distancia para iniciar y completar viajes.
            Útil para pruebas y desarrollo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1 flex-1">
                <Label htmlFor="distance-start-trip" className="text-base font-semibold">
                  Validación de distancia para iniciar viaje
                </Label>
                <p className="text-sm text-muted-foreground">
                  Cuando está desactivada, los conductores pueden iniciar viajes sin estar cerca del origen.
                  <br />
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    ⚠️ Solo desactivar durante pruebas o desarrollo
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {configs?.distanceStartTrip ? (
                    <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Desactivada
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                      <CheckCircle2 className="h-3 w-3 inline mr-1" />
                      Activada
                    </span>
                  )}
                </div>
              </div>
              <Switch
                id="distance-start-trip"
                checked={configs?.distanceStartTrip || false}
                onCheckedChange={() => handleToggle('distanceStartTrip')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1 flex-1">
                <Label htmlFor="distance-end-trip" className="text-base font-semibold">
                  Validación de distancia para completar viaje
                </Label>
                <p className="text-sm text-muted-foreground">
                  Cuando está desactivada, los conductores pueden completar viajes sin estar cerca del destino.
                  <br />
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    ⚠️ Solo desactivar durante pruebas o desarrollo
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {configs?.distanceEndTrip ? (
                    <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Desactivada
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                      <CheckCircle2 className="h-3 w-3 inline mr-1" />
                      Activada
                    </span>
                  )}
                </div>
              </div>
              <Switch
                id="distance-end-trip"
                checked={configs?.distanceEndTrip || false}
                onCheckedChange={() => handleToggle('distanceEndTrip')}
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={loadConfigs}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Polkadot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Configuración de Pagos Polkadot
          </CardTitle>
          <CardDescription>
            Configura la cadena de Polkadot, presets de pago, dirección de la plataforma y porcentaje de comisión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Selección de Preset */}
            <div className="space-y-2">
              <Label htmlFor="payment-preset" className="text-base font-semibold">
                Preset de Pago
              </Label>
              <Select
                value={polkadotConfigs.paymentPreset || undefined}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger id="payment-preset">
                  <SelectValue placeholder="Selecciona un preset de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paset-hub-pas" className="font-semibold">
                    🧪 PAS en PassetHub (Testnet) - Recomendado para desarrollo
                  </SelectItem>
                  {PAYMENT_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.isTestnet ? '🧪 ' : '🔷 '}
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {polkadotConfigs.paymentPreset 
                  ? PAYMENT_PRESETS.find(p => p.id === polkadotConfigs.paymentPreset)?.name || ''
                  : 'Por defecto en desarrollo: PAS en PassetHub (Testnet)'}
              </p>
            </div>

            <Separator />

            {/* Cadena de Pago */}
            <div className="space-y-2">
              <Label htmlFor="payment-chain" className="text-base font-semibold">
                Cadena de Pago
              </Label>
              <Select
                value={polkadotConfigs.paymentChain || undefined}
                onValueChange={(value) => setPolkadotConfigs(prev => ({ ...prev, paymentChain: value, network: value }))}
              >
                <SelectTrigger id="payment-chain">
                  <SelectValue placeholder="Selecciona una cadena" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASET_HUB">🧪 PASET_HUB (Testnet - Paseo Asset Hub)</SelectItem>
                  <SelectItem value="ASSET_HUB">🔷 ASSET_HUB (Polkadot Asset Hub - Mainnet)</SelectItem>
                  <SelectItem value="ASSET_HUB_KUSAMA">🔶 ASSET_HUB_KUSAMA (Kusama Asset Hub - Mainnet)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                La cadena donde se procesarán los pagos. En desarrollo se recomienda PASET_HUB.
              </p>
            </div>

            <Separator />

            {/* Dirección de Plataforma */}
            <div className="space-y-2">
              <Label htmlFor="platform-address" className="text-base font-semibold">
                Dirección de Wallet de la Plataforma
              </Label>
              <Input
                id="platform-address"
                type="text"
                placeholder="Ej: 14zYzfk9otRrQgkHWvHxDrszdGvYWZdr1yEU61CtdAaRf54m"
                value={polkadotConfigs.platformAddress || ''}
                onChange={(e) => setPolkadotConfigs(prev => ({ ...prev, platformAddress: e.target.value || null }))}
              />
              <p className="text-xs text-muted-foreground">
                Dirección de wallet donde la plataforma recibirá el {polkadotConfigs.platformFeePercentage || 8}% de comisión de los pagos.
                Esta dirección debe estar en la misma cadena seleccionada arriba.
              </p>
            </div>

            <Separator />

            {/* Porcentaje de Fee */}
            <div className="space-y-2">
              <Label htmlFor="platform-fee" className="text-base font-semibold">
                Porcentaje de Comisión de la Plataforma (%)
              </Label>
              <Input
                id="platform-fee"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="8"
                value={polkadotConfigs.platformFeePercentage || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : null
                  setPolkadotConfigs(prev => ({ ...prev, platformFeePercentage: value }))
                }}
              />
              <p className="text-xs text-muted-foreground">
                Porcentaje que recibirá la plataforma de cada pago. El resto irá al conductor.
                Por defecto: 8% (92% para el conductor).
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={loadPolkadotConfigs}
              disabled={savingPolkadot}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSavePolkadot}
              disabled={savingPolkadot}
            >
              {savingPolkadot ? 'Guardando...' : 'Guardar Configuración de Polkadot'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
          <CardDescription>
            Las configuraciones se aplican inmediatamente después de guardar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Las validaciones de distancia están diseñadas para garantizar la seguridad y precisión de los viajes.
            </p>
            <p>
              • Desactivar estas validaciones solo debe hacerse durante pruebas o desarrollo.
            </p>
            <p>
              • En producción, estas validaciones deben estar siempre activadas.
            </p>
            <p>
              • La configuración de Polkadot permite seleccionar la cadena y preset de pago. En desarrollo se recomienda PASET_HUB con PAS.
            </p>
            <p>
              • La dirección de plataforma y porcentaje de fee son necesarios para dividir los pagos entre conductor y plataforma.
            </p>
            <p>
              • Última actualización: {new Date().toLocaleString('es-ES')} por {user?.name || 'Administrador'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

