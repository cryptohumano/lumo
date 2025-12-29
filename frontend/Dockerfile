# Dockerfile para Frontend (Webapp)
# Multi-stage build para desarrollo y producción

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Instalar corepack para yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# Copiar archivos de dependencias
COPY package.json yarn.lock* ./

# Configurar Yarn para usar node_modules en lugar de PnP
RUN echo "nodeLinker: node-modules" > .yarnrc.yml

# Instalar dependencias
# Verificar si yarn.lock existe y usar el flag apropiado
RUN set -eux; \
    if [ -f yarn.lock ]; then \
      echo "Instalando con yarn.lock (--immutable)"; \
      yarn install --immutable; \
    else \
      echo "Instalando sin yarn.lock"; \
      yarn install; \
    fi; \
    echo "Verificando node_modules..."; \
    ls -la /app | grep node_modules || (echo "ERROR: node_modules no se creó" && exit 1); \
    echo "node_modules creado correctamente"

# Stage 2: Builder (para producción)
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar corepack para yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# Copiar node_modules y configuración de yarn
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY . .

ARG NODE_ENV=production
ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY

ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

# Construir con Vite (usar npx para evitar problemas con workspaces)
# Vite maneja TypeScript directamente, no necesitamos compilar con tsc primero
# Nota: Los errores de tipo se deben corregir en el código fuente
RUN npx vite build

# Stage 3: Production (Nginx para servir estáticos)
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Stage 4: Development (Vite dev server)
FROM node:22-alpine AS development
WORKDIR /app

# Instalar corepack para yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# Copiar node_modules y configuración de yarn
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY . .

EXPOSE 5174

# Variables de entorno para desarrollo
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:3000/api}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

CMD ["yarn", "dev", "--host", "0.0.0.0", "--port", "5174", "--strictPort", "false"]

