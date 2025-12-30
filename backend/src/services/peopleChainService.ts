import { getPolkadotService } from './polkadotService'
import { toPolkadotAddress } from '../utils/addressUtils'
import type { DedotClient } from 'dedot'

/**
 * Servicio para interactuar con People Chain
 * People Chain es una parachain de Polkadot que gestiona identidades descentralizadas
 */
export class PeopleChainService {
  private client: DedotClient | null = null

  /**
   * Obtiene el cliente de People Chain
   */
  private async getClient(): Promise<DedotClient> {
    if (this.client) {
      return this.client
    }

    const polkadotService = getPolkadotService()
    // People Chain endpoint: wss://polkadot-people-rpc.polkadot.io
    try {
      this.client = await polkadotService.getClient('PEOPLE_CHAIN')
    } catch (error) {
      console.error('Error conectando a People Chain:', error)
      throw error
    }

    return this.client
  }

  /**
   * Obtiene la identidad de una dirección en People Chain
   * People Chain usa el pallet Identity para gestionar identidades
   * 
   * Endpoint: wss://polkadot-people-rpc.polkadot.io
   * Genesis Hash: 0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008
   * ✅ Verificado y funcional
   * 
   * NOTA: Convierte automáticamente la dirección a formato Polkadot (prefix 0)
   * porque People Chain requiere direcciones en este formato
   */
  async getIdentity(address: string): Promise<{
    hasIdentity: boolean
    displayName?: string
    legalName?: string
    email?: string
    web?: string
    twitter?: string
    riot?: string
    judgements?: any[]
    deposit?: bigint
  } | null> {
    try {
      const client = await this.getClient()

      // Convertir dirección a formato Polkadot (prefix 0) para People Chain
      const polkadotAddress = toPolkadotAddress(address)

      // People Chain tiene el pallet Identity disponible
      // Consultar la identidad registrada usando dirección en formato Polkadot
      // Parámetro: address (AccountId) - Dirección en formato SS58 (48 caracteres, prefix 0)
      // Según documentación Dedot: client.query.<pallet>.<storageEntry>
      const identity = await (client as any).query.identity.identityOf(polkadotAddress)

      // Validar estructura del resultado
      // Dedot puede retornar:
      // 1. Option<IdentityInfo> con { value: IdentityInfo } cuando hay identidad
      // 2. IdentityInfo directamente cuando hay identidad (sin Option wrapper)
      // 3. null o { value: null } cuando no hay identidad
      let identityData = null;
      
      if (identity) {
        if (identity.value !== undefined) {
          // Caso 1: Option<Some<IdentityInfo>> o Option<None>
          if (identity.value !== null) {
            identityData = identity.value;
          }
        } else if (identity.info !== undefined || identity.deposit !== undefined || identity.judgements !== undefined) {
          // Caso 2: IdentityInfo directamente (sin Option wrapper)
          identityData = identity;
        }
      }

      if (!identityData) {
        return {
          hasIdentity: false,
        }
      }

      // Función helper para extraer valor de Option<Data>
      // Los campos pueden venir como:
      // - { value: "texto" } - Formato común de Dedot
      // - { Raw: "0x..." } - Formato Raw (hex), necesita decodificación
      // - null/undefined - Campo no presente
      const extractDataValue = (field: any): string | undefined => {
        if (!field) return undefined;
        
        if (field.value !== undefined) {
          // Formato común: { value: "texto" }
          return typeof field.value === 'string' ? field.value : undefined;
        }
        
        if (field.Raw) {
          // Formato Raw: { Raw: "0x..." } - decodificar hex a string
          try {
            const hex = field.Raw.replace(/^0x/, '');
            return Buffer.from(hex, 'hex').toString('utf-8');
          } catch (e) {
            console.warn('Error decodificando Raw:', e);
            return undefined;
          }
        }
        
        // Si es string directo
        if (typeof field === 'string') {
          return field;
        }
        
        return undefined;
      };

      // Extraer campos de info (todos son Option<Data>)
      // display: Option<Data> - Nombre de display público
      // legal: Option<Data> - Nombre legal completo
      // email: Option<Data> - Dirección de email
      // web: Option<Data> - URL del sitio web
      // twitter: Option<Data> - Handle de Twitter
      // riot: Option<Data> - Identificador Riot/Matrix (también puede ser "matrix")
      // image: Option<Data> - Hash de imagen/avatar
      // pgpFingerprint: Option<[u8; 20]> - Fingerprint PGP
      // github: Option<Data> - Handle de GitHub (campo adicional)
      // discord: Option<Data> - Handle de Discord (campo adicional)
      return {
        hasIdentity: true,
        displayName: extractDataValue(identityData.info?.display),
        legalName: extractDataValue(identityData.info?.legal),
        email: extractDataValue(identityData.info?.email),
        web: extractDataValue(identityData.info?.web),
        twitter: extractDataValue(identityData.info?.twitter),
        riot: extractDataValue(identityData.info?.riot || identityData.info?.matrix), // matrix es el nombre actual
        // judgements: Vec<(RegistrarIndex, Judgement)>
        // Cada elemento es una tupla [RegistrarIndex: u32, Judgement: enum]
        // Judgement puede venir como string ("KnownGood") o objeto ({ type: "KnownGood" })
        judgements: (identityData.judgements || []).map((judgement: any) => {
          if (Array.isArray(judgement) && judgement.length >= 2) {
            const [regIndex, status] = judgement;
            // Normalizar status: puede ser string o { type: string }
            const normalizedStatus = typeof status === 'object' && status?.type 
              ? status.type 
              : (typeof status === 'string' ? status : String(status));
            return [regIndex, normalizedStatus];
          }
          return judgement;
        }),
        // deposit: Balance (u128) - Depósito pagado, en planck (1 DOT = 10^10 planck)
        deposit: identityData.deposit || 0n,
      }
    } catch (error: any) {
      console.error(`Error obteniendo identidad para ${address}:`, error.message || error)
      return {
        hasIdentity: false,
      }
    }
  }

  /**
   * Obtiene los super identidades (identidades verificadas) de una dirección
   */
  async getSuperIdentity(address: string): Promise<{
    hasSuperIdentity: boolean
    superIdentity?: string
    subIdentities?: string[]
  } | null> {
    try {
      const client = await this.getClient()

      // Convertir dirección a formato Polkadot (prefix 0) para People Chain
      const polkadotAddress = toPolkadotAddress(address)

      // Consultar super identidad usando dirección en formato Polkadot
      // Parámetro: address (AccountId) - Dirección de la sub-identidad
      // Retorna: Option<(AccountId, Data)>
      //   - [0]: AccountId - Dirección de la super identidad
      //   - [1]: Data - Datos adicionales (nombre de la sub-identidad, puede ser null)
      const superOf = await client.query.identity.superOf(polkadotAddress)

      if (!superOf) {
        return {
          hasSuperIdentity: false,
        }
      }

      // Desestructurar tupla: [superAccount: AccountId, data: Data]
      // En Dedot, las tuplas se acceden directamente como arrays
      const superOfArray = Array.isArray(superOf) ? superOf : [superOf]
      const [superAccount, data] = superOfArray.length >= 2 ? superOfArray : [superOfArray[0], null]
      const superAccountStr = typeof superAccount === 'string' ? superAccount : String(superAccount)

      return {
        hasSuperIdentity: true,
        superIdentity: superAccountStr, // AccountId (string, 48 caracteres SS58)
        subIdentities: data ? [polkadotAddress] : [], // Data puede ser null
      }
    } catch (error: any) {
      console.error(`Error obteniendo super identidad para ${address}:`, error.message || error)
      return null
    }
  }

  /**
   * Obtiene todas las sub-identidades de una super identidad
   */
  async getSubIdentities(superAddress: string): Promise<string[]> {
    try {
      const client = await this.getClient()

      // Convertir dirección a formato Polkadot (prefix 0) para People Chain
      const polkadotAddress = toPolkadotAddress(superAddress)

      // Consultar todas las sub-identidades usando dirección en formato Polkadot
      // Parámetro: address (AccountId) - Dirección de la super identidad
      // Retorna: (Balance, Vec<AccountId>)
      //   - [0]: Balance (bigint) - Depósito total de todas las sub-identidades
      //   - [1]: Vec<AccountId> (string[]) - Array de direcciones de sub-identidades
      const subsOf = await client.query.identity.subsOf(polkadotAddress)

      if (!subsOf) {
        return []
      }

      // Desestructurar tupla: [deposit: Balance, subAccounts: Vec<AccountId>]
      // En Dedot, las tuplas se acceden directamente como arrays
      const subsOfArray = Array.isArray(subsOf) ? subsOf : [subsOf]
      const [deposit, subAccounts] = subsOfArray.length >= 2 ? subsOfArray : [subsOfArray[0], []]
      // deposit: Balance (bigint) - No se usa en el retorno, pero está disponible
      // subAccounts: Vec<AccountId> (string[]) - Array de direcciones
      const subAccountsStr = Array.isArray(subAccounts) 
        ? subAccounts.map(acc => typeof acc === 'string' ? acc : String(acc))
        : []
      return subAccountsStr
    } catch (error: any) {
      console.error(`Error obteniendo sub-identidades para ${superAddress}:`, error.message || error)
      return []
    }
  }

  /**
   * Obtiene información completa de identidad incluyendo super y sub identidades
   */
  async getFullIdentity(address: string): Promise<{
    identity: {
      hasIdentity: boolean
      displayName?: string
      legalName?: string
      email?: string
      web?: string
      twitter?: string
      riot?: string
      judgements?: any[]
      deposit?: bigint
    } | null
    superIdentity: {
      hasSuperIdentity: boolean
      superIdentity?: string
      subIdentities?: string[]
    } | null
    subIdentities: string[]
  }> {
    const [identity, superIdentity, subIdentities] = await Promise.all([
      this.getIdentity(address),
      this.getSuperIdentity(address),
      this.getSubIdentities(address),
    ])

    return {
      identity,
      superIdentity,
      subIdentities,
    }
  }

  /**
   * Verifica si una dirección tiene una identidad verificada
   */
  async hasVerifiedIdentity(address: string): Promise<boolean> {
    try {
      const identity = await this.getIdentity(address)
      if (!identity || !identity.hasIdentity) {
        return false
      }

      // Una identidad está verificada si tiene judgements aprobados
      // judgements: Vec<(RegistrarIndex, Judgement)>
      // Cada judgement es una tupla: [RegistrarIndex: u32, Judgement: enum]
      // Judgement puede venir como string ("KnownGood") o objeto ({ type: "KnownGood" })
      const hasApprovedJudgements = identity.judgements?.some(
        (judgement: any) => {
          // Los judgements pueden ser: Unknown, FeePaid, Reasonable, KnownGood, OutOfDate, LowQuality, Erroneous
          // Consideramos verificadas las que tienen KnownGood o Reasonable
          // Estructura: [registrarIndex: number, judgementStatus: string | object]
          let status: string;
          if (Array.isArray(judgement) && judgement.length >= 2) {
            status = typeof judgement[1] === 'object' && judgement[1].type 
              ? judgement[1].type 
              : judgement[1];
          } else {
            status = typeof judgement === 'object' && judgement.type 
              ? judgement.type 
              : judgement;
          }
          return status === 'KnownGood' || status === 'Reasonable'
        }
      )

      return hasApprovedJudgements || false
    } catch (error) {
      console.error('Error verificando identidad:', error)
      return false
    }
  }

  /**
   * Obtiene el nombre de display de una identidad (o la dirección si no tiene)
   */
  async getDisplayName(address: string): Promise<string> {
    try {
      const identity = await this.getIdentity(address)
      if (identity?.displayName) {
        return identity.displayName
      }

      // Si tiene super identidad, usar el nombre de la super identidad
      const superIdentity = await this.getSuperIdentity(address)
      if (superIdentity?.superIdentity) {
        const superIdentityData = await this.getIdentity(superIdentity.superIdentity)
        if (superIdentityData?.displayName) {
          return superIdentityData.displayName
        }
      }

      // Fallback: usar dirección truncada
      return `${address.slice(0, 8)}...${address.slice(-8)}`
    } catch (error) {
      console.error('Error obteniendo display name:', error)
      return `${address.slice(0, 8)}...${address.slice(-8)}`
    }
  }

  /**
   * Obtiene información de registro de identidad (costos, requisitos, etc.)
   */
  async getIdentityRegistrationInfo(): Promise<{
    basicDeposit: bigint
    fieldDeposit: bigint
    subAccountDeposit: bigint
  } | null> {
    try {
      const client = await this.getClient()

      // Consultar constantes del pallet Identity
      const basicDeposit = await (client as any).constants?.identity?.basicDeposit?.() || 0n
      const fieldDeposit = await (client as any).constants?.identity?.fieldDeposit?.() || 0n
      const subAccountDeposit = await (client as any).constants?.identity?.subAccountDeposit?.() || 0n

      return {
        basicDeposit,
        fieldDeposit,
        subAccountDeposit,
      }
    } catch (error: any) {
      console.error('Error obteniendo información de registro:', error.message || error)
      return null
    }
  }
  
  /**
   * Obtiene la lista de registradores disponibles
   */
  async getRegistrars(): Promise<Array<{
    account: string
    fee: bigint
    fields: any
  }>> {
    try {
      const client = await this.getClient()
      // Consultar registradores
      // Parámetros: Ninguno
      // Retorna: Vec<Option<RegistrarInfo>>
      //   - Array de Option<RegistrarInfo>
      //   - Cada elemento puede ser: { value: RegistrarInfo } o null (slot vacío)
      const registrars = await (client as any).query.identity.registrars()
      
      if (!registrars || !Array.isArray(registrars)) {
        return []
      }
      
      // RegistrarInfo = { account: AccountId, fee: Balance, fields: IdentityFields }
      // Mapear y filtrar solo los registradores activos (con value)
      return registrars
        .filter((reg: any) => reg && reg.value) // Filtrar slots vacíos
        .map((reg: any) => {
          const registrar = reg.value
          return {
            // account: AccountId (string, 48 caracteres SS58)
            account: registrar.account || registrar[0] || '',
            // fee: Balance (bigint) - Tarifa para registro, en planck
            fee: registrar.fee || registrar[1]?.fee || 0n,
            // fields: IdentityFields - Objeto con flags booleanos para cada campo
            fields: registrar.fields || registrar[1]?.fields || null,
          }
        })
    } catch (error: any) {
      console.error('Error obteniendo registradores:', error.message || error)
      return []
    }
  }
}

// Instancia singleton
let peopleChainServiceInstance: PeopleChainService | null = null

export function getPeopleChainService(): PeopleChainService {
  if (!peopleChainServiceInstance) {
    peopleChainServiceInstance = new PeopleChainService()
  }
  return peopleChainServiceInstance
}

