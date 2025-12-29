// Script para aplicar la migración de perfiles de forma segura
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function applyMigration() {
  try {
    console.log('Aplicando migración de perfiles...')

    // 1. Agregar columna activeRole si no existe
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'activeRole'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "activeRole" "UserRole";
          CREATE INDEX IF NOT EXISTS "users_activeRole_idx" ON "users"("activeRole");
        END IF;
      END $$;
    `)
    console.log('✅ Columna activeRole agregada')

    // 2. Crear tabla user_profiles si no existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_profiles" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "role" "UserRole" NOT NULL,
          "displayName" TEXT,
          "bio" TEXT,
          "avatar" TEXT,
          "metadata" JSONB,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
      );
    `)
    console.log('✅ Tabla user_profiles creada')

    // 3. Agregar foreign key si no existe
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'user_profiles_userId_fkey'
        ) THEN
          ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `)
    console.log('✅ Foreign key agregada')

    // 4. Crear índices (uno por uno)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_profiles_userId_idx" ON "user_profiles"("userId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_profiles_role_idx" ON "user_profiles"("role");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_profiles_isActive_idx" ON "user_profiles"("isActive");`)
    console.log('✅ Índices creados')

    // 5. Crear unique constraint
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_userId_role_key" ON "user_profiles"("userId", "role");
    `)
    console.log('✅ Unique constraint creado')

    console.log('✅ Migración aplicada exitosamente')
  } catch (error) {
    console.error('❌ Error aplicando migración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

applyMigration()

