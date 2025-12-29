/**
 * Script para crear o actualizar el usuario root admin
 * Uso: npx tsx scripts/create-root-admin.ts
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log('🔐 Crear/Actualizar Usuario Root Admin\n')

  const email = await question('Email del root admin (default: services@peranto.app): ') || 'services@peranto.app'
  const password = await question('Contraseña (dejar vacío para generar una aleatoria): ')
  
  let finalPassword = password
  if (!password) {
    // Generar contraseña aleatoria segura
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    finalPassword = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    console.log(`\n🔑 Contraseña generada: ${finalPassword}`)
    console.log('⚠️  GUARDA ESTA CONTRASEÑA EN UN LUGAR SEGURO\n')
  }

  const name = await question('Nombre (default: Administrador Lumo): ') || 'Administrador Lumo'

  const hashedPassword = await bcrypt.hash(finalPassword, 10)

  try {
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name,
        role: 'ADMIN',
        isRootAdmin: true,
        isActive: true,
        isEmailVerified: true,
      },
      create: {
        email,
        name,
        password: hashedPassword,
        role: 'ADMIN',
        isRootAdmin: true,
        isActive: true,
        isEmailVerified: true,
        preferredCurrency: 'CLP',
        country: 'CL',
        userRoles: {
          create: {
            role: 'ADMIN'
          }
        }
      },
    })

    console.log('\n✅ Usuario root admin creado/actualizado exitosamente!')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Nombre: ${admin.name}`)
    console.log(`   ID: ${admin.id}`)
    if (!password) {
      console.log(`   Contraseña: ${finalPassword}`)
    }
  } catch (error) {
    console.error('❌ Error al crear/actualizar usuario:', error)
    process.exit(1)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

main()



