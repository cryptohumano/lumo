# Guía de Configuración de Base de Datos

## 1. Instalar PostgreSQL

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### macOS
```bash
brew install postgresql
brew services start postgresql
```

### Verificar instalación
```bash
psql --version
```

## 2. Crear Base de Datos

### Opción A: Usando psql
```bash
# Iniciar sesión como usuario postgres
sudo -u postgres psql

# O si tienes acceso directo:
psql -U postgres

# Crear base de datos
CREATE DATABASE operations;

# Crear usuario (opcional, puedes usar postgres)
CREATE USER operations_user WITH PASSWORD 'tu_password_seguro';

# Dar permisos
GRANT ALL PRIVILEGES ON DATABASE operations TO operations_user;

# Salir
\q
```

### Opción B: Desde terminal
```bash
createdb operations
# O con usuario específico:
createdb -U postgres operations
```

## 3. Configurar Variables de Entorno

Copia `.env.example` a `.env` y edita con tus credenciales:

```bash
cd backend
cp .env.example .env
```

Edita `.env`:
```env
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/operations?schema=public"
# O si creaste un usuario específico:
DATABASE_URL="postgresql://operations_user:tu_password@localhost:5432/operations?schema=public"
```

## 4. Generar Cliente de Prisma

```bash
yarn prisma:generate
```

## 5. Ejecutar Migraciones

```bash
yarn prisma:migrate dev --name init
```

Esto creará todas las tablas en la base de datos.

## 6. (Opcional) Poblar con Datos de Ejemplo

```bash
yarn prisma:seed
```

Esto creará:
- Usuario administrador: `admin@edimburgo.cl` / `admin123`
- Usuario conductor: `conductor@edimburgo.cl` / `driver123`
- Número de WhatsApp de ejemplo

## 7. Verificar con Prisma Studio

```bash
yarn prisma:studio
```

Abre http://localhost:5555 en tu navegador para ver la base de datos.

## Solución de Problemas

### Error: "role postgres does not exist"
```bash
sudo -u postgres createuser -s postgres
```

### Error: "password authentication failed"
Verifica que el usuario y contraseña en `.env` sean correctos.

### Error: "database operations does not exist"
Ejecuta: `createdb operations`

### Verificar conexión
```bash
psql -U postgres -d operations -c "SELECT version();"
```





