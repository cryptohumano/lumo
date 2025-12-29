# 🔐 Crear Usuario Root Admin

## Después del Despliegue

Una vez que el proyecto esté corriendo en producción, crea el usuario root admin con el siguiente comando:

### Opción 1: Script Interactivo (Recomendado)

```bash
cd backend
npx tsx scripts/create-root-admin.ts
```

El script te pedirá:
- Email (default: services@peranto.app)
- Contraseña (puedes dejar vacío para generar una aleatoria)
- Nombre (default: Administrador Lumo)

### Opción 2: Usando Prisma Studio

1. Accede a Prisma Studio:
```bash
cd backend
npx prisma studio
```

2. Abre http://localhost:5555
3. Ve a la tabla `User`
4. Crea un nuevo usuario con:
   - email: `services@peranto.app`
   - password: (hasheado con bcrypt)
   - role: `ADMIN`
   - isRootAdmin: `true`
   - isActive: `true`

### Opción 3: Usando el Seed (Solo Primera Vez)

Si es la primera vez que despliegas:

```bash
cd backend
NODE_ENV=production npx tsx prisma/seed.ts
```

Esto creará el usuario `services@peranto.app` con la contraseña definida en `ROOT_ADMIN_PASSWORD` o `changeme_secure_password_here` por defecto.

**⚠️ IMPORTANTE:** Cambia la contraseña después del primer inicio de sesión.

## Variables de Entorno

Puedes definir la contraseña del root admin en `.env`:

```env
ROOT_ADMIN_PASSWORD=tu_contraseña_super_segura_aqui
```

Luego ejecuta el seed:

```bash
NODE_ENV=production npx tsx prisma/seed.ts
```

## Verificar Usuario Root Admin

Para verificar que el usuario fue creado correctamente:

```bash
cd backend
npx prisma studio
```

O usando SQL:

```bash
docker exec -it lumo-postgres psql -U lumo -d lumo -c "SELECT email, name, role, \"isRootAdmin\" FROM \"User\" WHERE \"isRootAdmin\" = true;"
```
