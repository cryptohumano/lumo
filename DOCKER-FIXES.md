# 🔧 Correcciones Aplicadas a Docker

## Problemas Identificados y Solucionados

### 1. Error: `--frozen-lockfile` deprecado en Yarn 4.12.0
**Problema:** Yarn 4.12.0 deprecó `--frozen-lockfile` y requiere `--immutable`

**Solución:**
- ✅ Reemplazado `--frozen-lockfile` por `--immutable` en ambos Dockerfiles
- ✅ Agregada lógica condicional para manejar ausencia de `yarn.lock`

### 2. Error: Atributo `version` obsoleto en docker-compose
**Problema:** Docker Compose v2 no requiere el atributo `version`

**Solución:**
- ✅ Eliminado `version: '3.8'` de `docker-compose.prod.yml`

### 3. Error: `node_modules` no encontrado en stage deps
**Problema:** El stage `deps` del frontend no estaba generando `node_modules` correctamente

**Solución:**
- ✅ Agregada verificación explícita de `node_modules` después de `yarn install`
- ✅ Mejorado manejo de errores con `set -eux`
- ✅ Agregados mensajes de debug para diagnóstico

### 4. Configuración de puertos incorrecta
**Problema:** Frontend en producción estaba configurado para puerto 5174 (dev server) en lugar de 80 (nginx)

**Solución:**
- ✅ Actualizado `docker-compose.yml` para exponer puerto 80
- ✅ Actualizado `nginx/conf.d/lumo.conf` para usar puerto 80 del frontend

### 5. Falta de corepack en backend
**Problema:** El Dockerfile del backend no tenía `corepack enable`

**Solución:**
- ✅ Agregado `corepack enable` al Dockerfile del backend

## Archivos Modificados

1. `backend/Dockerfile`
   - Agregado `corepack enable`
   - Reemplazado `--frozen-lockfile` por `--immutable`
   - Agregada lógica condicional para `yarn.lock`

2. `frontend/Dockerfile`
   - Reemplazado `--frozen-lockfile` por `--immutable`
   - Agregada verificación de `node_modules`
   - Mejorado manejo de errores

3. `docker/docker-compose.yml`
   - Frontend expone puerto 80 en lugar de 5174

4. `docker/docker-compose.prod.yml`
   - Eliminado atributo `version` obsoleto

5. `docker/nginx/conf.d/lumo.conf`
   - Frontend configurado para usar puerto 80 (nginx interno)

## Comandos para Construir

### Limpiar cache y construir desde cero:
```bash
cd /home/edgar/lumo/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
```

### Construir normalmente:
```bash
cd /home/edgar/lumo/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

### Construir y levantar servicios:
```bash
cd /home/edgar/lumo/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Notas Importantes

- Si el build falla, intenta limpiar el cache con `--no-cache`
- El frontend en producción usa nginx interno (puerto 80)
- El frontend en desarrollo usa Vite dev server (puerto 5174)
- Todos los Dockerfiles ahora son compatibles con Yarn 4.12.0+
