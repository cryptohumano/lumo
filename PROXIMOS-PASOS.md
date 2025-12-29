# 🚀 Próximos Pasos - Despliegue de Lumo

## ✅ Estado Actual

Los servicios de Docker están corriendo correctamente:
- ✅ PostgreSQL (puerto 5433)
- ✅ MinIO (puertos 9010, 9011) - Ahora healthy
- ✅ Backend (interno)
- ✅ Frontend (interno)
- ✅ Nginx (puertos 80, 443)
- ✅ Certbot

## 📋 Pasos Siguientes

### 1. Ejecutar Migraciones de Base de Datos

```bash
cd /home/edgar/lumo
docker exec -it lumo-backend npx prisma migrate deploy
```

Esto creará todas las tablas en la base de datos.

### 2. Verificar/Crear Root Admin

El root admin se creará automáticamente al iniciar el backend, pero puedes verificarlo o crearlo manualmente:

```bash
# Verificar si existe
docker exec -it lumo-backend npx prisma studio
# Abre http://localhost:5555 y verifica la tabla User

# O crear manualmente
docker exec -it lumo-backend npx tsx scripts/create-root-admin.ts
```

**Credenciales del Root Admin:**
- Email: `services@peranto.app`
- Contraseña: (definida en `ROOT_ADMIN_PASSWORD` del .env)

### 3. Configurar SSL/HTTPS (Let's Encrypt)

```bash
cd /home/edgar/lumo/docker

# Si tienes un script de inicialización de SSL
./init-letsencrypt.sh

# O manualmente con certbot
docker exec -it lumo-certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email edoga.salinas@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d lumo.peranto.app \
  -d www.lumo.peranto.app
```

### 4. Verificar que Nginx esté sirviendo correctamente

```bash
# Ver logs de nginx
docker logs lumo-nginx

# Ver logs del backend
docker logs lumo-backend

# Ver logs del frontend
docker logs lumo-frontend
```

### 5. Verificar Acceso

- Frontend: `https://lumo.peranto.app` (o `http://` si SSL no está configurado aún)
- API: `https://lumo.peranto.app/api`
- MinIO Console: `http://localhost:9011` (solo desde el host)

### 6. Limpiar Contenedores Huérfanos (Opcional)

Si quieres eliminar los contenedores huérfanos de "operations":

```bash
cd /home/edgar/lumo/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

⚠️ **CUIDADO**: Esto eliminará los contenedores operations-website, operations-ghost, operations-mysql si existen.

## 🔍 Comandos Útiles

```bash
# Ver estado de todos los servicios
docker ps | grep lumo

# Ver logs de un servicio
docker logs -f lumo-backend
docker logs -f lumo-frontend
docker logs -f lumo-nginx

# Reiniciar un servicio
docker restart lumo-backend

# Detener todos los servicios
cd /home/edgar/lumo/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Levantar servicios
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📝 Notas

- Los contenedores huérfanos de "operations" son solo advertencias y no afectan Lumo
- MinIO ahora está configurado correctamente con healthcheck usando `mc ready local`
- Todos los puertos están configurados para no conflictuar con desarrollo
