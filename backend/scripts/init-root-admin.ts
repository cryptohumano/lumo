/**
 * Script de inicialización que crea el root admin al iniciar la aplicación
 * Se ejecuta automáticamente si no existe un root admin
 * 
 * Variables de entorno requeridas:
 * - ROOT_ADMIN_EMAIL: Email del root admin (default: services@peranto.app en producción)
 * - ROOT_ADMIN_PASSWORD: Contraseña del root admin (OBLIGATORIA en producción)
 * - ROOT_ADMIN_NAME: Nombre del root admin (opcional)
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function initRootAdmin() {
  try {
    // Verificar si ya existe un root admin
    const existingRootAdmin = await prisma.user.findFirst({
      where: { isRootAdmin: true }
    })

    if (existingRootAdmin) {
      console.log('✅ Root admin ya existe:', existingRootAdmin.email)
      return
    }

    // Obtener configuración desde variables de entorno
    const adminEmail = process.env.ROOT_ADMIN_EMAIL || 
      (process.env.NODE_ENV === 'production' ? 'services@peranto.app' : 'admin@edimburgo.cl')
    
    const adminPassword = process.env.ROOT_ADMIN_PASSWORD

    if (!adminPassword) {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ ERROR: ROOT_ADMIN_PASSWORD no está configurada')
        console.error('   Configura ROOT_ADMIN_PASSWORD en .env antes de iniciar la aplicación')
        process.exit(1)
      } else {
        console.warn('⚠️  ROOT_ADMIN_PASSWORD no configurada, usando contraseña por defecto (admin123)')
      }
    }

    const finalPassword = adminPassword || 'admin123'
    const adminName = process.env.ROOT_ADMIN_NAME || 
      (process.env.NODE_ENV === 'production' ? 'Administrador Lumo' : 'Administrador Principal')

    // Crear root admin
    const hashedPassword = await bcrypt.hash(finalPassword, 10)
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        isRootAdmin: true,
        isEmailVerified: process.env.NODE_ENV === 'production',
        preferredCurrency: 'CLP',
        country: 'CL',
        userRoles: {
          create: {
            role: 'ADMIN'
          }
        }
      }
    })

    console.log('✅ Root admin creado exitosamente:')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Nombre: ${admin.name}`)
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión')
    }
  } catch (error) {
    console.error('❌ Error al inicializar root admin:', error)
    // No salir con error para que la aplicación pueda iniciar
    // El admin puede crearse manualmente después
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  initRootAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { initRootAdmin }



