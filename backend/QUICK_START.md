# Inicio Rápido - Base de Datos

## Opción 1: Instalación Automática (Linux/macOS)

```bash
cd backend

# 1. Instalar PostgreSQL (si no está instalado)
yarn db:setup

# 2. Crear base de datos manualmente
createdb operations
# O con usuario específico:
createdb -U postgres operations

# 3. Configurar .env (ya está creado, solo verifica DATABASE_URL)
# Edita .env y ajusta DATABASE_URL si es necesario

# 4. Inicializar base de datos
yarn db:init
```

## Opción 2: Instalación Manual

### 1. Instalar PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

### 2. Crear Base de Datos

```bash
# Opción A: Usando createdb
createdb operations

# Opción B: Usando psql
sudo -u postgres psql
CREATE DATABASE operations;
\q
```

### 3. Configurar .env

El archivo `.env` ya está creado con valores por defecto. Ajusta `DATABASE_URL` si es necesario:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/operations?schema=public"
```

Si tu usuario/contraseña es diferente, cámbialo.

### 4. Inicializar Base de Datos

```bash
cd backend

# Generar cliente de Prisma
yarn prisma:generate

# Verificar conexión
yarn db:check

# Ejecutar migraciones
yarn prisma:migrate dev --name init

# (Opcional) Poblar con datos de ejemplo
yarn prisma:seed
```

## Verificar Instalación

```bash
# Ver la base de datos en Prisma Studio
yarn prisma:studio
```

Abre http://localhost:5555 en tu navegador.

## Datos de Ejemplo (si ejecutaste seed)

- **Admin**: `admin@edimburgo.cl` / `admin123`
- **Conductor**: `conductor@edimburgo.cl` / `driver123`

## Comandos Útiles

```bash
# Verificar conexión
yarn db:check

# Ver base de datos en Prisma Studio
yarn prisma:studio

# Crear nueva migración
yarn prisma:migrate dev --name nombre_migracion

# Resetear base de datos (CUIDADO: borra todos los datos)
yarn prisma:migrate reset

# Ver estado de migraciones
yarn prisma migrate status
```

## Solución de Problemas

### Error: "role postgres does not exist"
```bash
sudo -u postgres createuser -s postgres
```

### Error: "password authentication failed"
Verifica las credenciales en `.env`. Prueba conectarte manualmente:
```bash
psql -U postgres -d operations
```

### Error: "database operations does not exist"
```bash
createdb operations
```

### Verificar que PostgreSQL está corriendo
```bash
# Linux
sudo systemctl status postgresql

# macOS
brew services list | grep postgresql
```





