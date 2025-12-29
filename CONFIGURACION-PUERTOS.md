# 🔌 Configuración de Puertos - Lumo Producción

## Puertos de Producción (diferentes a desarrollo)

Para evitar conflictos con el docker de desarrollo que ya está corriendo, los puertos de producción son diferentes:

| Servicio | Puerto Desarrollo | Puerto Producción | Variable ENV |
|----------|-------------------|-------------------|--------------|
| **PostgreSQL** | 5432 | **5433** | `POSTGRES_PORT=5433` |
| **MinIO API** | 9000 | **9010** | `MINIO_PORT=9010` |
| **MinIO Console** | 9001 | **9011** | `MINIO_CONSOLE_PORT=9011` |
| **Nginx HTTP** | - | **80** | (fijo, necesario para producción) |
| **Nginx HTTPS** | - | **443** | (fijo, necesario para producción) |
| **Backend** | 3000 | - | (solo interno, no expuesto) |
| **Frontend** | 5174 | - | (solo interno, no expuesto) |

## Servicios en Producción

Solo los servicios necesarios para Lumo están incluidos:

✅ **postgres** (lumo-postgres) - Base de datos PostgreSQL
✅ **backend** (lumo-backend) - API Backend
✅ **frontend** (lumo-frontend) - Aplicación Frontend
✅ **nginx** (lumo-nginx) - Reverse Proxy y SSL
✅ **certbot** (lumo-certbot) - Renovación de certificados SSL
✅ **minio** (lumo-minio) - Almacenamiento de objetos

❌ **website** - Solo en desarrollo, no en producción

## Conexión desde el Host

Si necesitas conectarte a los servicios desde el host:

```bash
# PostgreSQL
psql -h localhost -p 5433 -U lumo -d lumo

# MinIO Console (navegador)
http://localhost:9011
# Usuario: lumoadmin
# Contraseña: (ver .env)

# MinIO API
http://localhost:9010
```

## Variables de Entorno

Las variables están configuradas en `.env`:

```env
POSTGRES_PORT=5433
MINIO_PORT=9010
MINIO_CONSOLE_PORT=9011
```

## Verificar Puertos en Uso

Para verificar qué puertos están en uso:

```bash
# Ver puertos ocupados
sudo netstat -tulpn | grep LISTEN

# O con ss
sudo ss -tulpn | grep LISTEN
```
