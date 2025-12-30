import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { 
  User, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Mail,
  Globe,
  Twitter,
  MessageCircle
} from 'lucide-react'

interface PeopleChainIdentityProps {
  address: string
}

interface IdentityData {
  hasIdentity: boolean
  displayName?: string
  legalName?: string
  email?: string
  web?: string
  twitter?: string
  riot?: string
  judgements?: any[]
  deposit?: string
  superIdentity?: {
    account: string
    displayName?: string
  } | null
  subIdentities?: Array<{
    account: string
    displayName?: string
  }>
}

export function PeopleChainIdentity({ address }: PeopleChainIdentityProps) {
  const [identity, setIdentity] = useState<IdentityData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchIdentity = async (showLoading = true) => {
    if (!address) {
      console.warn('PeopleChainIdentity: No address provided')
      return
    }

    try {
      if (showLoading) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }

      console.log('PeopleChainIdentity: Fetching identity for address:', address)
      const data = await api.getPeopleChainFullIdentity(address)
      console.log('PeopleChainIdentity: Received data:', data)
      
      // Asegurarse de que la estructura de datos sea correcta
      if (data) {
        // Si viene identity directamente, usar esa estructura
        if (data.identity) {
          setIdentity({
            hasIdentity: data.identity.hasIdentity || false,
            displayName: data.identity.displayName,
            legalName: data.identity.legalName,
            email: data.identity.email,
            web: data.identity.web,
            twitter: data.identity.twitter,
            riot: data.identity.riot,
            judgements: data.identity.judgements,
            deposit: data.identity.deposit,
            superIdentity: data.superIdentity,
            subIdentities: data.subIdentities,
          })
        } else {
          // Si viene la estructura completa directamente
          setIdentity(data)
        }
      } else {
        setIdentity({ hasIdentity: false })
      }
    } catch (error: any) {
      console.error('PeopleChainIdentity: Error obteniendo identidad:', error)
      console.error('PeopleChainIdentity: Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
      })
      
      // Si no hay identidad, no es un error crítico
      if (error.response?.status === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.log('PeopleChainIdentity: No identity found (404)')
        setIdentity({ hasIdentity: false })
      } else if (error.response?.status === 500) {
        toast.error('Error del servidor al obtener identidad de People Chain')
        setIdentity({ hasIdentity: false })
      } else {
        toast.error(error.message || 'Error al obtener identidad de People Chain')
        setIdentity({ hasIdentity: false })
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchIdentity()
  }, [address])

  const handleRefresh = async () => {
    console.log('PeopleChainIdentity: Refresh button clicked')
    await fetchIdentity(false)
    // Mostrar feedback visual después del refresh
    if (identity?.hasIdentity) {
      toast.success('Identidad actualizada')
    }
  }

  const getJudgementStatus = (judgements?: any[]) => {
    if (!judgements || judgements.length === 0) {
      return { status: 'unknown', label: 'Sin verificar', color: 'secondary' as const }
    }

    // Buscar el juicio más favorable
    const hasKnownGood = judgements.some((j: any) => 
      j === 'KnownGood' || j[1] === 'KnownGood' || j?.judgement === 'KnownGood'
    )
    const hasReasonable = judgements.some((j: any) => 
      j === 'Reasonable' || j[1] === 'Reasonable' || j?.judgement === 'Reasonable'
    )
    const hasFeePaid = judgements.some((j: any) => 
      j === 'FeePaid' || j[1] === 'FeePaid' || j?.judgement === 'FeePaid'
    )

    if (hasKnownGood) {
      return { status: 'verified', label: 'Verificado', color: 'default' as const }
    }
    if (hasReasonable) {
      return { status: 'reasonable', label: 'Razonable', color: 'secondary' as const }
    }
    if (hasFeePaid) {
      return { status: 'feePaid', label: 'Pago realizado', color: 'outline' as const }
    }

    return { status: 'pending', label: 'Pendiente', color: 'secondary' as const }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Identidad People Chain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando identidad...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!identity || !identity.hasIdentity) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Identidad People Chain</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              title="Actualizar identidad"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>
            Identidad descentralizada en People Chain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <XCircle className="h-5 w-5" />
            <span>No hay identidad registrada en People Chain</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Registra tu identidad en People Chain para verificar tu información de forma descentralizada.
          </p>
        </CardContent>
      </Card>
    )
  }

  const judgementInfo = getJudgementStatus(identity.judgements)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Identidad People Chain</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={judgementInfo.color}>
              {judgementInfo.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              title="Actualizar identidad"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Identidad descentralizada verificada en People Chain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información Principal */}
        <div className="space-y-3">
          {identity.displayName && (
            <div>
              <Label className="text-xs text-muted-foreground">Nombre de Display</Label>
              <p className="font-semibold">{identity.displayName}</p>
            </div>
          )}

          {identity.legalName && (
            <div>
              <Label className="text-xs text-muted-foreground">Nombre Legal</Label>
              <p className="text-sm">{identity.legalName}</p>
            </div>
          )}

          {/* Información de Contacto */}
          {(identity.email || identity.web || identity.twitter || identity.riot) && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">Información de Contacto</Label>
              <div className="space-y-2">
                {identity.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${identity.email}`}
                      className="text-primary hover:underline"
                    >
                      {identity.email}
                    </a>
                  </div>
                )}
                {identity.web && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={identity.web.startsWith('http') ? identity.web : `https://${identity.web}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {identity.web}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {identity.twitter && (
                  <div className="flex items-center gap-2 text-sm">
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`https://twitter.com/${identity.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {identity.twitter}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {identity.riot && (
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{identity.riot}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Super Identidad */}
          {identity.superIdentity && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">Super Identidad</Label>
              <div className="bg-muted p-2 rounded">
                <p className="text-sm font-mono text-xs break-all">
                  {identity.superIdentity.account}
                </p>
                {identity.superIdentity.displayName && (
                  <p className="text-sm mt-1">{identity.superIdentity.displayName}</p>
                )}
              </div>
            </div>
          )}

          {/* Sub Identidades */}
          {identity.subIdentities && identity.subIdentities.length > 0 && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Sub Identidades ({identity.subIdentities.length})
              </Label>
              <div className="space-y-2">
                {identity.subIdentities.map((sub, index) => (
                  <div key={index} className="bg-muted p-2 rounded">
                    <p className="text-sm font-mono text-xs break-all">
                      {sub.account}
                    </p>
                    {sub.displayName && (
                      <p className="text-sm mt-1">{sub.displayName}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deposit */}
          {identity.deposit && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Depósito</Label>
              <p className="text-sm">
                {(Number(identity.deposit) / 1e10).toFixed(4)} DOT
              </p>
            </div>
          )}

          {/* Judgements */}
          {identity.judgements && identity.judgements.length > 0 && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">Verificaciones (Judgements)</Label>
              <div className="space-y-2">
                {identity.judgements.map((judgement: any, index: number) => {
                  const registrarIndex = Array.isArray(judgement) ? judgement[0] : judgement.registrarIndex || index
                  const status = Array.isArray(judgement) ? judgement[1] : (judgement.status || judgement.judgement || judgement)
                  const statusText = typeof status === 'string' ? status : (status?.type || status?.judgement || 'Unknown')
                  
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'KnownGood':
                        return 'default'
                      case 'Reasonable':
                        return 'secondary'
                      case 'FeePaid':
                        return 'outline'
                      case 'OutOfDate':
                      case 'LowQuality':
                        return 'destructive'
                      case 'Erroneous':
                        return 'destructive'
                      default:
                        return 'secondary'
                    }
                  }

                  const getStatusLabel = (status: string) => {
                    switch (status) {
                      case 'KnownGood':
                        return 'Conocido y Bueno'
                      case 'Reasonable':
                        return 'Razonable'
                      case 'FeePaid':
                        return 'Tarifa Pagada'
                      case 'OutOfDate':
                        return 'Desactualizado'
                      case 'LowQuality':
                        return 'Baja Calidad'
                      case 'Erroneous':
                        return 'Erróneo'
                      case 'Unknown':
                        return 'Desconocido'
                      default:
                        return status
                    }
                  }

                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Registrador {registrarIndex}:</span>
                        <Badge variant={getStatusColor(statusText) as any}>
                          {getStatusLabel(statusText)}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Deposit */}
          {identity.deposit && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Depósito</Label>
              <p className="text-sm">
                {typeof identity.deposit === 'string' 
                  ? `${(Number(identity.deposit) / 1e10).toFixed(4)} DOT`
                  : `${(Number(identity.deposit) / 1e10).toFixed(4)} DOT`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

