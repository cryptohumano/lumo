/**
 * Seed script para Prisma
 * Crea datos iniciales para desarrollo
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Obtener email y contraseña desde variables de entorno
  const adminEmail = process.env.ROOT_ADMIN_EMAIL || (process.env.NODE_ENV === 'production' ? 'services@peranto.app' : 'admin@edimburgo.cl')
  const adminPassword = process.env.ROOT_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? 'changeme_secure_password_here' : 'admin123')
  
  if (!adminPassword || adminPassword === 'changeme_secure_password_here') {
    console.warn('⚠️  ADVERTENCIA: ROOT_ADMIN_PASSWORD no está configurada o usa el valor por defecto')
    console.warn('   Configura ROOT_ADMIN_PASSWORD en .env antes de desplegar a producción')
  }
  
  // Crear usuario administrador principal (root admin)
  const hashedPassword = await bcrypt.hash(adminPassword, 10)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      // Asegurar que siempre sea root admin
      isRootAdmin: true,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: process.env.ROOT_ADMIN_NAME || (process.env.NODE_ENV === 'production' ? 'Administrador Lumo' : 'Administrador Principal'),
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      isRootAdmin: true, // Marcar como administrador principal
      isEmailVerified: process.env.NODE_ENV === 'production', // En producción, asumir verificado
      preferredCurrency: 'CLP',
      country: 'CL',
      userRoles: {
        create: {
          role: 'ADMIN'
        }
      }
    },
  })
  console.log('✅ Usuario administrador principal creado:', admin.email)
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  IMPORTANTE: Cambia la contraseña del root admin después del primer inicio de sesión')
  }

  // Crear usuario conductor de ejemplo
  const driverPassword = await bcrypt.hash('driver123', 10)
  const driver = await prisma.user.upsert({
    where: { email: 'conductor@edimburgo.cl' },
    update: {},
    create: {
      email: 'conductor@edimburgo.cl',
      name: 'Conductor Ejemplo',
      phone: '+56912345678',
      password: driverPassword,
      role: 'DRIVER',
      isActive: true,
    },
  })
  console.log('✅ Usuario conductor creado:', driver.email)

  // Crear número de WhatsApp para el conductor
  try {
    const whatsappNumber = await prisma.whatsappNumber.upsert({
      where: { phoneNumber: '+56987654321' },
      update: {},
      create: {
        userId: driver.id,
        phoneNumber: '+56987654321',
        name: 'Número Principal',
        isActive: true,
        isPrimary: true,
        metadata: {
          provider: 'whatsapp_business_api',
          verified: true,
        },
      },
    })
    console.log('✅ Número de WhatsApp creado:', whatsappNumber.phoneNumber)
  } catch (error) {
    console.log('⚠️ No se pudo crear el número de WhatsApp (puede que el modelo no esté disponible):', error)
  }

  console.log('✨ Seed completado!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })





