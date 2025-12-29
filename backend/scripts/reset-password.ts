/**
 * Script para resetear la contraseña de un usuario
 * Uso: yarn tsx scripts/reset-password.ts <email> <nueva-contraseña>
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'edoga.salinas@gmail.com'
  const newPassword = process.argv[3] || 'edoga123'
  
  if (!email || !newPassword) {
    console.error('❌ Uso: yarn tsx scripts/reset-password.ts <email> <nueva-contraseña>')
    process.exit(1)
  }
  
  console.log(`🔐 Reseteando contraseña para: ${email}`)
  
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    })
    
    console.log(`✅ Contraseña actualizada exitosamente`)
    console.log(`📧 Email: ${user.email}`)
    console.log(`👤 Nombre: ${user.name}`)
    console.log(`🔑 Nueva contraseña: ${newPassword}`)
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error(`❌ Usuario con email ${email} no encontrado`)
    } else {
      console.error('❌ Error al actualizar contraseña:', error.message)
    }
    process.exit(1)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())


