/**
 * Servicio principal para gestionar emergencias desde la blockchain
 * Integra el listener de blockchain con la base de datos y notificaciones
 */

import { PrismaClient } from '@prisma/client'
import { createEmergencyListener, type EmergencyOnChainEvent } from './emergencyBlockchainListener'
import type { ChainName } from './polkadotService'

const prisma = new PrismaClient()

/**
 * Servicio para gestionar emergencias desde la blockchain
 */
export class EmergencyBlockchainService {
  private listener: ReturnType<typeof createEmergencyListener> | null = null
  private chain: ChainName

  constructor(chain: ChainName = 'PASET_HUB') {
    this.chain = chain
  }

  /**
   * Inicia el servicio de escucha de emergencias
   */
  async start(): Promise<void> {
    if (this.listener) {
      console.warn('⚠️ El listener ya está iniciado')
      return
    }

    this.listener = createEmergencyListener(this.chain, {
      onEmergencyDetected: async (emergency) => {
        await this.handleEmergencyDetected(emergency)
      },
      onError: (error) => {
        console.error('❌ Error en listener de emergencias:', error)
      },
    })

    await this.listener.start()
    console.log('✅ Servicio de emergencias blockchain iniciado')
  }

  /**
   * Maneja una emergencia detectada en la blockchain
   */
  private async handleEmergencyDetected(emergency: EmergencyOnChainEvent): Promise<void> {
    try {
      console.log(`📥 Procesando emergencia desde blockchain: ${emergency.emergencyId}`)

      // Verificar si la emergencia ya existe (por txHash en metadata)
      // Buscar todas las emergencias y filtrar por metadata.onChainTxHash
      const allEmergencies = await prisma.emergency.findMany({
        where: {
          metadata: {
            not: null,
          },
        },
        select: {
          id: true,
          metadata: true,
        },
      })
      
      const existing = allEmergencies.find((e: any) => 
        e.metadata && (e.metadata as any).onChainTxHash === emergency.txHash
      )

      if (existing) {
        console.log(`⚠️ Emergencia ya existe en BD: ${existing.id}`)
        return
      }

      // Buscar usuario por dirección de wallet (si está vinculada)
      let user = await prisma.user.findFirst({
        where: {
          walletAddress: emergency.reporter,
        },
      })

      // Si no hay usuario vinculado, crear o usar usuario sistema para emergencias blockchain
      if (!user) {
        console.warn(`⚠️ No se encontró usuario con wallet address: ${emergency.reporter}`)
        console.log('🔧 Creando/buscando usuario sistema para emergencias blockchain...')
        
        // Buscar o crear usuario sistema para emergencias blockchain
        user = await prisma.user.upsert({
          where: { email: `blockchain-emergency-${emergency.reporter.slice(0, 8)}@system.local` },
          update: {},
          create: {
            email: `blockchain-emergency-${emergency.reporter.slice(0, 8)}@system.local`,
            name: `Usuario Blockchain (${emergency.reporter.slice(0, 8)}...)`,
            walletAddress: emergency.reporter,
            role: 'PASSENGER', // Rol por defecto
            isActive: true,
            password: 'system-generated', // Password dummy, nunca se usará
          },
        })
        
        console.log(`✅ Usuario sistema creado/encontrado: ${user.id}`)
      }

      // Generar número de emergencia único
      const emergencyNumber = `EMG-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const created = await prisma.emergency.create({
        data: {
          emergencyNumber,
          reportedBy: user.id,
          emergencyType: emergency.emergencyType,
          severity: emergency.severity,
          latitude: emergency.latitude,
          longitude: emergency.longitude,
          title: emergency.title || 'Emergencia desde blockchain',
          description: emergency.description || '',
          numberOfPeople: emergency.numberOfPeople || 1,
          address: emergency.address,
          city: emergency.city,
          country: emergency.country,
          status: 'REPORTED',
          metadata: {
            onChainTxHash: emergency.txHash,
            onChainBlockNumber: emergency.blockNumber,
            onChainEmergencyId: emergency.emergencyId,
            reporterWallet: emergency.reporter,
          },
        },
      })

      console.log(`✅ Emergencia creada en BD: ${created.id}`)

      // Notificar a servicios de emergencia (si es crítico o alta severidad)
      if (emergency.severity === 'CRITICAL' || emergency.severity === 'HIGH') {
        await this.notifyEmergencyServices(created)
      }
      
      // También crear alertas en la BD para tracking
      await this.createEmergencyAlerts(created)
    } catch (error: any) {
      console.error('❌ Error procesando emergencia desde blockchain:', error)
      throw error
    }
  }

  /**
   * Notifica a servicios de emergencia externos
   */
  private async notifyEmergencyServices(emergency: any): Promise<void> {
    // Aquí puedes integrar con APIs de servicios de emergencia
    // Por ejemplo: llamadas a APIs de bomberos, policía, ambulancias, etc.
    
    console.log(`📞 Notificando servicios de emergencia para: ${emergency.id}`)
    
    // Ejemplo de integración:
    // - Llamar a API de bomberos si es tipo FIRE
    // - Llamar a API de ambulancias si es tipo MEDICAL
    // - Llamar a API de policía si es tipo CRIME
    // etc.
  }

  /**
   * Crea alertas en la base de datos para tracking
   */
  private async createEmergencyAlerts(emergency: any): Promise<void> {
    try {
      // Crear alertas según el tipo de emergencia
      const alertsToCreate: Array<{ service: string; method: string; target: string }> = []

      switch (emergency.emergencyType) {
        case 'FIRE':
          alertsToCreate.push({
            service: 'FIRE_DEPARTMENT',
            method: 'API',
            target: 'fire-department-api',
          })
          break
        case 'MEDICAL':
          alertsToCreate.push({
            service: 'AMBULANCE',
            method: 'API',
            target: 'ambulance-service-api',
          })
          break
        case 'CRIME':
          alertsToCreate.push({
            service: 'POLICE',
            method: 'API',
            target: 'police-api',
          })
          break
        case 'MOUNTAIN_RESCUE':
          alertsToCreate.push({
            service: 'MOUNTAIN_RESCUE',
            method: 'API',
            target: 'mountain-rescue-api',
          })
          break
        case 'WATER_RESCUE':
          alertsToCreate.push({
            service: 'COAST_GUARD',
            method: 'API',
            target: 'coast-guard-api',
          })
          break
        default:
          // Para otros tipos, crear alerta genérica
          alertsToCreate.push({
            service: 'GENERAL',
            method: 'API',
            target: 'general-emergency-api',
          })
      }

      // Crear alertas en la BD
      for (const alert of alertsToCreate) {
        await prisma.emergencyAlert.create({
          data: {
            emergencyId: emergency.id,
            service: alert.service as any,
            method: alert.method,
            target: alert.target,
            status: 'PENDING',
          },
        })
      }

      console.log(`✅ Alertas creadas para emergencia ${emergency.id}`)
    } catch (error: any) {
      console.error('❌ Error creando alertas:', error)
      // No lanzar error, es opcional
    }
  }

  /**
   * Detiene el servicio de escucha
   */
  stop(): void {
    if (this.listener) {
      this.listener.stop()
      this.listener = null
    }
    console.log('🛑 Servicio de emergencias blockchain detenido')
  }

  /**
   * Verifica si el servicio está activo
   */
  isActive(): boolean {
    return this.listener?.getIsListening() || false
  }
}

// Instancia singleton del servicio
let emergencyBlockchainServiceInstance: EmergencyBlockchainService | null = null

/**
 * Obtiene la instancia del servicio de emergencias blockchain
 */
export function getEmergencyBlockchainService(chain?: ChainName): EmergencyBlockchainService {
  if (!emergencyBlockchainServiceInstance) {
    emergencyBlockchainServiceInstance = new EmergencyBlockchainService(chain)
  }
  return emergencyBlockchainServiceInstance
}

