# Frontend - Operations Webapp

Frontend de la aplicación web Operations construido con Vite, React 19, TypeScript y shadcn/ui.

## 🚀 Tecnologías

- **Vite 7.2.4** - Build tool y dev server
- **React 19.2.0** - Framework UI
- **TypeScript 5.9** - Tipado estático
- **shadcn/ui** - Componentes UI
- **Tailwind CSS 4.1** - Estilos
- **React Router 6** - Routing

## 📋 Requisitos

- Node.js >= 22.12.0 (recomendado usar nvm)
- npm o yarn

## 🛠️ Instalación

### 1. Instalar nvm (si no está instalado)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Cargar nvm en la sesión actual
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 2. Instalar Node.js 22 LTS

```bash
# Instalar Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# Verificar versión
node --version  # Debe mostrar v22.x.x
```

**Nota importante**: Si tienes un error de `libatomic.so.1`, instala la librería:
```bash
sudo apt install -y libatomic1
```

### 3. Instalar dependencias

```bash
cd frontend
npm install
# o
yarn install
```

## 🎨 Configuración de shadcn/ui

shadcn/ui ya está configurado. Para agregar más componentes:

```bash
npx shadcn@latest add [component-name]
```

Componentes disponibles: https://ui.shadcn.com/docs/components

## 🚀 Desarrollo

```bash
npm run dev
# o
yarn dev
```

La aplicación estará disponible en `http://localhost:5174`

## 🏗️ Build

```bash
npm run build
# o
yarn build
```

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # Componentes de shadcn/ui
│   │   └── layout/      # Layout components
│   ├── pages/           # Páginas/rutas
│   │   ├── auth/        # Páginas de autenticación
│   │   └── Home.tsx
│   ├── lib/
│   │   └── utils.ts     # Utilidades (cn, etc.)
│   ├── hooks/           # Custom hooks
│   ├── types/           # Tipos TypeScript
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── components.json       # Configuración shadcn/ui
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

## 🔧 Variables de Entorno

Crear `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

## 🐳 Docker

El frontend está configurado para correr en Docker:

```bash
# Desarrollo
cd docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up frontend

# Producción
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d frontend
```

## 📝 Próximos Pasos

1. ✅ Configurar shadcn/ui
2. ✅ Crear estructura básica
3. ⏳ Integrar con backend API
4. ⏳ Implementar autenticación
5. ⏳ Crear páginas principales (Dashboard, Viajes, Experiencias)
6. ⏳ Integrar Google Maps
