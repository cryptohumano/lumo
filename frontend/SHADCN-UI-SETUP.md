# Configuración de shadcn/ui con Vite

## ✅ Configuración Completada según Documentación Oficial

El proyecto está configurado siguiendo la [documentación oficial de shadcn/ui para Vite](https://ui.shadcn.com/docs/installation/vite).

## 📋 Checklist de Configuración

### ✅ 1. Dependencias Instaladas

```json
{
  "dependencies": {
    "@tailwindcss/vite": "^4.1.17",
    "tailwindcss": "^4.1.17"
  },
  "devDependencies": {
    "@types/node": "^24.10.1"
  }
}
```

### ✅ 2. CSS Principal (`src/index.css`)

```css
@import "tailwindcss";

@layer base {
  :root {
    /* Variables CSS para shadcn/ui */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... más variables */
  }
  
  .dark {
    /* Variables para modo oscuro */
  }
}
```

### ✅ 3. TypeScript Config

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**`tsconfig.app.json`**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### ✅ 4. Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### ✅ 5. components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

## 🚀 Uso

### Agregar Componentes

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
```

### Importar Componentes

```typescript
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
```

## 📚 Referencias

- [Documentación oficial de shadcn/ui para Vite](https://ui.shadcn.com/docs/installation/vite)
- [Componentes disponibles](https://ui.shadcn.com/docs/components)
- [Theming](https://ui.shadcn.com/docs/theming)

