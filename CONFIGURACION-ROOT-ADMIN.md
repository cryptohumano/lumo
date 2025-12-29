# 🔐 Configuración del Root Admin

## Variables de Entorno

El root admin se configura mediante variables de entorno en `.env`:

```env
ROOT_ADMIN_EMAIL=services@peranto.app
ROOT_ADMIN_PASSWORD=tu_contraseña_super_segura_aqui
ROOT_ADMIN_NAME=Administrador Lumo
```

### Variables

- **ROOT_ADMIN_EMAIL** (requerida): Email del usuario root admin
  - Default en producción: `services@peranto.app`
  - Default en desarrollo: `admin@edimburgo.cl`

- **ROOT_ADMIN_PASSWORD** (requerida en producción): Contraseña del root admin
  - ⚠️ **OBLIGATORIA** en producción
  - Default en desarrollo: `admin123`

- **ROOT_ADMIN_NAME** (opcional): Nombre del root admin
  - Default: `Administrador Lumo` (producción) o `Administrador Principal` (desarrollo)

## Inicialización Automática

El root admin se crea **automáticamente** al iniciar la aplicación si:
- No existe ningún root admin en la base de datos
- Las variables de entorno están configuradas

### Comportamiento

1. **Al iniciar la aplicación**: Se verifica si existe un root admin
2. **Si no existe**: Se crea automáticamente usando las variables de entorno
3. **Si ya existe**: No se hace nada (no se modifica el existente)

## Creación Manual

Si prefieres crear el root admin manualmente:

### Opción 1: Script Interactivo

```bash
cd backend
npx tsx scripts/create-root-admin.ts
```

### Opción 2: Usando el Seed

```bash
cd backend
npx tsx prisma/seed.ts
```

### Opción 3: Desde Docker

```bash
# Ejecutar script interactivo
docker exec -it lumo-backend npx tsx scripts/create-root-admin.ts

# O ejecutar seed
docker exec -it lumo-backend npx tsx prisma/seed.ts
```

## Verificar Root Admin

Para verificar que el root admin existe:

```bash
# Desde Docker
docker exec -it lumo-postgres psql -U lumo -d lumo -c "SELECT email, name, role, \"isRootAdmin\" FROM \"User\" WHERE \"isRootAdmin\" = true;"

# O usando Prisma Studio
cd backend
npx prisma studio
```

## Seguridad

⚠️ **IMPORTANTE:**
1. Cambia `ROOT_ADMIN_PASSWORD` antes de desplegar a producción
2. Usa una contraseña fuerte y segura
3. Cambia la contraseña después del primer inicio de sesión
4. No compartas las credenciales del root admin
