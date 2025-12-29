# Configuración de Tailwind CSS 4 con Vite

## ✅ Configuración Completada

El proyecto está configurado para usar **Tailwind CSS 4.x** con el plugin oficial de Vite.

## 📦 Dependencias Instaladas

```json
{
  "dependencies": {
    "@tailwindcss/vite": "^4.1.17",
    "tailwindcss": "^4.1.17"
  }
}
```

## ⚙️ Configuración

### 1. Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Plugin de Tailwind CSS 4
  ],
  // ...
})
```

### 2. CSS Principal (`src/index.css`)

```css
@import "tailwindcss";

/* Variables CSS para shadcn/ui */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... más variables */
}
```

## 🔑 Cambios Principales en Tailwind CSS 4

1. **No se necesita `tailwind.config.ts`**: La configuración se hace principalmente en CSS usando `@theme`
2. **No se necesita PostCSS**: El plugin de Vite maneja todo automáticamente
3. **Sintaxis nueva**: Usar `@import "tailwindcss";` en lugar de `@tailwind` directives
4. **Configuración en CSS**: Usar `@theme` para personalizar el tema

## 📚 Documentación Oficial

- [Instalación con Vite](https://tailwindcss.com/docs/installation/using-vite)
- [Guía de Migración v4](https://tailwindcss.com/docs/upgrade-guide)
- [Configuración con @theme](https://tailwindcss.com/docs/theme-configuration)

## 🚀 Uso

El proyecto está listo para usar. Simplemente ejecuta:

```bash
npm run dev
```

Tailwind CSS 4 se cargará automáticamente a través del plugin de Vite.

