# 🔐 Credenciales de Lumo - Producción

**URL de Producción:** https://lumo.peranto.app  
**Fecha de Configuración:** 2025-12-01 04:50:35

---

## 📋 Resumen de Credenciales

### 🗄️ PostgreSQL Database

| Parámetro | Valor |
|-----------|-------|
| **Usuario** | `lumo` |
| **Contraseña** | `FSREeTg3iMNkT8A76kcJ09J8brnEZC2iG8/rdK9FBk8=` |
| **Base de Datos** | `lumo` |
| **Host (Docker)** | `postgres` |
| **Host (Local)** | `localhost` |
| **Puerto** | `5432` |
| **Connection String** | `postgresql://lumo:FSREeTg3iMNkT8A76kcJ09J8brnEZC2iG8/rdK9FBk8=@postgres:5432/lumo?schema=public` |

**Conexión desde terminal:**
```bash
psql -h postgres -U lumo -d lumo
# Contraseña: FSREeTg3iMNkT8A76kcJ09J8brnEZC2iG8/rdK9FBk8=
```

---

### 🔑 JWT (JSON Web Tokens)

| Parámetro | Valor |
|-----------|-------|
| **JWT Secret** | `lnI78Rg0vEbGi4t1q8+aEyLVkQIy4g0zIADFhshYM54+0/7bskXdxPgyWxp7TFJ5rhaH1te1zQC9Ad260/7aDw==` |
| **Access Token Expiración** | `7d` (7 días) |
| **Refresh Token Expiración** | `30d` (30 días) |

**⚠️ IMPORTANTE:** Este JWT_SECRET es único y seguro. No lo compartas ni lo expongas públicamente.

---

### 📦 MinIO Object Storage

| Parámetro | Valor |
|-----------|-------|
| **Usuario Root** | `lumoadmin` |
| **Contraseña Root** | `USM9iQNkSb8pEh+SnCcOvF9REvzQUXfBFfUaNV75tbM=` |
| **Endpoint (Docker)** | `minio` |
| **Endpoint (Local)** | `localhost` |
| **Puerto API** | `9000` |
| **Puerto Consola** | `9001` |
| **Bucket Name** | `lumo-documents` |
| **URL Pública** | `https://lumo.peranto.app/storage` |

**Acceso a Consola MinIO:**
- URL: `http://localhost:9001` (desarrollo) o `https://lumo.peranto.app:9001` (producción)
- Usuario: `lumoadmin`
- Contraseña: `USM9iQNkSb8pEh+SnCcOvF9REvzQUXfBFfUaNV75tbM=`

---

### 🌐 URLs de Producción

| Servicio | URL |
|----------|-----|
| **Frontend** | `https://lumo.peranto.app` |
| **API Backend** | `https://lumo.peranto.app/api` |
| **MinIO Storage** | `https://lumo.peranto.app/storage` |

---

### 🔔 VAPID Keys (Push Notifications)

| Parámetro | Valor |
|-----------|-------|
| **Public Key** | `BBmdVCyidHLgdjwpeQ1CQMBxMTWT-NOCAnRyNN2ZxdTK1BLB4ffJnWkklxj4baC3xgHesLhNFsaHj1ElG_r42QY` |
| **Private Key** | `ETFqjmzJWjTrrMt9yDFtPbriLiKxTYXYZC00LlqsedM` |

---

### 🗺️ Google Maps API

| Parámetro | Valor |
|-----------|-------|
| **API Key** | `AIzaSyCB7B6kCPP-60zX00Yo8s-ECe1XC_sJDuM` |

**APIs Habilitadas:**
- Maps JavaScript API
- Directions API
- Places API
- Geocoding API

---

## 📁 Ubicación de Archivos de Configuración

1. **`.env`** (Raíz del proyecto) - Configuración principal para Docker Compose
2. **`backend/.env`** - Configuración específica del backend
3. **`frontend/.env.local`** - Configuración específica del frontend

---

## 🚀 Comandos Útiles

### Verificar conexión a PostgreSQL
```bash
docker exec -it lumo-postgres psql -U lumo -d lumo
```

### Verificar conexión a MinIO
```bash
docker exec -it lumo-minio mc admin info local
```

### Ver logs de servicios
```bash
cd docker
docker compose logs -f
```

### Reiniciar servicios
```bash
cd docker
docker compose restart
```

---

## ⚠️ Seguridad

1. **NUNCA** subas estos archivos a repositorios públicos
2. **NUNCA** compartas estas credenciales por email o mensajes no seguros
3. **ROTA** las contraseñas periódicamente (cada 3-6 meses)
4. **MANTÉN** estos archivos con permisos restrictivos:
   ```bash
   chmod 600 .env backend/.env frontend/.env.local
   ```

---

## 📝 Notas Adicionales

- Todas las contraseñas fueron generadas usando `openssl rand -base64`
- El JWT_SECRET tiene 64 bytes de longitud para máxima seguridad
- Las contraseñas de base de datos y MinIO tienen 32 bytes de longitud
- El dominio de producción está configurado como `lumo.peranto.app`
- SSL/HTTPS está configurado mediante Let's Encrypt y Certbot

---

**Última actualización:** 2025-12-01 04:50:35

