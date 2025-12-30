/**
 * Página para que las autoridades puedan leer y decodificar eventos de emergencia
 * directamente desde la blockchain
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Wallet,
  Search,
  Loader2,
  ExternalLink,
  MapPin,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  Activity,
  Clock,
  Users,
  Hash,
  Radio,
} from 'lucide-react'
import { api } from '@/services/api'
import type { ChainName } from '@/services/polkadotService'
import { createBlockchainMonitor, type BlockchainMonitorData, type EmergencyRemark } from '@/services/blockchainMonitorService'

interface DecodedEmergency {
  emergencyId: string
  reporter: string
  emergencyType: string
  severity: string
  latitude: number
  longitude: number
  timestamp: number
  title?: string
  description?: string
  numberOfPeople?: number
  address?: string
  city?: string
  country?: string
  blockNumber: string
  blockHash: string
  txHash: string
  rawData: any
}

export default function BlockchainEvents() {
  const { t } = useTranslation()
  const [searchType, setSearchType] = useState<'txHash' | 'block' | 'range' | 'recent'>('txHash')
  const [txHash, setTxHash] = useState('')
  const [blockNumber, setBlockNumber] = useState('')
  const [fromBlock, setFromBlock] = useState('')
  const [toBlock, setToBlock] = useState('')
  const [lastNBlocks, setLastNBlocks] = useState('100')
  const [chain, setChain] = useState<ChainName>('PASET_HUB')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DecodedEmergency[]>([])
  
  // Estado para monitoreo en tiempo real
  const [monitorData, setMonitorData] = useState<BlockchainMonitorData | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const monitorRef = useRef<ReturnType<typeof createBlockchainMonitor> | null>(null)

  const getExplorerUrl = (hash: string) => {
    switch (chain) {
      case 'PASET_HUB':
        return `https://paseo.subscan.io/extrinsic/${hash}`
      case 'PEOPLE_CHAIN':
        return `https://polkadot.subscan.io/extrinsic/${hash}`
      default:
        return `https://subscan.io/extrinsic/${hash}`
    }
  }

  const handleSearch = async () => {
    setIsLoading(true)
    setResults([])

    try {
      switch (searchType) {
        case 'txHash':
          if (!txHash) {
            toast.error('TX Hash es requerido')
            return
          }
          const txResult = await api.decodeEmergencyFromTxHash(txHash, chain)
          if (txResult.emergency) {
            setResults([txResult.emergency])
            toast.success('Emergencia decodificada exitosamente')
          } else {
            toast.error('No se encontró una emergencia válida en esta transacción')
          }
          break

        case 'block':
          if (!blockNumber) {
            toast.error('Número de bloque es requerido')
            return
          }
          const blockResult = await api.decodeEmergenciesFromBlock(parseInt(blockNumber), chain)
          setResults(blockResult.emergencies)
          toast.success(`Se encontraron ${blockResult.count} emergencia(s) en el bloque`)
          break

        case 'range':
          if (!fromBlock || !toBlock) {
            toast.error('Rango de bloques es requerido')
            return
          }
          const rangeResult = await api.searchEmergenciesInRange(
            parseInt(fromBlock),
            parseInt(toBlock),
            chain
          )
          setResults(rangeResult.emergencies)
          toast.success(`Se encontraron ${rangeResult.count} emergencia(s) en el rango`)
          break

        case 'recent':
          const recentResult = await api.getRecentEmergencies(parseInt(lastNBlocks) || 100, chain)
          setResults(recentResult.emergencies)
          toast.success(`Se encontraron ${recentResult.count} emergencia(s) reciente(s)`)
          break
      }
    } catch (error: any) {
      console.error('Error buscando emergencias:', error)
      toast.error(error.message || 'Error al buscar emergencias en la blockchain')
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-500'
      case 'MEDIUM': return 'bg-yellow-500'
      case 'HIGH': return 'bg-orange-500'
      case 'CRITICAL': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Iniciar/detener monitoreo en tiempo real
  useEffect(() => {
    const startMonitoring = async () => {
      if (monitorRef.current) {
        monitorRef.current.stop()
      }

      try {
        const monitor = createBlockchainMonitor(chain, {
          onUpdate: (data) => {
            setMonitorData(data)
            setIsMonitoring(true)
          },
          onEmergencyDetected: (remark) => {
            toast.success(`🚨 Emergencia detectada en bloque ${remark.blockNumber}`, {
              description: `Tipo: ${remark.emergencyType || 'N/A'} | Severidad: ${remark.severity || 'N/A'}`,
            })
          },
          onError: (error) => {
            console.error('Error en monitor:', error)
            setIsMonitoring(false)
            toast.error('Error en monitoreo de blockchain')
          },
        })

        monitorRef.current = monitor
        await monitor.start()
      } catch (error: any) {
        console.error('Error iniciando monitor:', error)
        setIsMonitoring(false)
        toast.error(`Error iniciando monitor: ${error.message}`)
      }
    }

    startMonitoring()

    return () => {
      if (monitorRef.current) {
        monitorRef.current.stop()
        monitorRef.current = null
      }
    }
  }, [chain])

  // Formatear tiempo relativo
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `hace ${seconds}s`
    if (minutes < 60) return `hace ${minutes}m`
    if (hours < 24) return `hace ${hours}h`
    return date.toLocaleString('es-ES')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-8 w-8 text-blue-500" />
          Eventos de Emergencia en Blockchain
        </h1>
        <p className="text-muted-foreground mt-2">
          Lee y decodifica eventos de emergencia directamente desde la blockchain de Polkadot
        </p>
      </div>

      {/* Ventana de Monitoreo en Tiempo Real */}
      <Card className="mb-6 border-2 border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Monitoreo en Tiempo Real
            {isMonitoring && (
              <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-500">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                Conectado
              </Badge>
            )}
            {!isMonitoring && monitorData === null && (
              <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-500">
                Conectando...
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Estado actual de la cadena {chain} - Solo detecta remarks de emergencia (v: 1)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monitorData ? (
            <div className="space-y-4">
              {/* Información del Bloque Actual */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Bloque</span>
                  </div>
                  <p className="text-2xl font-bold font-mono">{monitorData.blockNumber.toLocaleString()}</p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">Tiempo</span>
                  </div>
                  <p className="text-sm font-mono">{monitorData.timestamp.toLocaleTimeString('es-ES')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(monitorData.lastUpdate)}
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Altura</span>
                  </div>
                  <p className="text-2xl font-bold font-mono">{monitorData.blockNumber.toLocaleString()}</p>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">Validadores</span>
                  </div>
                  <p className="text-2xl font-bold">{monitorData.validatorCount}</p>
                  {monitorData.validators.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {monitorData.validators[0].slice(0, 10)}...
                    </p>
                  )}
                </div>
              </div>

              {/* Block Hash */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="h-4 w-4" />
                  <span className="text-sm font-medium">Block Hash:</span>
                </div>
                <code className="text-xs font-mono break-all">{monitorData.blockHash}</code>
              </div>

              {/* Validadores (si hay) */}
              {monitorData.validators.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Validadores Activos:</span>
                    <Badge variant="outline">{monitorData.validators.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {monitorData.validators.slice(0, 10).map((validator, idx) => (
                      <code key={idx} className="text-xs font-mono p-1 bg-background rounded truncate">
                        {validator.slice(0, 20)}...
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks de Emergencia Detectados */}
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Remarks de Emergencia Detectados:</span>
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-500">
                    {monitorData.emergencyRemarks.length}
                  </Badge>
                </div>
                {monitorData.emergencyRemarks.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {monitorData.emergencyRemarks.map((remark, idx) => (
                      <div key={idx} className="p-2 bg-background rounded border border-red-200 dark:border-red-800">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSeverityColor(remark.severity || 'HIGH')} variant="outline">
                                {remark.severity || 'N/A'}
                              </Badge>
                              <span className="text-xs font-medium">{remark.emergencyType || 'N/A'}</span>
                            </div>
                            <div className="text-xs space-y-1 text-muted-foreground">
                              <div>
                                <span className="font-medium">Bloque:</span> {remark.blockNumber}
                              </div>
                              <div>
                                <span className="font-medium">Reporter:</span>{' '}
                                <code className="font-mono">{remark.reporter.slice(0, 20)}...</code>
                              </div>
                              <div>
                                <span className="font-medium">Tiempo:</span>{' '}
                                {new Date(remark.timestamp).toLocaleString('es-ES')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No se han detectado remarks de emergencia recientemente</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Conectando a la blockchain...</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Buscar Emergencias</CardTitle>
          <CardDescription>
            Selecciona el método de búsqueda y proporciona los datos necesarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de tipo de búsqueda */}
          <div className="space-y-2">
            <Label htmlFor="search-type">Tipo de Búsqueda</Label>
            <Select value={searchType} onValueChange={(value: typeof searchType) => setSearchType(value)}>
              <SelectTrigger id="search-type">
                <SelectValue placeholder="Selecciona tipo de búsqueda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txHash">Por TX Hash</SelectItem>
                <SelectItem value="block">Por Bloque</SelectItem>
                <SelectItem value="range">Por Rango</SelectItem>
                <SelectItem value="recent">Recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selector de chain */}
          <div className="space-y-2">
            <Label htmlFor="chain-select">Cadena</Label>
            <Select value={chain} onValueChange={(value: ChainName) => setChain(value)}>
              <SelectTrigger id="chain-select">
                <SelectValue placeholder="Selecciona una cadena" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PASET_HUB">PASET_HUB (Testnet)</SelectItem>
                <SelectItem value="PEOPLE_CHAIN">PEOPLE_CHAIN (Mainnet)</SelectItem>
                <SelectItem value="POLKADOT">POLKADOT</SelectItem>
                <SelectItem value="KUSAMA">KUSAMA</SelectItem>
                <SelectItem value="ASSET_HUB">ASSET_HUB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campos según tipo de búsqueda */}
          {searchType === 'txHash' && (
            <div>
              <Label>TX Hash</Label>
              <Input
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="mt-2 font-mono"
              />
            </div>
          )}

          {searchType === 'block' && (
            <div>
              <Label>Número de Bloque</Label>
              <Input
                type="number"
                placeholder="123456"
                value={blockNumber}
                onChange={(e) => setBlockNumber(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          {searchType === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Desde Bloque</Label>
                <Input
                  type="number"
                  placeholder="123456"
                  value={fromBlock}
                  onChange={(e) => setFromBlock(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Hasta Bloque</Label>
                <Input
                  type="number"
                  placeholder="123500"
                  value={toBlock}
                  onChange={(e) => setToBlock(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {searchType === 'recent' && (
            <div>
              <Label>Últimos N Bloques</Label>
              <Input
                type="number"
                placeholder="100"
                value={lastNBlocks}
                onChange={(e) => setLastNBlocks(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          <Button onClick={handleSearch} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados ({results.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((emergency, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          {emergency.title || 'Emergencia sin título'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          ID: {emergency.emergencyId}
                        </p>
                      </div>
                      <Badge className={getSeverityColor(emergency.severity)}>
                        {emergency.severity}
                      </Badge>
                    </div>

                    {/* Información básica */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Tipo:</span> {emergency.emergencyType}
                      </div>
                      <div>
                        <span className="font-medium">Severidad:</span> {emergency.severity}
                      </div>
                      <div>
                        <span className="font-medium">Personas:</span> {emergency.numberOfPeople || 1}
                      </div>
                      <div>
                        <span className="font-medium">Fecha:</span>{' '}
                        {new Date(emergency.timestamp).toLocaleString('es-ES')}
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">Ubicación:</span>
                      </div>
                      <div className="ml-6 mt-1 space-y-1 text-sm text-muted-foreground">
                        {emergency.address && <p>{emergency.address}</p>}
                        {(emergency.city || emergency.country) && (
                          <p>
                            {emergency.city && `${emergency.city}, `}
                            {emergency.country}
                          </p>
                        )}
                        <p className="font-mono">
                          {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>

                    {/* Descripción */}
                    {emergency.description && (
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">Descripción:</span>
                        </div>
                        <p className="ml-6 mt-1 text-sm text-muted-foreground">
                          {emergency.description}
                        </p>
                      </div>
                    )}

                    {/* Información de Blockchain */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Wallet className="h-4 w-4 text-blue-500" />
                        Información de Blockchain
                      </div>
                      <div className="ml-6 space-y-1 text-xs">
                        <div>
                          <span className="font-medium">Reporter:</span>
                          <code className="ml-2 font-mono">{emergency.reporter}</code>
                        </div>
                        <div>
                          <span className="font-medium">TX Hash:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="font-mono break-all">{emergency.txHash}</code>
                            <a
                              href={getExplorerUrl(emergency.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver
                            </a>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Bloque:</span>
                          <span className="ml-2 font-mono">{emergency.blockNumber}</span>
                        </div>
                        <div>
                          <span className="font-medium">Block Hash:</span>
                          <code className="ml-2 font-mono text-xs break-all">
                            {emergency.blockHash}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Datos Raw (expandible) */}
                    <details className="border-t pt-4">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                        Ver datos raw (JSON)
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(emergency.rawData, null, 2)}
                      </pre>
                    </details>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

