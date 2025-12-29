import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss() as any, // Type assertion para evitar conflictos de tipos en monorepo
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'html5-qrcode'],
    exclude: [],
    force: true, // Forzar reoptimización en el próximo inicio
  },
  server: {
    port: 5174, // Puerto diferente a website (5173)
    host: '0.0.0.0', // Permitir acceso desde cualquier IP
    strictPort: false,
    hmr: {
      clientPort: 5174,
    },
    watch: {
      usePolling: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
