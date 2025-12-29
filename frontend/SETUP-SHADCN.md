# Setup de shadcn/ui - Frontend

## 📋 Pasos para Configurar shadcn/ui

### 1. Instalar Dependencias Base

```bash
cd frontend
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
```

### 2. Inicializar Tailwind CSS

```bash
npx tailwindcss init -p
```

### 3. Configurar shadcn/ui

```bash
npx shadcn@latest init
```

Durante la inicialización, seleccionar:
- ✅ TypeScript
- ✅ Default style
- ✅ Base color: Slate
- ✅ CSS variables: Yes
- ✅ Tailwind config: tailwind.config.ts
- ✅ Components: src/components
- ✅ Utils: src/lib/utils.ts
- ✅ Global CSS: src/index.css
- ✅ CSS variables: src/index.css

### 4. Instalar Componentes Necesarios

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add form
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add toast
npx shadcn@latest add table
npx shadcn@latest add tabs
```

### 5. Configurar Variables de Entorno

Crear `.env` o `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

### 6. Estructura de Carpetas Recomendada

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # Componentes de shadcn/ui
│   │   ├── layout/       # Componentes de layout
│   │   ├── features/     # Componentes por feature
│   │   └── common/       # Componentes comunes
│   ├── lib/
│   │   ├── utils.ts      # Utilidades (cn, etc.)
│   │   ├── api.ts         # Cliente API
│   │   └── constants.ts   # Constantes
│   ├── hooks/             # Custom hooks
│   ├── stores/            # Estado global (Zustand/Jotai)
│   ├── types/             # Tipos TypeScript
│   ├── pages/             # Páginas/rutas
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
└── package.json
```

