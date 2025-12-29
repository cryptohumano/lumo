/**
 * Script para verificar y corregir los roles de los usuarios
 * Asegura que todos los usuarios tengan sus roles correctamente asignados
 */

import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyUserRoles() {
  console.log('🔍 Verificando roles de usuarios...\n')

  try {
    // Obtener todos los usuarios con sus roles
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          select: {
            role: true
          }
        }
      },
      orderBy: {
        email: 'asc'
      }
    })

    console.log(`📊 Total de usuarios: ${users.length}\n`)

    let issuesFound = 0
    let fixed = 0

    for (const user of users) {
      const mainRole = user.role
      const additionalRoles = user.userRoles.map(ur => ur.role)
      const allRoles = [mainRole, ...additionalRoles]
      const uniqueRoles = Array.from(new Set(allRoles))

      // Verificar si hay duplicados
      if (allRoles.length !== uniqueRoles.length) {
        console.log(`⚠️  Usuario ${user.email}:`)
        console.log(`   - Rol principal: ${mainRole}`)
        console.log(`   - Roles adicionales: ${additionalRoles.join(', ') || 'ninguno'}`)
        console.log(`   - Problema: Rol duplicado detectado`)
        issuesFound++
      }

      // Verificar si el rol principal está en los adicionales (no debería)
      if (additionalRoles.includes(mainRole)) {
        console.log(`⚠️  Usuario ${user.email}:`)
        console.log(`   - Rol principal: ${mainRole}`)
        console.log(`   - Problema: El rol principal está también en los adicionales`)
        
        // Corregir: remover el rol principal de los adicionales
        await prisma.userRoleAssignment.deleteMany({
          where: {
            userId: user.id,
            role: mainRole
          }
        })
        console.log(`   ✅ Corregido: Removido ${mainRole} de roles adicionales`)
        fixed++
        issuesFound++
      }

      // Mostrar resumen para usuarios con múltiples roles
      if (uniqueRoles.length > 1) {
        console.log(`✅ Usuario ${user.email}:`)
        console.log(`   - Rol principal: ${mainRole}`)
        console.log(`   - Roles adicionales: ${additionalRoles.filter(r => r !== mainRole).join(', ') || 'ninguno'}`)
        console.log(`   - Total de roles: ${uniqueRoles.length}`)
        console.log('')
      }
    }

    console.log('\n📋 Resumen:')
    console.log(`   - Usuarios verificados: ${users.length}`)
    console.log(`   - Problemas encontrados: ${issuesFound}`)
    console.log(`   - Problemas corregidos: ${fixed}`)
    console.log(`   - Usuarios con múltiples roles: ${users.filter(u => {
      const allRoles = [u.role, ...u.userRoles.map(ur => ur.role)]
      return Array.from(new Set(allRoles)).length > 1
    }).length}`)

    if (issuesFound === 0) {
      console.log('\n✅ Todos los usuarios tienen sus roles correctamente asignados')
    } else {
      console.log(`\n⚠️  Se encontraron ${issuesFound} problema(s), ${fixed} corregido(s)`)
    }
  } catch (error) {
    console.error('❌ Error verificando roles:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifyUserRoles()

