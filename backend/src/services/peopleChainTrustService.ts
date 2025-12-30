import { getPeopleChainService } from './peopleChainService'
import { toPolkadotAddress } from '../utils/addressUtils'

/**
 * Servicio para evaluar la confiabilidad de usuarios basado en People Chain
 */
export class PeopleChainTrustService {
  /**
   * Evalúa la confiabilidad de una dirección basado en People Chain
   * Considera: judgements, registrars, y estado de verificación
   */
  async evaluateTrustworthiness(address: string): Promise<{
    isTrustworthy: boolean
    trustScore: number // 0-100
    hasIdentity: boolean
    isVerified: boolean
    judgements: Array<{
      registrarIndex: number
      judgement: string
      isPositive: boolean
    }>
    verifiedByRegistrars: number
    trustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
    reasons: string[]
  }> {
    const peopleChainService = getPeopleChainService()
    const polkadotAddress = toPolkadotAddress(address)

    const reasons: string[] = []
    let trustScore = 0
    let hasIdentity = false
    let isVerified = false
    let verifiedByRegistrars = 0
    const judgements: Array<{
      registrarIndex: number
      judgement: string
      isPositive: boolean
    }> = []

    try {
      // Obtener identidad completa
      const fullIdentity = await peopleChainService.getFullIdentity(polkadotAddress)
      
      if (!fullIdentity.identity || !fullIdentity.identity.hasIdentity) {
        return {
          isTrustworthy: false,
          trustScore: 0,
          hasIdentity: false,
          isVerified: false,
          judgements: [],
          verifiedByRegistrars: 0,
          trustLevel: 'NONE',
          reasons: ['No tiene identidad registrada en People Chain'],
        }
      }

      hasIdentity = true
      trustScore += 20 // Base por tener identidad

      // Evaluar judgements
      if (fullIdentity.identity.judgements && fullIdentity.identity.judgements.length > 0) {
        const positiveJudgements = ['KnownGood', 'Reasonable', 'FeePaid']
        const negativeJudgements = ['Erroneous', 'LowQuality', 'OutOfDate']

        for (const judgement of fullIdentity.identity.judgements) {
          let registrarIndex = 0
          let judgementValue = 'Unknown'

          // Parsear el formato del judgement
          if (Array.isArray(judgement)) {
            registrarIndex = typeof judgement[0] === 'number' ? judgement[0] : 0
            judgementValue = judgement[1] || 'Unknown'
          } else if (typeof judgement === 'object' && judgement !== null) {
            registrarIndex = (judgement as any).registrarIndex || 0
            judgementValue = (judgement as any).judgement || 'Unknown'
          } else {
            judgementValue = String(judgement)
          }

          const isPositive = positiveJudgements.includes(judgementValue)
          const isNegative = negativeJudgements.includes(judgementValue)

          judgements.push({
            registrarIndex,
            judgement: judgementValue,
            isPositive,
          })

          if (isPositive) {
            verifiedByRegistrars++
            if (judgementValue === 'KnownGood') {
              trustScore += 40
              reasons.push(`Verificado como "KnownGood" por registrador ${registrarIndex}`)
            } else if (judgementValue === 'Reasonable') {
              trustScore += 25
              reasons.push(`Verificado como "Reasonable" por registrador ${registrarIndex}`)
            } else if (judgementValue === 'FeePaid') {
              trustScore += 10
              reasons.push(`Pago de tarifa realizado al registrador ${registrarIndex}`)
            }
          } else if (isNegative) {
            trustScore -= 30
            reasons.push(`Advertencia: ${judgementValue} del registrador ${registrarIndex}`)
          }
        }
      }

      // Verificar si tiene información adicional que aumenta confiabilidad
      if (fullIdentity.identity.displayName) {
        trustScore += 5
        reasons.push('Tiene nombre de display registrado')
      }
      if (fullIdentity.identity.legalName) {
        trustScore += 5
        reasons.push('Tiene nombre legal registrado')
      }
      if (fullIdentity.identity.email) {
        trustScore += 5
        reasons.push('Tiene email registrado')
      }
      if (fullIdentity.identity.web) {
        trustScore += 3
        reasons.push('Tiene sitio web registrado')
      }
      if (fullIdentity.identity.twitter) {
        trustScore += 2
        reasons.push('Tiene Twitter registrado')
      }

      // Verificar super identidad (aumenta confiabilidad)
      if (fullIdentity.superIdentity?.hasSuperIdentity) {
        trustScore += 10
        reasons.push('Tiene super identidad verificada')
      }

      // Limitar score entre 0 y 100
      trustScore = Math.max(0, Math.min(100, trustScore))

      // Determinar si está verificado
      isVerified = verifiedByRegistrars > 0 && trustScore >= 30

      // Determinar nivel de confianza
      let trustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
      if (trustScore >= 70) {
        trustLevel = 'HIGH'
      } else if (trustScore >= 40) {
        trustLevel = 'MEDIUM'
      } else if (trustScore >= 20) {
        trustLevel = 'LOW'
      } else {
        trustLevel = 'NONE'
      }

      // Determinar si es confiable (mínimo MEDIUM con al menos un registrador)
      const isTrustworthy = trustLevel !== 'NONE' && verifiedByRegistrars > 0

      return {
        isTrustworthy,
        trustScore,
        hasIdentity,
        isVerified,
        judgements,
        verifiedByRegistrars,
        trustLevel,
        reasons,
      }
    } catch (error: any) {
      console.error(`Error evaluando confiabilidad para ${polkadotAddress}:`, error)
      return {
        isTrustworthy: false,
        trustScore: 0,
        hasIdentity: false,
        isVerified: false,
        judgements: [],
        verifiedByRegistrars: 0,
        trustLevel: 'NONE',
        reasons: [`Error al evaluar: ${error.message || 'Error desconocido'}`],
      }
    }
  }

  /**
   * Obtiene información detallada de los registradores que verificaron una identidad
   */
  async getRegistrarDetails(address: string): Promise<Array<{
    registrarIndex: number
    registrarAccount: string
    judgement: string
    fee: bigint
    isVerified: boolean
  }>> {
    const peopleChainService = getPeopleChainService()
    const polkadotAddress = toPolkadotAddress(address)

    try {
      const fullIdentity = await peopleChainService.getFullIdentity(polkadotAddress)
      const registrars = await peopleChainService.getRegistrars()

      if (!fullIdentity.identity?.judgements || fullIdentity.identity.judgements.length === 0) {
        return []
      }

      const registrarMap = new Map(
        registrars.map((reg, index) => [index, reg])
      )

      return fullIdentity.identity.judgements.map((judgement: any) => {
        let registrarIndex = 0
        let judgementValue = 'Unknown'

        if (Array.isArray(judgement)) {
          registrarIndex = typeof judgement[0] === 'number' ? judgement[0] : 0
          judgementValue = judgement[1] || 'Unknown'
        } else if (typeof judgement === 'object' && judgement !== null) {
          registrarIndex = (judgement as any).registrarIndex || 0
          judgementValue = (judgement as any).judgement || 'Unknown'
        }

        const registrar = registrarMap.get(registrarIndex)
        const positiveJudgements = ['KnownGood', 'Reasonable', 'FeePaid']

        return {
          registrarIndex,
          registrarAccount: registrar?.account || 'Unknown',
          judgement: judgementValue,
          fee: registrar?.fee || 0n,
          isVerified: positiveJudgements.includes(judgementValue),
        }
      })
    } catch (error: any) {
      console.error(`Error obteniendo detalles de registradores para ${polkadotAddress}:`, error)
      return []
    }
  }
}

export const peopleChainTrustService = new PeopleChainTrustService()







