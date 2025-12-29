-- CreateTable: Crear tabla para roles múltiples
CREATE TABLE IF NOT EXISTS "user_role_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS "user_role_assignments_userId_idx" ON "user_role_assignments"("userId");
CREATE INDEX IF NOT EXISTS "user_role_assignments_role_idx" ON "user_role_assignments"("role");

-- AddForeignKey: Relación con tabla users
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UniqueConstraint: Un usuario no puede tener el mismo rol duplicado
CREATE UNIQUE INDEX IF NOT EXISTS "user_role_assignments_userId_role_key" ON "user_role_assignments"("userId", "role");

-- Migración de datos: Copiar el rol actual de cada usuario a la nueva tabla
-- Esto preserva todos los datos existentes
INSERT INTO "user_role_assignments" ("id", "userId", "role", "createdAt")
SELECT 
    gen_random_uuid()::text as "id",
    "id" as "userId",
    "role" as "role",
    "createdAt" as "createdAt"
FROM "users"
WHERE "role" IS NOT NULL
ON CONFLICT ("userId", "role") DO NOTHING;
